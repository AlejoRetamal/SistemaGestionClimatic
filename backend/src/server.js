const { createRuntime } = require("./runtime");
const runtime = createRuntime();
const { app, config } = runtime;
const server = app.listen(config.port, config.host, () => {
  console.log(
    `Climatic API en http://${config.host}:${config.port}. ${config.databaseDriver} ${config.databaseEnabled ? "habilitado explícitamente" : "deshabilitado"}.`,
  );
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () =>
    server.close(async () => {
      await runtime.close();
      process.exit(0);
    }),
  );
}
