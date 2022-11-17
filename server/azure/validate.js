import config from '../config.js';
import logger from '../log.js';
import { jwtVerify } from 'jose';
import { getIssuer } from './issuer.js';
import { getJwkSet } from './jwk.js';

const isTokenValid = async (token) => jwtVerify(token, await getJwkSet(), {
  issuer: (await getIssuer()).metadata.issuer,
  audience: config.azureAd.clientId,
});

export const validateAuthorization = async (authorization) => {
  try {
    const token = authorization.replace('Bearer ', '');
    const JWTVerifyResult = await isTokenValid(token);
    return !!JWTVerifyResult?.payload;
  } catch (e) {
    logger.error('Azure AD error', e);
    return false;
  }
};

export default {
  validateAuthorization,
};
