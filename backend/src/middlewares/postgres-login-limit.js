const { createHmac } = require("node:crypto");
const { isIP } = require("node:net");

// Atomic, shared across Vercel instances. Store a keyed digest, not raw IPs.
function postgresLoginLimit(db, config) {
  return async (req, res, next) => {
    const forwarded = req.headers["x-vercel-forwarded-for"];
    const address =
      config.vercel && typeof forwarded === "string" && isIP(forwarded)
        ? forwarded
        : req.ip || "unknown";
    const key = createHmac("sha256", config.pinSecret)
      .update(`login:${address}`)
      .digest("hex");
    await db.query(
      "DELETE FROM public.login_attempts WHERE expires_at <= now()",
    );
    const { rows } = await db.query(
      `INSERT INTO public.login_attempts (key_hash,attempts,expires_at)
      VALUES ($1,1,now()+interval '15 minutes')
      ON CONFLICT (key_hash) DO UPDATE SET
        attempts=CASE WHEN login_attempts.expires_at<=now() THEN 1 ELSE LEAST(login_attempts.attempts+1,11) END,
        expires_at=CASE WHEN login_attempts.expires_at<=now() THEN now()+interval '15 minutes' ELSE login_attempts.expires_at END
      RETURNING attempts,GREATEST(1,CEIL(EXTRACT(EPOCH FROM expires_at-now())))::integer AS retry_after`,
      [key],
    );
    if (rows[0].attempts > 10) {
      res.set("Retry-After", String(rows[0].retry_after));
      return res
        .status(429)
        .json({
          error:
            "Demasiados intentos. Esperá unos minutos antes de volver a ingresar.",
        });
    }
    next();
  };
}
module.exports = { postgresLoginLimit };
