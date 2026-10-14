const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parameters,
  createPostgresOperations,
} = require("../src/config/postgres-operations");
const { databaseTypes, connectionSecurity } = require("../src/config/db");

test("PostgreSQL parameters preserve literals and keep supplied SQL-like values separate", async () => {
  const value = "Robert'); DROP TABLE empleados; --";
  let sent;
  const db = createPostgresOperations({
    query: async (...args) => {
      sent = args;
      return { command: "SELECT", rows: [] };
    },
  });
  await db.query(
    "SELECT '?' AS literal WHERE nombre=? AND descripcion='it''s ?'",
    [value],
  );
  assert.deepEqual(sent, [
    "SELECT '?' AS literal WHERE nombre=$1 AND descripcion='it''s ?'",
    [value],
  ]);
  assert.throws(() => parameters("SELECT ?", []), /parameter count/);
});

test("PostgreSQL numeric and local date parsers preserve the HTTP contract", () => {
  assert.equal(databaseTypes.getTypeParser(20)("4294967295"), 4294967295);
  assert.throws(
    () => databaseTypes.getTypeParser(20)("9007199254740993"),
    /range/,
  );
  assert.equal(databaseTypes.getTypeParser(1700)("12.50"), 12.5);
  assert.equal(
    databaseTypes.getTypeParser(1114)("2026-10-14 08:00:00"),
    "2026-10-14 08:00:00",
  );
});

test("Remote connections enforce verified TLS even when URI parameters disable SSL", () => {
  const remote = connectionSecurity({
    databaseUrl:
      "postgres://user:example@db.example.supabase.co/postgres?sslmode=disable&ssl=false",
  });
  assert.equal(remote.ssl.rejectUnauthorized, true);
  assert.equal(new URL(remote.connectionString).search, "");
  assert.deepEqual(
    connectionSecurity({ databaseUrl: "postgres://user@127.0.0.1/test" }),
    {},
  );
});

test("PostgreSQL transactions release clients after failure and roll back writes", async () => {
  const calls = [];
  const client = {
    query: async (sql) => {
      calls.push(sql);
    },
    release: () => calls.push("release"),
  };
  const db = createPostgresOperations({ connect: async () => client });
  await assert.rejects(
    db.transaction(async () => {
      throw Error("failed consumption");
    }),
    /failed consumption/,
  );
  assert.deepEqual(calls, ["BEGIN", "ROLLBACK", "release"]);
});
