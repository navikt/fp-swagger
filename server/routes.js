import express from 'express';
import config from './config.js';
import reverseProxy from './reverse-proxy.js';
import swaggerUi from 'swagger-ui-express';

const router = express.Router();

const setup = () => {
  const swaggerUrls = [];
  config.reverseProxyConfig.apis.forEach((api) => {
    swaggerUrls.push({"url":`${api.path}/openapi.json`, "name":`${api.name}`})
  });

  const options = {
    explorer: true,
    customCss: config.swagger.customCss,
    swaggerOptions: {
      "urls": swaggerUrls,
      "deepLinking": true,
      "layout": "StandaloneLayout"
    },
  };
  // set up swagger services and routes
  router.use('/', swaggerUi.serve);
  router.get('/', swaggerUi.setup(null, options));

  // set up reverse proxy for calling APIs/backends using the on-behalf-of flow
  reverseProxy.setup(router);

  return router;
};

export default { setup };
