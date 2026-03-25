import type { Config } from 'drizzle-kit'

import { getD1SqlitePath } from './internal/d1-sqlite'
import { getWranglerConfig } from './internal/wrangler'

type D1LocalConfig = {
  /** Migration output directory. Falls back to `migrations_dir` in wrangler config. */
  out?: string
  /** D1 binding name to look up in `d1_databases`. If omitted and there is exactly one D1 database, it is used automatically. */
  binding?: string
  /** Explicit path to the wrangler config file. Auto-detected from `wrangler.jsonc`, `wrangler.toml`, or `wrangler.json` if omitted. */
  wranglerConfigPath?: string
  /** D1 database ID. Falls back to the value in wrangler config. */
  databaseId?: string
  /** Wrangler state directory, corresponding to `--persist-to`. Defaults to `.wrangler/state/v3`. */
  persistDir?: string
}

/**
 * Creates a Drizzle config for local Cloudflare D1 (SQLite via `.wrangler/state/v3/d1`).
 *
 * Resolves values through fallback chains:
 * - `databaseId`: argument -> wrangler config `d1_databases[].database_id`
 * - `out`: argument -> wrangler config `d1_databases[].migrations_dir`
 *
 * @example
 * ```ts
 * // Auto-resolve everything from wrangler config
 * export default defineConfig({ ...d1Config(), schema: './src/db/schema.ts' })
 * ```
 *
 * @example
 * ```ts
 * // Explicit databaseId with custom persist directory
 * export default defineConfig({
 *   ...d1Config({ databaseId: 'abc123', persistDir: './custom/state' }),
 *   schema: './src/db/schema.ts',
 * })
 * ```
 *
 * @param config - Configuration options. All fields are optional if wrangler config is available.
 * @returns A partial Drizzle config object to spread into `defineConfig`
 * @throws If `databaseId` cannot be resolved from any source
 * @throws If multiple D1 databases are found and `binding` is not specified
 */
export const d1Config = (config: D1LocalConfig = {}) => {
  const needsWrangler = config.databaseId === undefined || config.out === undefined

  const wrangler = needsWrangler
    ? getWranglerConfig(config.binding, config.wranglerConfigPath)
    : null

  const databaseId = config.databaseId ?? wrangler?.databaseId ?? null
  const migrationsDir = config.out ?? wrangler?.migrationsDir ?? null

  if (databaseId == null) {
    throw new Error('databaseId is required. Set it via config or wrangler config d1_databases.')
  }

  return {
    out: migrationsDir ?? undefined,
    dialect: 'sqlite',
    dbCredentials: {
      url: getD1SqlitePath(databaseId, config.persistDir),
    },
  } satisfies Config
}
