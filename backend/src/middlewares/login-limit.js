function loginLimit({
  max = 10,
  windowMs = 15 * 60 * 1000,
  now = Date.now,
} = {}) {
  const attempts = new Map();
  return (req, res, next) => {
    const time = now();
    for (const [key, value] of attempts)
      if (value.until <= time) attempts.delete(key);
    const key = req.ip;
    const entry = attempts.get(key) || { count: 0, until: time + windowMs };
    if (entry.count >= max || (!attempts.has(key) && attempts.size >= 10000)) {
      res.set(
        "Retry-After",
        String(Math.max(1, Math.ceil((entry.until - time) / 1000))),
      );
      return res.status(429).json({
        error:
          "Demasiados intentos. Esperá unos minutos antes de volver a ingresar.",
      });
    }
    entry.count++;
    attempts.set(key, entry);
    next();
  };
}
module.exports = { loginLimit };
