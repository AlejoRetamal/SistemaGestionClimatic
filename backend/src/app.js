const express = require("express");
const cors = require("cors");
const { authRoutes } = require("./routes/auth.routes");
const { authenticate } = require("./middlewares/authenticate");
const { authorize } = require("./middlewares/authorize");
const { errorHandler } = require("./middlewares/error-handler");
const { maquinasRoutes } = require("./routes/maquinas.routes");
const { repuestosRoutes } = require("./routes/repuestos.routes");
const { catalogRoutes } = require("./routes/catalog.routes");
const { ordenesRoutes } = require("./routes/ordenes.routes");
const { registrosRoutes } = require("./routes/registros.routes");
function createApp({ auth, config, maintenance }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: config.origin, credentials: true }));
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== config.origin
    )
      return res
        .status(403)
        .json({ error: "Origen de solicitud no permitido." });
    next();
  });
  app.use(express.json({ limit: "128kb" }));
  // Health never queries a database.
  app.get("/api/health", (req, res) =>
    res.json({
      status: "ok",
      databaseEnabled: config.databaseEnabled,
      databaseDriver: config.databaseDriver || "postgres",
      phase: maintenance ? 2 : 1,
    }),
  );
  app.use("/api/auth", authRoutes(auth, config));
  if (maintenance) {
    app.use(
      "/api/maquinas",
      authenticate(auth),
      authorize("mantenimiento"),
      maquinasRoutes(maintenance.maquinas),
    );
    if (maintenance.repuestos)
      app.use("/api", repuestosRoutes(maintenance.repuestos, auth));
    if (maintenance.tareas)
      app.use(
        "/api/tareas",
        authenticate(auth),
        authorize("mantenimiento"),
        catalogRoutes(maintenance.tareas),
      );
    if (maintenance.extraordinarias)
      app.use(
        "/api/tareas-extraordinarias",
        authenticate(auth),
        authorize("mantenimiento"),
        catalogRoutes(maintenance.extraordinarias),
      );
    if (maintenance.preventivos)
      app.use(
        "/api/planes/preventivos",
        authenticate(auth),
        authorize("mantenimiento"),
        catalogRoutes(maintenance.preventivos),
      );
    if (maintenance.predictivos)
      app.use(
        "/api/planes/predictivos",
        authenticate(auth),
        authorize("mantenimiento"),
        catalogRoutes(maintenance.predictivos),
      );
    if (maintenance.ordenes)
      app.use(
        "/api/ordenes-mantenimiento",
        authenticate(auth),
        authorize("mantenimiento"),
        ordenesRoutes(maintenance.ordenes),
      );
    if (maintenance.registros)
      app.use(
        "/api/registros",
        authenticate(auth),
        authorize("mantenimiento"),
        registrosRoutes(maintenance.registros),
      );
  }
  for (const name of [
    "administracion",
    "produccion",
    "mantenimiento",
    "comercial",
  ]) {
    app.get(
      `/api/modulos/${name}`,
      authenticate(auth),
      authorize(name),
      (req, res) =>
        res.json({
          modulo: name,
          estado:
            name === "mantenimiento" && maintenance
              ? "disponible"
              : "pendiente",
          mensaje:
            name === "mantenimiento" && maintenance
              ? "Gestioná máquinas, tareas, repuestos y trabajos de mantenimiento."
              : "Módulo preparado. Las funciones se incorporarán por fases.",
        }),
    );
  }
  // Archived legacy endpoints remain unmounted; active routes above enforce module permissions.
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "Endpoint no disponible en esta fase." }),
  );
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
