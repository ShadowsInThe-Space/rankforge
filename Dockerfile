FROM node:20-alpine AS base

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy pre-built Next.js files
COPY public ./public
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client for alpine-musl inside container
RUN npx prisma generate --schema ./prisma/schema.prisma

# Create cache dir
RUN mkdir -p .next/cache && chown node:node .next/cache || true

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["node", "Development/rankforge/server.js"]
