FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=@imok/api --workspace=@imok/shared

# Build shared package
FROM deps AS build-shared
COPY packages/shared ./packages/shared
RUN npm run build --workspace=@imok/shared

# Build API
FROM build-shared AS build-api
COPY apps/api ./apps/api
RUN npm run build --workspace=@imok/api

# Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build-api /app/packages/shared/dist ./packages/shared/dist
COPY --from=build-api /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build-api /app/apps/api/dist ./apps/api/dist
COPY --from=build-api /app/apps/api/package.json ./apps/api/package.json
COPY --from=build-api /app/node_modules ./node_modules
COPY --from=build-api /app/package.json ./package.json

EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
