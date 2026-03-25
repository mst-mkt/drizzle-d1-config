import path from 'node:path'

import * as jsonc from '@std/jsonc'
import * as toml from '@std/toml'

import { fileExists, isRecord, readFile } from './utils'

const DEFAULT_CONFIG_PATHS = ['./wrangler.jsonc', './wrangler.toml', './wrangler.json']

const parsers = {
  jsonc: jsonc.parse,
  toml: toml.parse,
  json: JSON.parse,
} satisfies Record<string, (content: string) => unknown>

const isSupportedConfigExt = (ext: string): ext is keyof typeof parsers => {
  return ext in parsers
}

const findConfigPath = () => {
  return DEFAULT_CONFIG_PATHS.find((p) => fileExists(p))
}

const getExtName = (filePath: string) => {
  return path.extname(filePath).slice(1)
}

export const parseWranglerConfig = (content: string, ext: string) => {
  if (!isSupportedConfigExt(ext)) return null

  try {
    const config = parsers[ext](content)
    if (!isRecord(config)) return null
    return config
  } catch {
    return null
  }
}

export const getAccountId = (config: Record<string, unknown>) => {
  const { account_id } = config
  return typeof account_id === 'string' && account_id.length > 0 ? account_id : null
}

export const getD1Binding = (config: Record<string, unknown>, binding?: string) => {
  const { d1_databases } = config
  if (!Array.isArray(d1_databases)) return null

  if (binding === undefined) {
    const records = d1_databases.filter(isRecord)

    if (records.length > 1) {
      const bindings = records.map((r) => r.binding).filter((b) => typeof b === 'string')
      throw new Error(
        `Multiple D1 databases found. Specify a \`binding\` option (available: ${bindings.join(', ')}).`,
      )
    }

    return records.at(0) ?? null
  }

  const d1Config = d1_databases.find((db: unknown) => {
    if (!isRecord(db)) return false
    return db.binding === binding
  })
  if (!isRecord(d1Config)) return null

  return d1Config
}

export const getDatabaseId = (d1Config: Record<string, unknown>) => {
  const { database_id } = d1Config
  return typeof database_id === 'string' && database_id.length > 0 ? database_id : null
}

export const getMigrationsDir = (d1Config: Record<string, unknown>) => {
  const { migrations_dir } = d1Config
  return typeof migrations_dir === 'string' && migrations_dir.length > 0 ? migrations_dir : null
}

const NULL_CONFIG = { accountId: null, databaseId: null, migrationsDir: null }

/**
 * Reads and parses a wrangler config file to extract D1-related settings.
 * Automatically searches for `wrangler.jsonc`, `wrangler.toml`, or `wrangler.json` if no path is provided.
 *
 * @param d1Binding - The D1 binding name to look up in `d1_databases` (e.g. `"DB"`). If omitted and there is exactly one D1 database, it is used automatically.
 * @param wranglerConfigPath - Optional explicit path to the wrangler config file
 * @returns An object with `accountId`, `databaseId`, and `migrationsDir` (each `string | null`)
 * @throws If multiple D1 databases are found and `d1Binding` is not specified
 */
export const getWranglerConfig = (d1Binding?: string, wranglerConfigPath?: string) => {
  const configPath = wranglerConfigPath ?? findConfigPath()
  if (configPath === undefined) return NULL_CONFIG

  const content = readFile(configPath)
  if (content === null) return NULL_CONFIG

  const ext = getExtName(configPath)
  const config = parseWranglerConfig(content, ext)
  if (config === null) return NULL_CONFIG

  const d1Config = getD1Binding(config, d1Binding)

  return {
    accountId: getAccountId(config),
    databaseId: d1Config ? getDatabaseId(d1Config) : null,
    migrationsDir: d1Config ? getMigrationsDir(d1Config) : null,
  }
}
