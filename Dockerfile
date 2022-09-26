FROM navikt/node-express:16

ENV TZ="Europe/Oslo"
LABEL org.opencontainers.image.source=https://github.com/navikt/fp-frontend

WORKDIR /app
COPY --chown=apprunner:root server.js package.json ./
COPY --chown=apprunner:root server ./server/
RUN npm i

EXPOSE 8080
