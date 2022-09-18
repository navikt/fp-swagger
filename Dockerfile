FROM navikt/node-express:16

USER root
WORKDIR /app

COPY server.js /app/
ADD server /app/server
COPY package.json /app/
RUN npm i

EXPOSE 9090
