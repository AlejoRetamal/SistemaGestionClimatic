const express = require("express");
const { createRuntime } = require("./src/runtime");

// A concrete Express export for Vercel. Local development keeps its own listener.
const app = express();
app.disable("x-powered-by");
app.use(createRuntime().app);
module.exports = app;
