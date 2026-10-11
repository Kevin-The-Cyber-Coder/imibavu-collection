const pino = require("pino");
const env = require("../config/env");

const logger = pino({
  level: env.isProd ? "info" : "debug",
  transport: env.isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
});

module.exports = logger;
