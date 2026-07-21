import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { getAccountIdFromEnv, getDatabaseIdFromEnv, getTokenFromEnv } from './env'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getAccountIdFromEnv', () => {
  it('returns the value of CLOUDFLARE_ACCOUNT_ID', () => {
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'env-account-id')
    expect(getAccountIdFromEnv()).toBe('env-account-id')
  })

  it('returns null when unset', () => {
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', undefined)
    expect(getAccountIdFromEnv()).toBeNull()
  })

  it('returns null when empty', () => {
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', '')
    expect(getAccountIdFromEnv()).toBeNull()
  })
})

describe('getDatabaseIdFromEnv', () => {
  it('returns the value of CLOUDFLARE_DATABASE_ID', () => {
    vi.stubEnv('CLOUDFLARE_DATABASE_ID', 'env-db-id')
    expect(getDatabaseIdFromEnv()).toBe('env-db-id')
  })

  it('returns null when unset', () => {
    vi.stubEnv('CLOUDFLARE_DATABASE_ID', undefined)
    expect(getDatabaseIdFromEnv()).toBeNull()
  })

  it('returns null when empty', () => {
    vi.stubEnv('CLOUDFLARE_DATABASE_ID', '')
    expect(getDatabaseIdFromEnv()).toBeNull()
  })
})

describe('getTokenFromEnv', () => {
  it('returns the value of CLOUDFLARE_API_TOKEN', () => {
    vi.stubEnv('CLOUDFLARE_D1_TOKEN', undefined)
    vi.stubEnv('CLOUDFLARE_API_TOKEN', 'env-token')
    expect(getTokenFromEnv()).toBe('env-token')
  })

  it('prefers CLOUDFLARE_D1_TOKEN over CLOUDFLARE_API_TOKEN', () => {
    vi.stubEnv('CLOUDFLARE_D1_TOKEN', 'd1-token')
    vi.stubEnv('CLOUDFLARE_API_TOKEN', 'api-token')
    expect(getTokenFromEnv()).toBe('d1-token')
  })

  it('returns null when both are unset', () => {
    vi.stubEnv('CLOUDFLARE_D1_TOKEN', undefined)
    vi.stubEnv('CLOUDFLARE_API_TOKEN', undefined)
    expect(getTokenFromEnv()).toBeNull()
  })

  it('returns null when both are empty', () => {
    vi.stubEnv('CLOUDFLARE_D1_TOKEN', '')
    vi.stubEnv('CLOUDFLARE_API_TOKEN', '')
    expect(getTokenFromEnv()).toBeNull()
  })
})
