// Opt-in live deployment check using a temporary, synthetic maintenance employee.
// Does not read anyone's PIN or change maintenance data. Always removes its account.
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { supabaseDatabase } = require("./supabase-database");
const { hashPin, pinLookup } = require("../src/services/pin.service");

async function main() {
  if (!process.argv.includes("--temporary-employee"))
    throw Error("Requires --temporary-employee");
  const origin = "https://climatic-srl-frontend.vercel.app";
  const { db, config } = supabaseDatabase();
  const nonce = randomBytes(16).toString("hex");
  const name = `__deployment_check_${nonce}`;
  const pin = BigInt(`0x${randomBytes(16).toString("hex")}`).toString();
  const lookup = pinLookup(pin, config.pinSecret);
  try {
    const { rows } = await db.query(
      "INSERT INTO public.empleados(nombre,grupo,pin_hash,pin_lookup) VALUES ($1,'Mantenimiento',$2,$3) RETURNING id",
      [name, await hashPin(pin), lookup],
    );
    const employeeId = rows[0].id;
    const response = await fetch(origin + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ pin }),
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(response.status, 200, "Live login through frontend proxy");
    assert.equal((await response.json()).id, employeeId);
    const cookies = response.headers.getSetCookie();
    const sessionCookie = cookies.find((cookie) =>
      cookie.startsWith("climatic_session="),
    );
    assert.ok(
      sessionCookie?.includes("HttpOnly") &&
        sessionCookie.includes("Secure") &&
        sessionCookie.includes("SameSite=Strict"),
    );
    const cookie = cookies.map((value) => value.split(";")[0]).join("; ");
    const csrf = cookies
      .find((value) => value.startsWith("XSRF-TOKEN="))
      .split(";")[0]
      .slice("XSRF-TOKEN=".length);
    async function request(
      path,
      method = "GET",
      expected = 200,
      csrfValue = csrf,
    ) {
      const result = await fetch(origin + path, {
        method,
        headers: { Cookie: cookie, Origin: origin, "X-CSRF-Token": csrfValue },
        signal: AbortSignal.timeout(30000),
      });
      assert.equal(result.status, expected, `Live ${method} ${path}`);
      assert.match(result.headers.get("cache-control") || "", /no-store/);
      return result;
    }
    await request("/api/auth/me");
    for (const route of [
      "maquinas",
      "repuestos",
      "inventario",
      "tareas",
      "tareas-extraordinarias",
      "planes/preventivos",
      "planes/predictivos",
      "ordenes-mantenimiento",
      "registros",
    ])
      await request(`/api/${route}`);
    await request("/api/auth/logout", "POST", 403, "invalid");
    await request("/api/auth/logout", "POST", 204);
    await request("/api/auth/me", "GET", 401);
    console.log(
      "Live deployment: PIN login, secure cookies, session, CSRF, logout and maintenance reads passed.",
    );
  } finally {
    // Delete only our unique fixture and its sessions; no business writes occurred.
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "DELETE FROM public.sesiones WHERE empleado_id IN (SELECT id FROM public.empleados WHERE nombre=$1 AND pin_lookup=$2)",
        [name, lookup],
      );
      await client.query(
        "DELETE FROM public.empleados WHERE nombre=$1 AND pin_lookup=$2",
        [name, lookup],
      );
      await client.query("COMMIT");
      console.log("Temporary deployment employee and sessions removed.");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
      await db.close();
    }
  }
}
main().catch((error) => {
  console.error(
    "Deployment check failed:",
    error.code === "ERR_ASSERTION"
      ? error.message
      : "connection or cleanup error",
  );
  process.exitCode = 1;
});
