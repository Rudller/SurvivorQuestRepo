FROM node:22-alpine

RUN corepack enable

WORKDIR /app

ARG NEXT_PUBLIC_API_URL

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY apps/mobile/package.json apps/mobile/package.json

RUN pnpm install --frozen-lockfile --filter admin...

COPY apps/admin apps/admin

WORKDIR /app/apps/admin

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm build

ENV NODE_ENV=production
ENV PORT=3100
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3100

CMD ["pnpm", "start", "--", "-p", "3100"]
