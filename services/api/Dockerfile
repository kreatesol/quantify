# Build from the repository root: docker build -f services/api/Dockerfile .
FROM node:22-slim

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY services/api/package.json services/api/
RUN pnpm install --frozen-lockfile --prod --filter @quantify/api...

COPY packages/shared packages/shared
COPY services/api services/api

# Lets node-postgres verify the Amazon RDS certificate when PGSSLMODE=require.
ADD --chmod=644 https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /opt/rds-global-bundle.pem
ENV NODE_EXTRA_CA_CERTS=/opt/rds-global-bundle.pem NODE_ENV=production

WORKDIR /app/services/api
USER node
EXPOSE 3000
CMD ["node", "--import", "tsx", "src/server.ts"]
