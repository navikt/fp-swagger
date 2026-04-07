FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:24-slim

LABEL org.opencontainers.image.source=https://github.com/navikt/fp-swagger
ENV TZ="Europe/Oslo"
ENV NODE_ENV="production"

COPY . /app
WORKDIR /app
EXPOSE 8080
CMD ["dist/server.js"]
