import path from 'node:path'

import { describe, expect, it } from 'vite-plus/test'

import { computeD1Hash, getD1SqlitePath } from './d1-sqlite'

describe('computeD1Hash', () => {
  it('returns hex string', () => {
    const result = computeD1Hash('test-db-id')

    expect(result).toMatch(/^[0-9a-f]+$/)
  })

  it('same id -> same hash', () => {
    expect(computeD1Hash('my-db')).toBe(computeD1Hash('my-db'))
  })

  it('different ids -> different hashes', () => {
    expect(computeD1Hash('db-1')).not.toBe(computeD1Hash('db-2'))
  })

  it('produces miniflare-compatible hash', () => {
    expect(computeD1Hash('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')).toBe(
      '423c60534c20823e3775c6e1de8b0d6f1fb85ef14b525413932d985d8dc6abf5',
    )
  })
})

describe('getD1SqlitePath', () => {
  it('returns absolute path under default persist dir', () => {
    const result = getD1SqlitePath('test-db-id')

    expect(path.isAbsolute(result)).toBe(true)
    expect(result).toContain('.wrangler/state/v3/d1/miniflare-D1DatabaseObject/')
    expect(result).toMatch(/\.sqlite$/)
  })

  it('custom persistDir', () => {
    const result = getD1SqlitePath('test-db-id', './custom/state')

    expect(result).toContain('custom/state/d1/miniflare-D1DatabaseObject/')
    expect(result).not.toContain('.wrangler')
  })

  it('same id and persistDir -> same path', () => {
    const a = getD1SqlitePath('my-db', './state')
    const b = getD1SqlitePath('my-db', './state')

    expect(a).toBe(b)
  })

  it('different ids -> different paths', () => {
    const a = getD1SqlitePath('db-1')
    const b = getD1SqlitePath('db-2')

    expect(a).not.toBe(b)
  })
})
