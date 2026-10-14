const { Router } = require("express");
const { createAuthController } = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/authenticate");
const { loginLimit } = require("../middlewares/login-limit");
function authRoutes(auth, config) {
  const router = Router();
  const controller = createAuthController(auth, config);
  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.post("/login", loginLimit(), controller.login);
  router.get("/me", authenticate(auth), controller.me);
  router.post("/logout", authenticate(auth), controller.logout);
  return router;
}
module.exports = { authRoutes };
