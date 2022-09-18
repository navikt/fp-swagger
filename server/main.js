import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import session from './session.js';
import helmet from 'helmet';
import passport from 'passport';
import * as headers from "./headers.js";
import logger from './log.js';
// for debugging during development
import routes from './routes.js';
import config from './config.js';
import azure from './auth/azure.js';

const server = express();
const { port } = config.server;

async function startApp() {
  try {
    session.setup(server);
    headers.setup(server);

    // Logging i json format
    server.use(logger.morganMiddleware);

    server.use(bodyParser.json());
    server.use(bodyParser.urlencoded({ extended: true }));

    //server.use(limit);

    server.use(
      helmet({
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            connectSrc: [
              "'self'",
              'https://graph.microsoft.com',
              'https://login.microsoftonline.com',
              'https://validator.swagger.io'
            ],
            imgSrc: [
              "'self'",
              'https://validator.swagger.io',
              'data:'
            ],
            frameSrc: ["'none'"],
            childSrc: ["'none'"],
            mediaSrc: ["'none'"],
            objectSrc: ["'none'"],
          },
        },
        hidePoweredBy: true,
        noSniff: true
      }),
    );

    // CORS konfig
    server.use(
      cors({
        origin: config.server.host,
        methods: config.cors.allowedMethods,
        exposedHeaders: config.cors.exposedHeaders,
        allowedHeaders: config.cors.allowedHeaders
      })
    );

    // initialize passport and restore authentication state, if any, from the session
    server.use(passport.initialize());
    server.use(passport.session());

    const authClient = await azure.client();
    passport.use('azureOidc', azure.strategy(authClient));
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));

    // setup routes
    server.use('/', routes.setup(authClient));

    server.listen(port, () => logger.info(`Listening on port ${port}`));
  } catch (error) {
    logger.error('Error during start-up: ', error);
  }
}

startApp()
  .catch((err) => logger.error(err));
