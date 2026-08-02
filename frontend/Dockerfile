FROM node:24-alpine

WORKDIR /app

RUN corepack enable

# pnpm-workspace.yaml carries the overrides. It has to land before install:
# the lockfile records those overrides, and a frozen install fails with
# ERR_PNPM_LOCKFILE_CONFIG_MISMATCH if the config that produced them is absent.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host"]
