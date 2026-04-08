import { getToken, requestAzureOboToken } from "@navikt/oasis";
import { Router } from "express";
import proxy, { ProxyOptions } from "express-http-proxy";
import { ulid } from "ulid";

import config, { ProxyConfig } from "./config.js";
import logger from "./logger.js";

const xTimestamp = "x-Timestamp";
const xNavCallId = "x_Nav-CallId";
const stripTrailingSlash = (str: string) =>
  str.endsWith("/") ? str.slice(0, -1) : str;

const proxyOptions = (api: ProxyConfig["apis"][0]): ProxyOptions => {
  const namePrefix = `/proxy/${api.name}`;
  // Første segment av api.path er applikasjonens context-path. Resten er path til forvaltningsgrensesnittet
  // Context-path brukes i openapi/servers.uri
  // Used to correctly rewrite paths for "Try it out" calls — avoids path doubling
  const contextPath = api.path.slice(0, Math.max(0, api.path.indexOf("/", 1)));

  return {
    proxyReqOptDecorator: (options, request) => {
      options.headers = options.headers ?? {};
      const requestTime = Date.now();

      options.headers[xNavCallId] = request.headers[xNavCallId] ?? ulid();
      options.headers[xTimestamp] = requestTime;

      // For spec requests: prevent gzip (so JSON.parse works in userResDecorator)
      // and strip cache headers (so backend always returns 200 with body, not 304)
      if (request.originalUrl?.includes("/openapi.json")) {
        options.headers["accept-encoding"] = "identity";
        delete options.headers["if-none-match"];
        delete options.headers["if-modified-since"];
      }

      delete options.headers.cookie;

      return new Promise((resolve, reject) => {
        // Vi har allerede validert token før vi kommer hit. Så dette burde aldri inntreffe
        const token = getToken(request);
        if (!token) {
          logger.warning(
            "Fant ikke Wonderwall token ved OBO-utveksling. Dette burde ikke inntreffe",
          );
          reject(new Error("Intet Wonderwall token"));
        }
        if (token) {
          requestAzureOboToken(token, api.scopes).then((obo) => {
            if (obo.ok) {
              logger.info(
                `Token veksling tok: (${Date.now() - requestTime}ms)`,
              );
              // I tilfelle headers er undefined.
              options.headers = options.headers ?? {};
              options.headers.Authorization = `Bearer ${obo.token}`;
              resolve(options);
            } else {
              logger.warning(`OBO-utveklsing for ${api.scopes} feilet.`);
              reject(obo.error); // NOSONAR: Sonarcloud forstår ikke at obo.error er et Error objekt. Dermed gir den en false positive.
            }
          });
        }
      });
    },
    proxyReqPathResolver: (req) => {
      const urlFromApi = new URL(api.url);
      const pathFromApi =
        urlFromApi.pathname === "/" ? "" : urlFromApi.pathname;

      const urlFromRequest = new URL(
        req.originalUrl,
        `http://${req.headers.host}`,
      );

      // Spec fetch:  replace namePrefix with api.path  e.g. /proxy/fp-los → /fplos/forvaltning/api
      // API calls:   replace namePrefix with contextPath  e.g. /proxy/fp-los → /fplos
      //              Using api.path here would double the path: /fplos/forvaltning/api/forvaltning/api/...
      const isSpecFetch = urlFromRequest.pathname.endsWith("/openapi.json");
      const replacement = isSpecFetch ? api.path : contextPath;
      const pathFromRequest = urlFromRequest.pathname.replace(
        namePrefix,
        replacement,
      );

      const queryString = urlFromRequest.searchParams.toString();
      const newPath =
        (pathFromApi || "") +
        (pathFromRequest || "") +
        (queryString ? `?${queryString}` : "");

      logger.info(
        `Proxying request from '${req.originalUrl}' to '${stripTrailingSlash(urlFromApi.href)}${newPath}'`,
      );
      return newPath;
    },

    // Rewrite servers[0].url to the name-based proxy path so Swagger UI routes
    // all "Try it out" calls through /proxy/<name>/... instead of /fplos/...
    userResDecorator: (_proxyRes, proxyResData, userReq) => {
      if (userReq.originalUrl?.includes("/openapi.json")) {
        try {
          const spec = JSON.parse(proxyResData.toString("utf8"));
          spec.servers = [{ url: namePrefix }];
          return JSON.stringify(spec);
        } catch (error) {
          logger.warning(
            `Failed to parse openapi.json for ${api.name}: ${error}`,
          );
          return proxyResData;
        }
      }
      return proxyResData;
    },

    userResHeaderDecorator: (headers, userReq, userRes, proxyReq, proxyRes) => {
      if (userReq.originalUrl?.includes("/openapi.json")) {
        delete headers["content-length"];
        delete headers["content-encoding"];
        delete headers["etag"];
        delete headers["last-modified"];
      }
      // FPSAK og TILBAKE sender redirect med full hostname — modifisere slik at det går tilbake via proxy.
      const location = proxyRes.headers.location;
      if (location?.includes(api.url)) {
        headers.location = location.split(api.url)[1];
        logger.debug(`Location header etter endring: ${headers.location}`);
      }
      const { statusCode } = proxyRes;
      const requestTime = Date.now() - Number(proxyReq.getHeader(xTimestamp));
      const melding = `${statusCode} ${proxyRes.statusMessage}: ${userReq.method} - ${userReq.originalUrl} (${requestTime}ms)`;
      const callIdValue = proxyReq.getHeader("Nav-Callid");
      if (Number(statusCode) >= 500) {
        logger.logger.warn(melding, { "Nav-Callid": callIdValue });
      } else {
        logger.logger.info(melding, { "Nav-Callid": callIdValue });
      }
      return headers;
    },

    proxyErrorHandler: function (err, res, next) {
      switch (err?.code) {
        case "ENOTFOUND": {
          logger.warning(`${err}, with code: ${err.code}`);
          return res.status(404).send();
        }
        case "ECONNRESET": {
          return res.status(504).send();
        }
        case "ECONNREFUSED": {
          return res.status(500).send();
        }
        default: {
          logger.warning(`${err}, with code: ${err.code}`);
          next(err);
        }
      }
    },
  };
};

export const setupProxies = (router: Router) => {
  for (const api of config.reverseProxyConfig.apis) {
    router.use(
      `/proxy/${api.name}/*splat`,
      (request, response, next) => {
        if (request.timedout) {
          logger.warning(`Request for ${request.originalUrl} timed out!`);
        } else {
          next();
        }
      },
      proxy(api.url, proxyOptions(api)),
    );
  }
};
