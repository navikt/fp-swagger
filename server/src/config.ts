import "dotenv/config";

import logger from "./logger.js";

const envVar = (name: string, required: boolean) => {
  if (!process.env[name] && required) {
    const errorMessage = `Missing required environment variable '${name}'`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
  return process.env[name];
};

const configValueAsJson = (name: string, required: boolean) => {
  const value = envVar(name, required);
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    const errorMessage = `Config: '${name}' er ikke et gyldig JSON-objekt.`;
    logger.error(errorMessage, error);
    throw new Error(errorMessage);
  }
};

const server = {
  // should be equivalent to the URL this application is hosted on for correct CORS origin header
  host: envVar("HOST", false) || "localhost",

  // port for your application
  port: envVar("PORT", false) || 3000,
};

const cors = {
  allowedHeaders: envVar("CORS_ALLOWED_HEADERS", false) || "Nav-CallId",
  exposedHeaders: envVar("CORS_EXPOSED_HEADERS", false) || "",
  allowedMethods: envVar("CORS_ALLOWED_METHODS", false) || "",
};

export type ProxyConfig = {
  apis: [
    {
      path: string;
      name: string;
      url: string;
      scopes: string;
    },
  ];
};
const getProxyConfig = () => {
  const config = configValueAsJson("PROXY_CONFIG", false);
  if (!config.apis) {
    const errorMessage = "Config: 'PROXY_CONFIG' mangler 'apis' entry.";
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
  for (const [index, entry] of config.apis.entries()) {
    if (!entry.path) {
      const errorMessage = `Api entry ${index} mangler 'path'`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    if (!entry.url) {
      const errorMessage = `Api entry ${index} mangler 'url'`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    if (!entry.scopes) {
      const errorMessage = `Api entry ${index} mangler 'scopes'`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    if (!entry.name) {
      const errorMessage = `Api entry ${index} mangler 'name'`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  return config as ProxyConfig;
};

const swagger = {
  customCss: envVar("CUSTOM_CSS", false) || "",
};

export default {
  server,
  reverseProxyConfig: getProxyConfig(),
  cors,
  swagger,
};
