import express from "express";
import swaggerUi from "swagger-ui-express";

import config from "./config.js";
import { setupProxies } from "./reverseProxy.js";

const router = express.Router();

export const setupRoutes = () => {

  const options = {
    explorer: true,
    customCss: config.swagger.customCss,
    swaggerOptions: {
      urls: config.reverseProxyConfig.apis.map((api) => ({
        url: `${api.path}/openapi.json`,
        name: api.name,
      })),
      deepLinking: true,
      layout: "StandaloneLayout",
    },
  };
  console.log(options);
  // set up swagger services and routes
  router.use("/", swaggerUi.serve);
  router.get("/",  swaggerUi.setup(undefined, options));

  // set up reverse proxy for calling APIs/backends using the on-behalf-of flow
  setupProxies(router);

  return router;
};
