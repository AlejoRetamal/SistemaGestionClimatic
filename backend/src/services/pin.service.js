const {
  randomBytes,
  scrypt: scryptCallback,
  timingSafeEqual,
  createHmac,
} = require("node:crypto");
const { promisify } = require("node:util");
const scrypt = promisify(scryptCallback);
// Preserve leading zeroes. Definitive PIN length policy remains a business TODO.
function validPin(pin) {
  return typeof pin === "string" && /^\d{1,128}$/.test(pin);
}
function pinLookup(pin, secret) {
  if (secret.length < 32) throw new Error("APP_PIN_SECRET no está configurado");
  return createHmac("sha256", secret).update(pin).digest("hex");
}
async function hashPin(pin) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(pin, salt, 64);
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
async function verifyPin(pin, stored) {
  const [algorithm, salt, encoded] = String(stored).split(":");
  if (
    algorithm !== "scrypt" ||
    !/^[a-f0-9]{32}$/.test(salt || "") ||
    !/^[a-f0-9]{128}$/.test(encoded || "")
  )
    return false;
  return timingSafeEqual(
    await scrypt(pin, salt, 64),
    Buffer.from(encoded, "hex"),
  );
}
module.exports = { validPin, pinLookup, hashPin, verifyPin };
