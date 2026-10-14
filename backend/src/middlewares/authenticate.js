function readCookie(header, name) {
  for (const part of (header || "").split(";")) {
    const index = part.indexOf("=");
    if (part.slice(0, index).trim() === name)
      return part.slice(index + 1).trim();
  }
}
function authenticate(auth) {
  return async (req, res, next) => {
    try {
      req.sessionToken = readCookie(req.headers.cookie, "climatic_session");
      req.user = await auth.authenticate(
        req.sessionToken,
        req.headers["x-csrf-token"],
        !["GET", "HEAD", "OPTIONS"].includes(req.method),
      );
      next();
    } catch (error) {
      next(error);
    }
  };
}
module.exports = { authenticate, readCookie };
