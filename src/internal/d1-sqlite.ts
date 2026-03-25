import { createHash, createHmac } from 'node:crypto'
import path from 'node:path'

const D1_SERVICE_UNIQUE_KEY = 'miniflare-D1DatabaseObject'
const DEFAULT_PERSIST_DIR = '.wrangler/state/v3'

// ref: https://github.com/cloudflare/workers-sdk/blob/5ededb5d52f4362ce8f72d442ba825d48dcabbf8/packages/miniflare/src/plugins/shared/index.ts#L275-L289
export const computeD1Hash = (databaseId: string) => {
  const key = createHash('sha256').update(D1_SERVICE_UNIQUE_KEY).digest()
  const idHmac = createHmac('sha256', key).update(databaseId).digest().subarray(0, 16)
  const hmac = createHmac('sha256', key).update(idHmac).digest().subarray(0, 16)
  return Buffer.concat([idHmac, hmac]).toString('hex')
}

export const getD1SqlitePath = (databaseId: string, persistDir?: string) => {
  const dir = persistDir ?? DEFAULT_PERSIST_DIR
  const hash = computeD1Hash(databaseId)

  return path.resolve(process.cwd(), dir, 'd1', D1_SERVICE_UNIQUE_KEY, `${hash}.sqlite`)
}
