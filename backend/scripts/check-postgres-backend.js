// Only the companion launcher supplies this ephemeral cluster. Never load .env.
const assert = require("node:assert/strict");
const { createDatabase } = require("../src/config/db");
const {
  createPostgresOperations,
} = require("../src/config/postgres-operations");
const { preparePostgresAuth } = require("../src/db/prepare-postgres-auth");
const { createAuthService } = require("../src/services/auth.service");
const {
  createMaintenanceService,
} = require("../src/services/maintenance.service");
const { createApp } = require("../src/app");
const { maintenanceScenarios } = require("./lib/maintenance-scenarios");
const {
  postgresLoginLimit,
} = require("../src/middlewares/postgres-login-limit");
const fs = require("node:fs/promises");
const path = require("node:path");

async function main() {
  const port = Number(process.argv[3]);
  assert.equal(process.argv[2], "--temporary-cluster");
  assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535);
  const config = {
    databaseEnabled: true,
    databaseDriver: "postgres",
    databaseUrl: `postgresql://climatic_translation_test@127.0.0.1:${port}/postgres`,
    pinSecret: "isolated-postgres-test-secret-not-for-production",
    sessionHours: 8,
    origin: "http://localhost:4200",
    serviceMarginPercent: 10,
  };
  let pg = createDatabase(config),
    server;
  try {
    const before = (await pg.query("SELECT id,horas FROM maquinas ORDER BY id"))
      .rows;
    // A bad PIN must roll back all schema changes, including the migration marker.
    const invalid = (
      await pg.query(
        "INSERT INTO empleados(nombre,pin,grupo) VALUES ('Invalid migration fixture','abcd','Direccion') RETURNING id",
      )
    ).rows[0];
    await assert.rejects(preparePostgresAuth(pg, config), /PIN no num/);
    assert.equal(
      (
        await pg.query(
          "SELECT to_regclass('public.climatic_migrations') AS migration",
        )
      ).rows[0].migration,
      null,
    );
    await pg.query("DELETE FROM empleados WHERE id=$1", [invalid.id]);
    const employee = (
      await pg.query(
        "INSERT INTO empleados(nombre,pin,grupo) VALUES ('Isolated login fixture','0007','Direccion') RETURNING id",
      )
    ).rows[0];
    const migrated = await preparePostgresAuth(pg, config);
    assert.equal(migrated.migrated, 6);
    assert.equal((await preparePostgresAuth(pg, config)).alreadyApplied, true);
    await assert.rejects(
      preparePostgresAuth(pg, {
        ...config,
        pinSecret: "a-different-isolated-test-secret-value",
      }),
      /difiere/,
    );
    assert.equal(
      (
        await pg.query(
          "SELECT count(*) AS n FROM information_schema.columns WHERE table_schema='public' AND table_name='empleados' AND column_name='pin'",
        )
      ).rows[0].n,
      0,
    );
    assert.deepEqual(
      (await pg.query("SELECT id,horas FROM maquinas ORDER BY id")).rows,
      before,
    );
    for (const role of ["anon", "authenticated"]) {
      for (const table of ["sesiones", "climatic_migrations"])
        assert.equal(
          (
            await pg.query(
              "SELECT has_table_privilege($1,$2,'SELECT') AS allowed",
              [role, `public.${table}`],
            )
          ).rows[0].allowed,
          false,
        );
    }
    const auth = createAuthService(pg, config);
    await pg.query(
      await fs.readFile(
        path.join(__dirname, "../src/db/prepare-deployment.sql"),
        "utf8",
      ),
    );
    const limiters = [
      postgresLoginLimit(pg, config),
      postgresLoginLimit(pg, config),
    ];
    let accepted = 0,
      rejected = 0;
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        limiters[i % 2](
          { ip: "192.0.2.10", headers: {} },
          {
            set() {},
            status(code) {
              assert.equal(code, 429);
              return this;
            },
            json() {
              rejected++;
            },
          },
          () => accepted++,
        ),
      ),
    );
    assert.equal(accepted, 10);
    assert.equal(rejected, 10);
    await pg.query(
      "UPDATE login_attempts SET expires_at=now()-interval '1 second'",
    );
    await limiters[0](
      { ip: "192.0.2.10", headers: {} },
      {
        set() {},
        status() {
          assert.fail("Expired limit must reset");
        },
      },
      () => accepted++,
    );
    assert.equal(accepted, 11);
    console.log(
      "Shared login limit: concurrent requests across instances and expiry passed.",
    );
    await assert.rejects(auth.login("7"), { status: 401 });
    const session = await auth.login("0007");
    assert.equal(session.user.id, employee.id);
    assert.equal(typeof session.user.id, "number");
    await pg.close();
    pg = createDatabase(config);
    const restartedAuth = createAuthService(pg, config);
    assert.equal(
      (await restartedAuth.authenticate(session.token, session.csrf, true)).id,
      employee.id,
    );
    await assert.rejects(
      restartedAuth.authenticate(session.token, "bad", true),
      { status: 403 },
    );
    console.log(
      "Auth migration: atomic rollback, leading zeroes, idempotence, secret check, private tables and persistent sessions passed.",
    );

    const operations = createPostgresOperations(pg);
    let failing = false,
      inserts = 0;
    function instrument(connection) {
      return {
        ...connection,
        async query(sql, params) {
          if (
            failing &&
            sql.startsWith("INSERT INTO registro_tareas_repuestos") &&
            ++inserts === 2
          )
            throw new Error("Injected second-consumption failure");
          return connection.query(sql, params);
        },
      };
    }
    const db = {
      ...instrument(operations),
      transaction(work) {
        return operations.transaction((tx) => work(instrument(tx)));
      },
    };
    server = createApp({
      config,
      auth: restartedAuth,
      maintenance: createMaintenanceService(db, config),
    }).listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const headers = {
      "Content-Type": "application/json",
      Cookie: `climatic_session=${session.token}`,
      "X-CSRF-Token": session.csrf,
    };
    async function request(path, method = "GET", body, expected = 200) {
      const response = await fetch(base + path, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const result = response.status === 204 ? null : await response.json();
      assert.equal(
        response.status,
        expected,
        `${method} ${path}: ${JSON.stringify(result)}`,
      );
      return result;
    }
    await maintenanceScenarios({
      request,
      db,
      employee,
      setFailure(value) {
        failing = value;
        inserts = 0;
      },
    });
    const history = await request("/registros");
    assert.ok(
      history.some((row) => row.duracion_inicio === "2026-10-14 08:00:00"),
    );
    await request("/auth/logout", "POST", {}, 204);
    await request("/maquinas", "GET", undefined, 401);
    const response = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "0007" }),
    });
    assert.equal(response.status, 200);
    assert.ok(
      response.headers
        .getSetCookie()
        .some(
          (cookie) =>
            cookie.startsWith("climatic_session=") &&
            cookie.includes("HttpOnly"),
        ),
    );
    console.log(
      "PostgreSQL HTTP maintenance and real PIN login verified; test cluster will be removed.",
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pg.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
