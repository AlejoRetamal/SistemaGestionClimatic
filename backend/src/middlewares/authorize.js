const { allowedModules } = require("../config/permissions");
function authorize(moduleName) {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ error: "Iniciá sesión para continuar." });
    if (!allowedModules(req.user.grupo).includes(moduleName))
      return res
        .status(403)
        .json({ error: "No tenés permiso para acceder a este módulo." });
    next();
  };
}
module.exports = { authorize };
