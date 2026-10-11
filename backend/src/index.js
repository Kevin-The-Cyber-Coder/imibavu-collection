const env = require("./config/env");
const app = require("./app");
const { connectDB } = require("./db/connect");
const logger = require("./utils/logger");

connectDB()
  .then(() => {
    app.listen(env.port, () => {
      logger.info(
        { port: env.port, env: env.nodeEnv },
        `Imibavu API listening on http://localhost:${env.port}/api/v1`
      );
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to start");
    process.exit(1);
  });
