import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { d1Config } from './http'
import { getTokenFromCli } from './internal/cli'

vi.mock('./internal/cli', () => ({
  getTokenFromCli: vi.fn(() => 'mocked-cli-token'),
}))

const mockedGetTokenFromCli = vi.mocked(getTokenFromCli)

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drizzle-d1-http-'))
  mockedGetTokenFromCli.mockReturnValue('mocked-cli-token')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true })
})

const writeWranglerConfig = (config: Record<string, unknown>) => {
  const filePath = path.join(tmpDir, 'wrangler.jsonc')
  fs.writeFileSync(filePath, JSON.stringify(config))
  return filePath
}

describe('d1Config (http)', () => {
  it('resolves values from wrangler config with CLI token fallback', () => {
    const configPath = writeWranglerConfig({
      account_id: 'acc-from-wrangler',
      d1_databases: [
        { binding: 'DB', database_id: 'db-from-wrangler', migrations_dir: './migrations' },
      ],
    })

    const result = d1Config({ wranglerConfigPath: configPath })

    expect(result).toEqual({
      out: './migrations',
      dialect: 'sqlite',
      driver: 'd1-http',
      dbCredentials: {
        accountId: 'acc-from-wrangler',
        databaseId: 'db-from-wrangler',
        token: 'mocked-cli-token',
      },
    })
  })

  it('explicit values take priority over wrangler config', () => {
    const configPath = writeWranglerConfig({
      account_id: 'wrangler-acc',
      d1_databases: [
        { binding: 'DB', database_id: 'wrangler-db', migrations_dir: './wrangler-out' },
      ],
    })

    const result = d1Config({
      wranglerConfigPath: configPath,
      accountId: 'explicit-acc',
      databaseId: 'explicit-db',
      token: 'explicit-token',
      out: './explicit-out',
    })

    expect(result).toEqual({
      out: './explicit-out',
      dialect: 'sqlite',
      driver: 'd1-http',
      dbCredentials: {
        accountId: 'explicit-acc',
        databaseId: 'explicit-db',
        token: 'explicit-token',
      },
    })
  })

  it('selects binding by name', () => {
    const configPath = writeWranglerConfig({
      account_id: 'acc-1',
      d1_databases: [
        { binding: 'PRIMARY', database_id: 'primary-db' },
        { binding: 'ANALYTICS', database_id: 'analytics-db' },
      ],
    })

    const result = d1Config({
      wranglerConfigPath: configPath,
      binding: 'ANALYTICS',
      token: 'tok',
    })

    expect(result.dbCredentials.databaseId).toBe('analytics-db')
  })

  it('throws when accountId cannot be resolved', () => {
    const configPath = writeWranglerConfig({
      d1_databases: [{ binding: 'DB', database_id: 'db-1' }],
    })

    expect(() => d1Config({ wranglerConfigPath: configPath })).toThrow('accountId is required')
  })

  it('throws when databaseId cannot be resolved', () => {
    const configPath = writeWranglerConfig({ account_id: 'acc-1' })

    expect(() => d1Config({ wranglerConfigPath: configPath, token: 'tok' })).toThrow(
      'databaseId is required',
    )
  })

  it('throws when token cannot be resolved', () => {
    mockedGetTokenFromCli.mockReturnValueOnce(null)

    expect(() =>
      d1Config({
        accountId: 'acc',
        databaseId: 'db',
        out: './out',
      }),
    ).toThrow('token is required')
  })
})
