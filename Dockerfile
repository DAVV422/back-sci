# API del SCI (NestJS). Se compila dentro de la imagen: el servidor no necesita el código fuente.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
# `tini` para que el contenedor responda a las señales y cierre las conexiones de Postgres.
RUN apt-get update && apt-get install -y --no-install-recommends tini \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Archivos subidos (fotos, croquis, logo, audios). Se monta un volumen por institución.
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/main"]
