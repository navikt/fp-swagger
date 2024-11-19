import timeout from "connect-timeout";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import config from "./config.js";
import { addHeaders } from "./headers.js";
import logger from "./logger.js";
import { setupRoutes } from "./routes.js";
import { verifyToken } from "./tokenValidation.js";

const server = express();

function startApp() {
  server.use(timeout("10m"));
  addHeaders(server);
  server.use(
    rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 200,
      message: "You have exceeded the 100 requests in 1 minute limit!",
      headers: true,
    }),
  );

  // Logging i json format
  server.use(logger.morganMiddleware);

  server.set("trust proxy", 1);

  server.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          "default-src": ["'self'"],
          "base-uri": ["'self'"],
          "connect-src": [
            "'self'",
            "https://sentry.gc.nav.no",
            "https://graph.microsoft.com",
          ],
          "font-src": ["'self'", "https://cdn.nav.no", "data:"],
          "img-src": ["'self'", "data:"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "frame-src": ["'self'"],
          "child-src": ["'self'"],
          "media-src": ["'none'"],
          "object-src": ["'none'"],
        },
      },
      referrerPolicy: { policy: "origin" },
      hidePoweredBy: true,
      noSniff: true,
    }),
  );

  // CORS konfig
  server.use(
    cors({
      origin: config.server.host,
      methods: config.cors.allowedMethods,
      exposedHeaders: config.cors.exposedHeaders,
      allowedHeaders: config.cors.allowedHeaders,
    }),
  );

  // Liveness and readiness probes for Kubernetes / nais
  server.get(["/health/isAlive", "/health/isReady"], (req, res) => {
    res.status(200).send("Alive");
  });

  server.get(["/oauth2/login"], async (req, res) => {
    res.status(502).send({
      message: "Wonderwall must handle /oauth2/login",
    });
  });

  // The routes below require the user to be authenticated
  server.use(verifyToken);

  server.get(["/logout"], async (req, res) => {
    if (req.headers.authorization) {
      res.redirect("/oauth2/logout");
    }
  });

  server.use("/", setupRoutes);
  const port = config.server.port;
  server.listen(port, () => logger.info(`Listening on port ${port}`));
}

try {
  startApp();
} catch (error) {
  logger.error("Oppstart av server feilet", error);
}
