// Upload only the application settings to the linked Climatic backend.
// Secrets are passed on stdin, never command arguments, logs or frontend files.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { parse } = require("dotenv");

function main() {
  const backend = path.resolve(__dirname, "..");
  const project = JSON.parse(
    fs.readFileSync(path.join(backend, ".vercel/project.json"), "utf8"),
  );
  if (project.projectName !== "climatic-srl-backend")
    throw new Error("Link the Climatic backend project first");
  const origin = process.argv[2];
  const url = new URL(origin);
  if (url.protocol !== "https:" || url.origin !== origin)
    throw new Error("Provide the frontend HTTPS origin");
  const cli = process.argv[3];
  if (!cli || !fs.existsSync(cli))
    throw new Error("Provide the installed Vercel vc.js path");
  const local = parse(fs.readFileSync(path.join(backend, ".env.local")));
  if (!local.APP_DATABASE_URL || (local.APP_PIN_SECRET || "").length < 32)
    throw new Error("Missing local Supabase settings");
  const values = {
    APP_ENV: "production",
    APP_ORIGIN: origin,
    APP_DATABASE_DRIVER: "postgres",
    APP_DATABASE_ENABLED: "true",
    APP_DATABASE_URL: local.APP_DATABASE_URL,
    APP_PIN_SECRET: local.APP_PIN_SECRET,
    APP_DATABASE_SSL_CA: local.APP_DATABASE_SSL_CA || "",
    APP_DATABASE_POOL_MAX: "2",
    APP_SESSION_HOURS: local.APP_SESSION_HOURS || "8",
    APP_SERVICE_MARGIN_PERCENT: local.APP_SERVICE_MARGIN_PERCENT || "10",
  };
  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    const args = [cli, "env", "add", key, "production", "--force", "--yes"];
    if (["APP_DATABASE_URL", "APP_PIN_SECRET"].includes(key))
      args.push("--sensitive");
    const result = spawnSync(process.execPath, args, {
      cwd: backend,
      input: value,
      encoding: "utf8",
      windowsHide: true,
      env: { ...process.env, NODE_USE_SYSTEM_CA: "1" },
      timeout: 60000,
    });
    if (result.status !== 0)
      throw new Error(
        `Could not configure ${key}; inspect Vercel env metadata`,
      );
    console.log(`${key}: configured in production`);
  }
}
try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
