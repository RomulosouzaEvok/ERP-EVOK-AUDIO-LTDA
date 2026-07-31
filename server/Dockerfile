# syntax=docker/dockerfile:1
# NPM_REGISTRY permite usar um mirror quando a rede local bloqueia registry.npmjs.org;
# a integridade dos pacotes segue validada pelos hashes sha512 do package-lock.json.
ARG NPM_REGISTRY=https://registry.npmjs.org/

FROM node:24-bookworm-slim AS build
ARG NPM_REGISTRY

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --registry=$NPM_REGISTRY --fetch-retries=5 --fetch-retry-factor=2 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/config ./config

RUN groupadd --system evok && useradd --system --gid evok --create-home evok \
  && mkdir -p /app/uploads \
  && chown -R evok:evok /app

USER evok
EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 CMD node -e "const http=require('http');const req=http.get('http://127.0.0.1:5000/health/ready',res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));"

CMD ["node", "dist/index.js"]
