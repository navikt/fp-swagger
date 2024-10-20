FROM gcr.io/distroless/nodejs22-debian12:nonroot

LABEL org.opencontainers.image.source=https://github.com/navikt/fp-swagger
ENV TZ="Europe/Oslo"
ENV NODE_ENV production

WORKDIR /app

COPY server.js package.json ./
COPY server ./server/
COPY node_modules ./node_modules/

EXPOSE 8080
CMD ["./server.js"]
