FROM busybox:uclibc AS builder
FROM gcr.io/distroless/nodejs18-debian11:nonroot

LABEL org.opencontainers.image.source=https://github.com/navikt/fp-swagger
ENV TZ="Europe/Oslo"
ENV NODE_ENV production

WORKDIR /app

COPY --from=builder /bin/wget /usr/bin/wget
COPY server.js package.json ./
COPY server ./server/
COPY node_modules ./node_modules/

EXPOSE 8080
CMD ["./server.js"]
