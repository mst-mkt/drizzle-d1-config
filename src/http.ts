/**
 * Provides a helper for generating drizzle-kit config that connects to a remote D1 database via the Cloudflare HTTP API.
 *
 * @module
 */

import type { Config } from 'drizzle-kit'

import { getAccountIdFromCache } from './internal/account'
import { getTokenFromCli } from './internal/cli'
import { getAccountIdFromEnv, getDatabaseIdFromEnv, getTokenFromEnv } from './internal/env'
import { getWranglerConfig } from './internal/wrangler'

export type D1HttpConfig = {
  /** Migration output directory. Falls back to `migrations_dir` in wrangler config. */
  out?: string
  /** D1 binding name to look up in `d1_databases`. If omitted and there is exactly one D1 database, it is used automatically. */
  binding?: string
  /** Explicit path to the wrangler config file. Auto-detected from `wrangler.jsonc`, `wrangler.toml`, or `wrangler.json` if omitted. */
  wranglerConfigPath?: string
  /** Cloudflare account ID. Falls back to `CLOUDFLARE_ACCOUNT_ID` env var -> wrangler config -> wrangler account cache. */
  accountId?: string
  /** D1 database ID. Falls back to `CLOUDFLARE_DATABASE_ID` env var -> wrangler config. */
  databaseId?: string
  /** Cloudflare API token. Falls back to `CLOUDFLARE_D1_TOKEN` / `CLOUDFLARE_API_TOKEN` env vars -> `wrangler auth token --json` CLI. */
  token?: string
}

type D1HttpDrizzleConfig = Pick<
  Extract<Config, { driver: 'd1-http' }>,
  'dialect' | 'driver' | 'dbCredentials' | 'out'
>

/**
 * Creates a Drizzle config for Cloudflare D1 via HTTP (remote).
 *
 * Resolves values through fallback chains:
 * - `accountId`: argument -> `CLOUDFLARE_ACCOUNT_ID` env var -> wrangler config `account_id` -> wrangler account cache
 * - `databaseId`: argument -> `CLOUDFLARE_DATABASE_ID` env var -> wrangler config `d1_databases[].database_id`
 * - `token`: argument -> `CLOUDFLARE_D1_TOKEN` / `CLOUDFLARE_API_TOKEN` env vars -> `wrangler auth token --json` CLI
 * - `out`: argument -> wrangler config `d1_databases[].migrations_dir`
 *
 * @example
 * ```ts
 * // Auto-resolve everything from wrangler config and environment
 * export default defineConfig({ ...d1Config(), schema: './src/db/schema.ts' })
 * ```
 *
 * @example
 * ```ts
 * // Fully explicit
 * export default defineConfig({
 *   ...d1Config({
 *     accountId: 'my-account-id',
 *     databaseId: 'my-db-id',
 *     token: 'my-api-token',
 *   }),
 *   schema: './src/db/schema.ts',
 * })
 * ```
 *
 * @param config - Configuration options. All fields are optional if wrangler config and credentials are available.
 * @returns A partial Drizzle config object to spread into `defineConfig`
 * @throws If `accountId`, `databaseId`, or `token` cannot be resolved from any source
 * @throws If multiple D1 databases are found and `binding` is not specified
 */
export const d1Config = (config: D1HttpConfig = {}): D1HttpDrizzleConfig => {
  const accountIdFromArgsOrEnv = config.accountId ?? getAccountIdFromEnv()
  const databaseIdFromArgsOrEnv = config.databaseId ?? getDatabaseIdFromEnv()

  const needsWrangler =
    accountIdFromArgsOrEnv == null || databaseIdFromArgsOrEnv == null || config.out === undefined

  const wrangler = needsWrangler
    ? getWranglerConfig(config.binding, config.wranglerConfigPath)
    : null

  const accountId = accountIdFromArgsOrEnv ?? wrangler?.accountId ?? getAccountIdFromCache()
  const databaseId = databaseIdFromArgsOrEnv ?? wrangler?.databaseId ?? null
  const token = config.token ?? getTokenFromEnv() ?? getTokenFromCli()

  if (accountId == null) {
    throw new Error(
      'accountId is required. Set it via config, CLOUDFLARE_ACCOUNT_ID env var, wrangler config, or wrangler auth.',
    )
  }
  if (databaseId == null) {
    throw new Error(
      'databaseId is required. Set it via config, CLOUDFLARE_DATABASE_ID env var, or wrangler config d1_databases.',
    )
  }
  if (token == null) {
    throw new Error(
      'token is required. Set it via config, CLOUDFLARE_D1_TOKEN / CLOUDFLARE_API_TOKEN env var, or wrangler auth.',
    )
  }

  return {
    out: config.out ?? wrangler?.migrationsDir ?? undefined,
    dialect: 'sqlite',
    driver: 'd1-http',
    dbCredentials: {
      accountId,
      databaseId,
      token,
    },
  }
}
