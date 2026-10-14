const {
  supabaseDatabase,
  reportConnectionError,
} = require("./supabase-database");
const { pinLookup } = require("../src/services/pin.service");
async function main() {
  const { config, db } = supabaseDatabase();
  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN READ ONLY");
    const { rows } = await client.query(`SELECT
      (SELECT count(*) FROM public.empleados) AS empleados,
      (SELECT count(*) FROM public.maquinas) AS maquinas,
      (SELECT count(*) FROM public.repuestos) AS repuestos,
      (SELECT count(*) FROM public.proximos_servicios) AS planes`);
    console.log(
      "Conexión TLS y esquema de mantenimiento verificados:",
      rows[0],
    );
    const { rows: migration } = await client.query(
      "SELECT to_regclass('public.climatic_migrations') IS NOT NULL AS ready",
    );
    if (migration[0].ready) {
      const { rows: applied } = await client.query(
        "SELECT secret_check FROM public.climatic_migrations WHERE version='translated-schema-auth-v1'",
      );
      if (
        !applied.length ||
        applied[0].secret_check !==
          pinLookup("climatic-auth-migration-v1", config.pinSecret)
      )
        throw new Error(
          "Restaurá APP_PIN_SECRET original o prepará la autenticación.",
        );
      await client.query(
        "SELECT pin_hash,pin_lookup FROM public.empleados LIMIT 0",
      );
      await client.query(
        "SELECT token_hash,csrf_hash FROM public.sesiones LIMIT 0",
      );
      console.log("Autenticación preparada y APP_PIN_SECRET verificado.");
    } else
      console.log(
        "Falta ejecutar npm run db:prepare-supabase para habilitar el login.",
      );
    await client.query("COMMIT");
  } finally {
    if (client) {
      await client.query("ROLLBACK");
      client.release();
    }
    await db.close();
  }
}
main().catch(reportConnectionError);
