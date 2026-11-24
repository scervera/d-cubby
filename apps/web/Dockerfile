# syntax=docker/dockerfile:1.7
# Next.js (standalone output) image. Build context is apps/web.
#   docker build apps/web

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# No NEXT_PUBLIC_* build args: the app calls the API at the relative path /api/v1, so
# one image works behind any domain.

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS production
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=80 HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
RUN mkdir -p /app/.next/cache && chown nextjs:nodejs /app/.next/cache

USER nextjs
EXPOSE 80
CMD ["node", "server.js"]
