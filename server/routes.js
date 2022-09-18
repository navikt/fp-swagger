import express from 'express';
import passport from 'passport';
import session from 'express-session';
import config from './config.js';
import authUtils from './auth/utils.js';
import reverseProxy from './proxy/reverse-proxy.js';
import swaggerUi from 'swagger-ui-express';

const router = express.Router();

const ensureAuthenticated = async (req, res, next) => {
  if (req.isAuthenticated() && authUtils.hasValidAccessToken(req)) {
    next();
  } else {
    session.redirectTo = req.url;
    res.redirect(`/login`);
  }
};

const setup = (authClient) => {
  // These routes are unprotected and do not require auth to reach

  // Liveness and readiness probes for Kubernetes / nais
  router.get(`/isAlive`, (req, res) => res.send('Alive'));
  router.get(`/isReady`, (req, res) => res.send('Ready'));

  // Routes for passport to handle the authentication flow
    router.get(`/login`, passport.authenticate('azureOidc', { failureRedirect: `/login` }));
    router.use(`/oauth2/callback`, passport.authenticate('azureOidc', { failureRedirect: `/login` }), (req, res) => {
    if (session.redirectTo) {
      res.redirect(session.redirectTo);
    } else {
      res.redirect(`/`);
    }
  });

  // The routes below require the user to be authenticated
  router.use(ensureAuthenticated);

  const swaggerUrls = [];
  config.reverseProxyConfig.apis.forEach((api) => {
    swaggerUrls.push({"url":`${api.path}/openapi.json`, "name":`${api.name}`})
  });

  const options = {
    explorer: true,
    swaggerOptions: {
      "urls": swaggerUrls,
      "deepLinking": true,
      "layout": "StandaloneLayout"
    }
  }
  // set up swagger services and routes
  router.use('/', swaggerUi.serve);
  router.get('/', swaggerUi.setup(null, options));

  // log the user out
  router.get(`/logout`, (req, res) => {
    req.logOut();
    res.redirect(authClient.endSessionUrl({ post_logout_redirect_uri: config.azureAd.logoutRedirectUri }));
  });

  // set up reverse proxy for calling APIs/backends using the on-behalf-of flow
  reverseProxy.setup(router, authClient);

  return router;
};

export default { setup };
