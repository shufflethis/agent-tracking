# Agent Tracking, self-hosted. One Node process, one SQLite file under /app/.data.
# node:sqlite is part of Node from 22.13 without a flag; keep the tag at or above that.
FROM node:22.22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# The fonts are fetched from Google at build time and served from this image afterwards.
RUN npm run build

FROM node:22.22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/lib ./lib
COPY --from=build /app/tsconfig.json ./
RUN mkdir -p .data && chown -R node:node /app
USER node
EXPOSE 3000
VOLUME ["/app/.data"]
CMD ["node", "--no-warnings", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
