FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:26-slim

LABEL org.opencontainers.image.source=https://github.com/navikt/fp-swagger
ENV TZ="Europe/Oslo"
ENV NODE_ENV="production"

WORKDIR /app
COPY package.json ./
COPY node_modules ./node_modules
COPY dist ./dist

USER node
EXPOSE 8080
CMD ["dist/server.js"]
