FROM node:18-slim

ARG VERSION=0.0.0
ARG VCS_REF=local
ARG SOURCE_URL=https://github.com/anthropics/poe-mcp

LABEL org.opencontainers.image.source="${SOURCE_URL}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}"

WORKDIR /app
ENV NODE_ENV=production

# Enable pnpm via corepack for reproducible installs
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

# Copy package metadata and compiled assets (build before docker build)
COPY package.json pnpm-lock.yaml ./
COPY dist ./dist
COPY bin ./bin
COPY schema ./schema
COPY fixtures ./fixtures
COPY manifest.template.json ./manifest.template.json
COPY docs ./docs

RUN pnpm install --prod --frozen-lockfile

EXPOSE 8765

CMD ["node", "dist/index.cjs", "serve", "--transport", "http"]
