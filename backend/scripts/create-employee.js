const readline = require("node:readline/promises");
const { Writable } = require("node:stream");
const { localDatabase } = require("./local-database");
const { supabaseDatabase } = require("./supabase-database");
const { hashPin, pinLookup, validPin } = require("../src/services/pin.service");
const { MODULES_BY_ROLE } = require("../src/config/permissions");

async function main() {
  const { db, config } = process.argv.includes("--supabase")
    ? supabaseDatabase()
    : localDatabase();
  let hidden = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!hidden) process.stdout.write(chunk);
      callback();
    },
  });
  const prompt = readline.createInterface({
    input: process.stdin,
    output,
    terminal: Boolean(process.stdin.isTTY),
  });
  try {
    const nombre = (await prompt.question("Nombre: ")).trim();
    const apellido =
      (await prompt.question("Apellido (opcional): ")).trim() || null;
    const email = (await prompt.question("Email (opcional): ")).trim() || null;
    const grupo = (
      await prompt.question(
        "Grupo (Direccion/Administracion/Mantenimiento/Produccion): ",
      )
    ).trim();
    process.stdout.write("PIN único (oculto): ");
    hidden = true;
    const pin = await prompt.question("");
    hidden = false;
    process.stdout.write("\n");
    if (!nombre || !Object.hasOwn(MODULES_BY_ROLE, grupo) || !validPin(pin))
      throw new Error("Datos inválidos");
    await db.query(
      "INSERT INTO empleados (nombre, apellido, email, grupo, pin_hash, pin_lookup) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        nombre,
        apellido,
        email,
        grupo,
        await hashPin(pin),
        pinLookup(pin, config.pinSecret),
      ],
    );
    console.log("Empleado creado en la base configurada.");
  } finally {
    prompt.close();
    await db.close();
  }
}
main().catch((error) => {
  console.error(
    error.code === "23505"
      ? "Ese PIN ya está asignado. Elegí otro."
      : "No se pudo crear el empleado. Revisá los datos, la configuración y la migración de autenticación.",
  );
  process.exitCode = 1;
});
