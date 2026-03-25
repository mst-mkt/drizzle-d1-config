import { describe, expect, it, vi } from 'vite-plus/test'

import { getAccountIdFromCache, parseAccountConfig } from './account'
import { readFile } from './utils'

vi.mock('./utils', async (importOriginal) => {
  const original = await importOriginal<typeof import('./utils')>()
  return {
    ...original,
    readFile: vi.fn<(path: string) => string | null>(() => null),
  }
})

const mockedReadFile = vi.mocked(readFile)

describe('parseAccountConfig', () => {
  it('returns account id', () => {
    const content = JSON.stringify({
      account: { id: 'abc123', name: 'test' },
    })

    expect(parseAccountConfig(content)).toBe('abc123')
  })

  it('missing account -> null', () => {
    expect(parseAccountConfig('{}')).toBeNull()
  })

  it('account is string -> null', () => {
    expect(parseAccountConfig('{"account": "string"}')).toBeNull()
  })

  it('account is null -> null', () => {
    expect(parseAccountConfig('{"account": null}')).toBeNull()
  })

  it('account is array -> null', () => {
    expect(parseAccountConfig('{"account": [1, 2]}')).toBeNull()
  })

  it('missing account.id -> null', () => {
    const content = JSON.stringify({ account: { name: 'test' } })

    expect(parseAccountConfig(content)).toBeNull()
  })

  it('account.id not string -> null', () => {
    const content = JSON.stringify({ account: { id: 123 } })

    expect(parseAccountConfig(content)).toBeNull()
  })

  it('empty account.id -> null', () => {
    const content = JSON.stringify({ account: { id: '' } })

    expect(parseAccountConfig(content)).toBeNull()
  })

  it('invalid JSON -> null', () => {
    expect(parseAccountConfig('invalid')).toBeNull()
  })

  it('json null -> null', () => {
    expect(parseAccountConfig('null')).toBeNull()
  })

  it('json number -> null', () => {
    expect(parseAccountConfig('42')).toBeNull()
  })
})

describe('getAccountIdFromCache', () => {
  it('returns account id from cache file', () => {
    mockedReadFile.mockReturnValue(JSON.stringify({ account: { id: 'cached-acc-123' } }))

    expect(getAccountIdFromCache()).toBe('cached-acc-123')
  })

  it('returns null when cache file is missing', () => {
    mockedReadFile.mockReturnValue(null)

    expect(getAccountIdFromCache()).toBeNull()
  })

  it('returns null when cache file has invalid content', () => {
    mockedReadFile.mockReturnValue('not json')

    expect(getAccountIdFromCache()).toBeNull()
  })

  it('uses custom path when provided', () => {
    mockedReadFile.mockReturnValue(JSON.stringify({ account: { id: 'custom-acc' } }))

    getAccountIdFromCache('/custom/path.json')

    expect(mockedReadFile).toHaveBeenCalledWith('/custom/path.json')
  })
})
