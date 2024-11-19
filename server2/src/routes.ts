import express from "express";
import swaggerUi from "swagger-ui-express";

import config from "./config.js";
import { setupProxies } from "./reverseProxy.js";

export const setupRoutes = () => {
  const router = express.Router();

  const swaggerUrls = [];
  for (const api of config.reverseProxyConfig.apis) {
    swaggerUrls.push({ url: `${api.path}/openapi.json`, name: `${api.name}` });
  }

  const options = {
    explorer: true,
    customCss: config.swagger.customCss,
    swaggerOptions: {
      urls: config.reverseProxyConfig.apis.map((api) => ({
        url: `${api.path}/openapi.json`,
        name: `${api.name}`,
      })),
      deepLinking: true,
      layout: "StandaloneLayout",
    },
  };
  // set up swagger services and routes
  router.use("/", swaggerUi.serve);
  router.get("/", swaggerUi.setup(undefined, options));

  // set up reverse proxy for calling APIs/backends using the on-behalf-of flow
  setupProxies(router);

  return router;
};
