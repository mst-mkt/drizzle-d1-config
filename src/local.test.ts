import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'

import { computeD1Hash } from './internal/d1-sqlite'
import { d1Config } from './local'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drizzle-d1-local-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true })
})

const writeWranglerConfig = (config: Record<string, unknown>) => {
  const filePath = path.join(tmpDir, 'wrangler.jsonc')
  fs.writeFileSync(filePath, JSON.stringify(config))
  return filePath
}

describe('d1Config (local)', () => {
  it('resolves databaseId and migrationsDir from wrangler config', () => {
    const configPath = writeWranglerConfig({
      d1_databases: [{ binding: 'DB', database_id: 'test-db-id', migrations_dir: './migrations' }],
    })

    const result = d1Config({ wranglerConfigPath: configPath })

    expect(result.dialect).toBe('sqlite')
    expect(result.out).toBe('./migrations')
    expect(result.dbCredentials.url).toContain(computeD1Hash('test-db-id'))
    expect(result.dbCredentials.url).toMatch(/\.sqlite$/)
  })

  it('explicit values take priority over wrangler config', () => {
    const configPath = writeWranglerConfig({
      d1_databases: [
        { binding: 'DB', database_id: 'wrangler-db', migrations_dir: './wrangler-out' },
      ],
    })

    const result = d1Config({
      wranglerConfigPath: configPath,
      databaseId: 'explicit-db',
      out: './explicit-out',
    })

    expect(result.out).toBe('./explicit-out')
    expect(result.dbCredentials.url).toContain(computeD1Hash('explicit-db'))
    expect(result.dbCredentials.url).not.toContain(computeD1Hash('wrangler-db'))
  })

  it('custom persistDir is used in sqlite path', () => {
    const configPath = writeWranglerConfig({
      d1_databases: [{ binding: 'DB', database_id: 'db-1' }],
    })

    const result = d1Config({
      wranglerConfigPath: configPath,
      persistDir: './custom/state',
    })

    expect(result.dbCredentials.url).toContain('custom/state')
    expect(result.dbCredentials.url).not.toContain('.wrangler')
  })

  it('selects binding by name when multiple d1_databases exist', () => {
    const configPath = writeWranglerConfig({
      d1_databases: [
        { binding: 'PRIMARY', database_id: 'primary-db' },
        { binding: 'SECONDARY', database_id: 'secondary-db' },
      ],
    })

    const result = d1Config({
      wranglerConfigPath: configPath,
      binding: 'SECONDARY',
    })

    expect(result.dbCredentials.url).toContain(computeD1Hash('secondary-db'))
  })

  it('throws when databaseId cannot be resolved', () => {
    const configPath = writeWranglerConfig({})

    expect(() => d1Config({ wranglerConfigPath: configPath })).toThrow('databaseId is required')
  })

  it('out is undefined when migrationsDir is not in wrangler config', () => {
    const configPath = writeWranglerConfig({
      d1_databases: [{ binding: 'DB', database_id: 'db-1' }],
    })

    const result = d1Config({ wranglerConfigPath: configPath })

    expect(result.out).toBeUndefined()
  })
})
