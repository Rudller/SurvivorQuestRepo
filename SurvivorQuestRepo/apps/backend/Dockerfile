FROM node:22-alpine

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/mobile/package.json apps/mobile/package.json

RUN pnpm install --frozen-lockfile --filter backend...

COPY apps/backend apps/backend

WORKDIR /app/apps/backend

RUN pnpm prisma generate && pnpm build

ENV NODE_ENV=production

EXPOSE 3001

CMD ["pnpm", "start:prod"]
