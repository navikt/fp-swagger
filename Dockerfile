FROM gcr.io/distroless/nodejs22-debian12:nonroot

LABEL org.opencontainers.image.source=https://github.com/navikt/fp-swagger
ENV TZ="Europe/Oslo"
ENV NODE_ENV production

WORKDIR /app

COPY server/dist ./

EXPOSE 8080
CMD ["./index.js"]
