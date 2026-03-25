import path from 'node:path'

import { isRecord, readFile } from './utils'

const DEFAULT_ACCOUNT_PATH = path.resolve(
  process.cwd(),
  'node_modules/.cache/wrangler/wrangler-account.json',
)

export const parseAccountConfig = (content: string) => {
  try {
    const config = JSON.parse(content)

    if (!isRecord(config)) return null
    if (!isRecord(config.account)) return null

    const { id } = config.account
    const isValidId = typeof id === 'string' && id.length > 0

    return isValidId ? id : null
  } catch {
    return null
  }
}

/**
 * Reads the wrangler account cache file and extracts the account ID.
 *
 * @param path - Path to the cache file (defaults to `./node_modules/.cache/wrangler/wrangler-account.json`)
 * @returns The account ID string, or `null` if the file is missing or invalid
 */
export const getAccountIdFromCache = (path = DEFAULT_ACCOUNT_PATH) => {
  const content = readFile(path)
  if (content === null) return null
  return parseAccountConfig(content)
}
