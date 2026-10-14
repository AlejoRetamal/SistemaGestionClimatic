function createAuthController(auth, config) {
  const cookieOptions = {
    secure: config.secureCookie,
    sameSite: "strict",
    path: "/api",
  };
  return {
    async login(req, res) {
      const result = await auth.login(req.body?.pin);
      res.cookie("climatic_session", result.token, {
        ...cookieOptions,
        httpOnly: true,
        expires: result.expires,
      });
      res.cookie("XSRF-TOKEN", result.csrf, {
        ...cookieOptions,
        path: "/",
        expires: result.expires,
      });
      res.json(result.user);
    },
    me(req, res) {
      res.json(req.user);
    },
    async logout(req, res) {
      await auth.logout(req.sessionToken);
      res.clearCookie("climatic_session", { ...cookieOptions, httpOnly: true });
      res.clearCookie("XSRF-TOKEN", { ...cookieOptions, path: "/" });
      res.status(204).end();
    },
  };
}
module.exports = { createAuthController };
