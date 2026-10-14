// Runs only against the fresh temporary cluster created by the PowerShell companion.
// Does not load .env, .env.local or connect to an existing application database.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Client } = require("pg");

async function main() {
  const port = Number(process.argv[3]);
  assert.equal(process.argv[2], "--temporary-cluster");
  assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535);
  const config = {
    host: "127.0.0.1",
    port,
    user: "climatic_translation_test",
    database: "postgres",
    connectionTimeoutMillis: 5000,
  };
  const db = new Client(config);
  await db.connect();
  const scalar = async (sql, params) =>
    Object.values((await db.query(sql, params)).rows[0])[0];
  const sqlFile = (name) =>
    fs.readFile(path.join(__dirname, "../sql/postgresql", name), "utf8");
  async function rejected(sql, params, code) {
    await db.query("SAVEPOINT rejected_operation");
    const codes = Array.isArray(code) ? code : [code];
    await assert.rejects(db.query(sql, params), (error) => {
      assert.ok(
        codes.includes(error.code),
        `Expected SQLSTATE ${codes.join("/")} but got ${error.code}`,
      );
      return true;
    });
    await db.query("ROLLBACK TO SAVEPOINT rejected_operation");
  }
  try {
    assert.equal(
      await scalar("SELECT count(*) FROM pg_tables WHERE schemaname='public'"),
      "0",
    );
    // Simulate Supabase grants: the install must remove API-role access to its objects.
    await db.query(
      "CREATE ROLE anon; CREATE ROLE authenticated; GRANT USAGE ON SCHEMA public TO anon, authenticated; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;",
    );
    await db.query(await sqlFile("01-esquema.sql"));
    assert.equal(
      await scalar("SELECT count(*) FROM pg_tables WHERE schemaname='public'"),
      "13",
    );
    assert.equal(
      await scalar("SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal"),
      "7",
    );
    await db.query(await sqlFile("02-datos-prueba.sql"));
    await db.query(await sqlFile("03-verificar.sql"));
    assert.deepEqual(
      (
        await db.query(
          "SELECT cantidad_actual FROM inventario ORDER BY repuesto_id",
        )
      ).rows.map((r) => Number(r.cantidad_actual)),
      [20, 9, 30, 9, 8],
    );
    assert.deepEqual(
      (await db.query("SELECT horas FROM maquinas ORDER BY id")).rows.map((r) =>
        Number(r.horas),
      ),
      [1300, 840, 2250],
    );
    assert.deepEqual(
      (
        await db.query(
          "SELECT proximo_servicio FROM proximos_servicios ORDER BY plan_key",
        )
      ).rows.map((r) => Number(r.proximo_servicio)),
      [1800, 3250, 1090],
    );
    assert.equal(
      await scalar(
        "SELECT length(pin)=4 AND left(pin,1)='0' FROM empleados WHERE id=3",
      ),
      true,
    );
    console.log(
      "Schema, seed, leading-zero PIN, stock, meter and plan view: passed.",
    );

    // Non-idempotent installation/seed must fail safely instead of replacing data.
    await assert.rejects(
      db.query(await sqlFile("01-esquema.sql")),
      (e) => e.code === "42P07",
    );
    await db.query("ROLLBACK");
    await assert.rejects(
      db.query(await sqlFile("02-datos-prueba.sql")),
      (e) => e.code === "P0001",
    );
    await db.query("ROLLBACK");
    assert.equal(await scalar("SELECT count(*) FROM empleados"), "5");
    for (const role of ["anon", "authenticated"]) {
      await db.query("BEGIN");
      await db.query("SET LOCAL ROLE " + role);
      await assert.rejects(
        db.query("SELECT * FROM empleados"),
        (e) => e.code === "42501",
      );
      await db.query("ROLLBACK");
      await db.query("BEGIN");
      await db.query("SET LOCAL ROLE " + role);
      await assert.rejects(
        db.query("SELECT * FROM proximos_servicios"),
        (e) => e.code === "42501",
      );
      await db.query("ROLLBACK");
    }
    assert.equal(
      await scalar(
        "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relrowsecurity",
      ),
      "13",
    );
    console.log(
      "Repeat-install protection and Supabase API-role restrictions: passed.",
    );

    await db.query("BEGIN");
    await db.query("UPDATE maquinas SET status='No Activo' WHERE id=1");
    assert.equal(
      await scalar("SELECT fecha_baja IS NOT NULL FROM maquinas WHERE id=1"),
      true,
    );
    await db.query("UPDATE maquinas SET status='Activo' WHERE id=1");
    assert.equal(
      await scalar("SELECT fecha_baja IS NULL FROM maquinas WHERE id=1"),
      true,
    );
    await db.query("UPDATE ordenes_mantenimiento SET activo=FALSE WHERE id=1");
    assert.equal(
      await scalar(
        "SELECT fecha_cierre IS NOT NULL FROM ordenes_mantenimiento WHERE id=1",
      ),
      true,
    );
    await db.query("UPDATE ordenes_mantenimiento SET activo=TRUE WHERE id=1");
    assert.equal(
      await scalar(
        "SELECT fecha_cierre IS NULL FROM ordenes_mantenimiento WHERE id=1",
      ),
      true,
    );
    await db.query(
      "UPDATE registro_tareas SET medicion_horometro=1310 WHERE id=4",
    );
    assert.equal(
      Number(await scalar("SELECT horas FROM maquinas WHERE id=1")),
      1310,
    );
    await db.query(
      "UPDATE registro_tareas SET medicion_horometro=NULL WHERE id=4",
    );
    assert.equal(
      Number(await scalar("SELECT horas FROM maquinas WHERE id=1")),
      1310,
    );
    await db.query(
      "UPDATE registro_tareas SET medicion_horometro=1320 WHERE id=4",
    );
    assert.equal(
      Number(await scalar("SELECT horas FROM maquinas WHERE id=1")),
      1320,
    );
    // Updating other fields with the same reading must not overwrite a newer manual reading.
    await db.query("UPDATE maquinas SET horas=1400 WHERE id=1");
    await db.query(
      "UPDATE registro_tareas SET duracion_inicio=duracion_inicio WHERE id=4",
    );
    assert.equal(
      Number(await scalar("SELECT horas FROM maquinas WHERE id=1")),
      1400,
    );
    await db.query("ROLLBACK");
    console.log(
      "Machine/order transitions and null-safe meter updates: passed.",
    );

    await db.query("BEGIN");
    const record = await scalar(
      "INSERT INTO registro_tareas(operario_id,tarea_id,medicion_horometro) VALUES (3,1,1500) RETURNING id",
    );
    assert.equal(record, "5");
    await rejected(
      "INSERT INTO registro_tareas_repuestos(registro_tarea_id,repuesto_id,cantidad) VALUES ($1,3,1)",
      [record],
      "P0001",
    );
    await rejected(
      "INSERT INTO registro_tareas_repuestos(registro_tarea_id,repuesto_id,cantidad) VALUES ($1,2,100)",
      [record],
      "P0001",
    );
    await rejected(
      "INSERT INTO registro_tareas_repuestos(registro_tarea_id,repuesto_id,cantidad) VALUES ($1,2,0)",
      [record],
      "23514",
    );
    await rejected(
      "UPDATE tareas SET corte_tension='Otro' WHERE id=1",
      [],
      "23514",
    );
    await rejected("DELETE FROM tareas WHERE id=1", [], ["23503", "23001"]);
    await rejected(
      "INSERT INTO plan_preventivo(tarea_id,frecuencia) VALUES(1,100)",
      [],
      "23505",
    );
    await rejected(
      "INSERT INTO registro_tareas(operario_id,tarea_id,duracion_inicio,duracion_fin) VALUES(3,1,'2026-10-14 10:00','2026-10-14 09:00')",
      [],
      "23514",
    );
    const newPart = await scalar(
      "INSERT INTO repuestos(maquina_id,nombre) VALUES(1,'Temporary no inventory') RETURNING id",
    );
    assert.equal(newPart, "6");
    await rejected(
      "INSERT INTO registro_tareas_repuestos(registro_tarea_id,repuesto_id,cantidad) VALUES ($1,$2,1)",
      [record, newPart],
      "P0001",
    );
    const detail = await scalar(
      "INSERT INTO registro_tareas_repuestos(registro_tarea_id,repuesto_id,cantidad) VALUES ($1,2,2) RETURNING id",
      [record],
    );
    assert.equal(
      Number(
        await scalar(
          "SELECT cantidad_actual FROM inventario WHERE repuesto_id=2",
        ),
      ),
      7,
    );
    await db.query("DELETE FROM registro_tareas_repuestos WHERE id=$1", [
      detail,
    ]);
    assert.equal(
      Number(
        await scalar(
          "SELECT cantidad_actual FROM inventario WHERE repuesto_id=2",
        ),
      ),
      9,
    );
    await db.query(
      "INSERT INTO registro_tareas_repuestos(registro_tarea_id,repuesto_id,cantidad) VALUES ($1,2,2)",
      [record],
    );
    await db.query("DELETE FROM registro_tareas WHERE id=$1", [record]);
    assert.equal(
      Number(
        await scalar(
          "SELECT cantidad_actual FROM inventario WHERE repuesto_id=2",
        ),
      ),
      7,
    );
    assert.equal(
      await scalar(
        "SELECT count(*) FROM registro_tareas_repuestos WHERE registro_tarea_id=$1",
        [record],
      ),
      "0",
    );
    await db.query("ROLLBACK");
    console.log(
      "FKs, checks, identity sequences, compatibility, stock and direct/cascade deletion: passed.",
    );

    await db.query("BEGIN");
    const rollbackRecord = await scalar(
      "INSERT INTO registro_tareas(operario_id,tarea_id,medicion_horometro) VALUES (3,1,1600) RETURNING id",
    );
    await db.query(
      "INSERT INTO registro_tareas_repuestos(registro_tarea_id,repuesto_id,cantidad) VALUES ($1,1,2)",
      [rollbackRecord],
    );
    await assert.rejects(
      db.query(
        "INSERT INTO registro_tareas_repuestos(registro_tarea_id,repuesto_id,cantidad) VALUES ($1,2,999)",
        [rollbackRecord],
      ),
      (e) => e.code === "P0001",
    );
    await db.query("ROLLBACK");
    assert.equal(
      Number(await scalar("SELECT horas FROM maquinas WHERE id=1")),
      1300,
    );
    assert.equal(
      Number(
        await scalar(
          "SELECT cantidad_actual FROM inventario WHERE repuesto_id=1",
        ),
      ),
      20,
    );
    assert.equal(await scalar("SELECT count(*) FROM registro_tareas"), "4");
    console.log(
      "Failure after first consumption rolls back work, meter and all stock: passed.",
    );

    // Real concurrent transactions must serialize the inventory lock.
    const other = new Client(config);
    await other.connect();
    try {
      await db.query("BEGIN");
      await db.query(
        "INSERT INTO registro_tareas_repuestos(registro_tarea_id,repuesto_id,cantidad) VALUES(1,1,15)",
      );
      await other.query("BEGIN");
      await other.query("SET LOCAL lock_timeout='5s'");
      const blocked = other
        .query(
          "INSERT INTO registro_tareas_repuestos(registro_tarea_id,repuesto_id,cantidad) VALUES(4,1,15)",
        )
        .then(
          () => ({ ok: true }),
          (error) => ({ error }),
        );
      // Wait for the second connection to be observably blocked before releasing the first.
      let waiting = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        await db.query("SELECT pg_stat_clear_snapshot()");
        waiting = await scalar(
          "SELECT wait_event_type='Lock' FROM pg_stat_activity WHERE pid=$1",
          [other.processID],
        );
        if (waiting) break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      assert.equal(waiting, true);
      await db.query("COMMIT");
      const result = await blocked;
      assert.equal(result.error?.code, "P0001");
      await other.query("ROLLBACK");
      assert.equal(
        Number(
          await scalar(
            "SELECT cantidad_actual FROM inventario WHERE repuesto_id=1",
          ),
        ),
        5,
      );
      await db.query(
        "DELETE FROM registro_tareas_repuestos WHERE registro_tarea_id=1 AND repuesto_id=1",
      );
      assert.equal(
        Number(
          await scalar(
            "SELECT cantidad_actual FROM inventario WHERE repuesto_id=1",
          ),
        ),
        20,
      );
    } finally {
      await db.query("ROLLBACK");
      await other.query("ROLLBACK");
      await other.end();
    }
    console.log("Concurrent stock consumption: passed.");
    console.log(
      "PostgreSQL translation verified; temporary cluster will be stopped and removed.",
    );
  } finally {
    await db.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
