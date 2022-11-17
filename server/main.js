import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import timeout from 'connect-timeout';
import limit from './ratelimit.js';
import * as headers from './headers.js';
import logger from './log.js';
import { getIssuer } from './azure/issuer.js';

// for debugging during development
import config from './config.js';
import routes from './routes.js';
import { validateAuthorization } from './azure/validate.js';

const server = express();
const { port } = config.server;

async function startApp() {
  try {
    server.use(timeout('10m'));
    headers.setup(server);

    // Logging i json format
    server.use(logger.morganMiddleware);

    server.use(bodyParser.json());
    server.use(bodyParser.urlencoded({ extended: true }));

    server.use(limit);

    server.set('trust proxy', 1);

    server.use(
      helmet({
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            connectSrc: [
              "'self'",
              'https://validator.swagger.io',
            ],
            imgSrc: [
              "'self'",
              'https://validator.swagger.io',
              'data:',
            ],
            frameSrc: ["'none'"],
            childSrc: ["'none'"],
            mediaSrc: ["'none'"],
            objectSrc: ["'none'"],
          },
        },
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

    await getIssuer();

    // Liveness and readiness probes for Kubernetes / nais
    server.get(['/isAlive', '/isReady'], (req, res) => {
      res.status(200).send('Alive');
    });

    server.get(['/oauth2/login'], async (req, res) => {
      res.status(502).send({
        message: 'Wonderwall must handle /oauth2/login',
      });
    });

    const ensureAuthenticated = async (req, res, next) => {
      const { authorization } = req.headers;
      const loginPath = `/oauth2/login?redirect=${req.originalUrl}`;
      if (!authorization) {
        logger.debug('User token missing. Redirect til login.');
        res.redirect(loginPath);
      } else {
        // Validate token and continue to app
        // eslint-disable-next-line no-lonely-if
        if (await validateAuthorization(authorization)) {
          logger.debug('User token is valid. Continue.');
          next();
        } else {
          logger.debug('User token is NOT valid. Redirect til login.');
          res.redirect(loginPath);
        }
      }
    };

    // The routes below require the user to be authenticated
    server.use(ensureAuthenticated);

    server.get(['/logout'], async (req, res) => {
      if (req.headers.authorization) {
        res.redirect('/oauth2/logout');
      }
    });

    // setup routes
    server.use('/', routes.setup());

    server.listen(port, () => logger.info(`Listening on port ${port}`));
  } catch (error) {
    logger.error('Error during start-up: ', error);
  }
}

startApp()
  .catch((err) => logger.error(err));
