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
  mockedGetTokenFromCli.mockClear()
  mockedGetTokenFromCli.mockReturnValue('mocked-cli-token')
  vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', undefined)
  vi.stubEnv('CLOUDFLARE_DATABASE_ID', undefined)
  vi.stubEnv('CLOUDFLARE_D1_TOKEN', undefined)
  vi.stubEnv('CLOUDFLARE_API_TOKEN', undefined)
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true })
  vi.unstubAllEnvs()
})

const writeWranglerConfig = (config: Record<string, unknown>) => {
  const filePath = path.join(tmpDir, 'wrangler.jsonc')
  fs.writeFileSync(filePath, JSON.stringify(config))
  return filePath
}

const writeCloudflareConfig = (content: string) => {
  const filePath = path.join(tmpDir, 'cloudflare.config.ts')
  fs.writeFileSync(filePath, content)
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

  it('resolves values from environment variables', () => {
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'env-acc')
    vi.stubEnv('CLOUDFLARE_DATABASE_ID', 'env-db')
    vi.stubEnv('CLOUDFLARE_API_TOKEN', 'env-token')

    const result = d1Config({ out: './out' })

    expect(result.dbCredentials).toEqual({
      accountId: 'env-acc',
      databaseId: 'env-db',
      token: 'env-token',
    })
  })

  it('environment variables take priority over wrangler config', () => {
    const configPath = writeWranglerConfig({
      account_id: 'wrangler-acc',
      d1_databases: [{ binding: 'DB', database_id: 'wrangler-db' }],
    })
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'env-acc')
    vi.stubEnv('CLOUDFLARE_DATABASE_ID', 'env-db')

    const result = d1Config({ wranglerConfigPath: configPath, token: 'tok' })

    expect(result.dbCredentials.accountId).toBe('env-acc')
    expect(result.dbCredentials.databaseId).toBe('env-db')
  })

  it('explicit values take priority over environment variables', () => {
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'env-acc')
    vi.stubEnv('CLOUDFLARE_DATABASE_ID', 'env-db')
    vi.stubEnv('CLOUDFLARE_API_TOKEN', 'env-token')

    const result = d1Config({
      accountId: 'explicit-acc',
      databaseId: 'explicit-db',
      token: 'explicit-token',
      out: './out',
    })

    expect(result.dbCredentials).toEqual({
      accountId: 'explicit-acc',
      databaseId: 'explicit-db',
      token: 'explicit-token',
    })
  })

  it('does not read wrangler config when args and env provide all values', () => {
    // Reading this config without `binding` would throw a multiple-databases error
    const configPath = writeWranglerConfig({
      d1_databases: [
        { binding: 'PRIMARY', database_id: 'primary-db' },
        { binding: 'SECONDARY', database_id: 'secondary-db' },
      ],
    })
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'env-acc')
    vi.stubEnv('CLOUDFLARE_DATABASE_ID', 'env-db')
    vi.stubEnv('CLOUDFLARE_API_TOKEN', 'env-token')

    const result = d1Config({ wranglerConfigPath: configPath, out: './out' })

    expect(result.dbCredentials.databaseId).toBe('env-db')
  })

  it('environment variable token takes priority over CLI token', () => {
    vi.stubEnv('CLOUDFLARE_API_TOKEN', 'env-token')

    const result = d1Config({ accountId: 'acc', databaseId: 'db', out: './out' })

    expect(result.dbCredentials.token).toBe('env-token')
    expect(mockedGetTokenFromCli).not.toHaveBeenCalled()
  })

  it('resolves values from cloudflare.config.ts', () => {
    const configPath = writeCloudflareConfig(`
      export const settings = { type: 'settings', accountId: 'acc-from-ts' }
      export default {
        type: 'worker',
        name: 'my-worker',
        compatibilityDate: '2026-01-01',
        env: { DB: { type: 'd1', id: 'db-from-ts' } },
      }
    `)

    const result = d1Config({ wranglerConfigPath: configPath })

    expect(result).toEqual({
      out: undefined,
      dialect: 'sqlite',
      driver: 'd1-http',
      dbCredentials: {
        accountId: 'acc-from-ts',
        databaseId: 'db-from-ts',
        token: 'mocked-cli-token',
      },
    })
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
