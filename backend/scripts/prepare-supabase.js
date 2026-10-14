const {
  supabaseDatabase,
  reportConnectionError,
} = require("./supabase-database");
const { preparePostgresAuth } = require("../src/db/prepare-postgres-auth");
async function main() {
  const { config, db } = supabaseDatabase();
  try {
    console.log(
      "Preparando autenticación: convertir PIN a hashes y crear sesiones, en una única transacción.",
    );
    const result = await preparePostgresAuth(db, config);
    console.log(
      result.alreadyApplied
        ? "La migración ya estaba aplicada; secreto verificado."
        : `Autenticación preparada para ${result.migrated} empleados. Los PIN de ingreso se conservan.`,
    );
  } finally {
    await db.close();
  }
}
main().catch(reportConnectionError);
