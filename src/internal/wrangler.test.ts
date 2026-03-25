import { describe, expect, it, vi } from 'vite-plus/test'

import { fileExists, readFile } from './utils'
import {
  getAccountId,
  getD1Binding,
  getDatabaseId,
  getMigrationsDir,
  getWranglerConfig,
  parseWranglerConfig,
} from './wrangler'

vi.mock('./utils', async (importOriginal) => {
  const original = await importOriginal<typeof import('./utils')>()
  return {
    ...original,
    readFile: vi.fn<(path: string) => string | null>(),
    fileExists: vi.fn<(path: string) => boolean>(() => false),
  }
})

const mockedReadFile = vi.mocked(readFile)
const mockedFileExists = vi.mocked(fileExists)

describe('parseWranglerConfig', () => {
  it('parses jsonc', () => {
    const content = `{
      // with comment
      "account_id": "abc123",
      "d1_databases": [
        { "binding": "DB", "database_id": "db-id-1" },
      ],
    }`

    const result = parseWranglerConfig(content, 'jsonc')

    expect(result).toEqual({
      account_id: 'abc123',
      d1_databases: [{ binding: 'DB', database_id: 'db-id-1' }],
    })
  })

  it('parses json', () => {
    const content = '{"account_id": "abc123"}'

    const result = parseWranglerConfig(content, 'json')

    expect(result).toEqual({ account_id: 'abc123' })
  })

  it('parses toml', () => {
    const content = `
account_id = "abc123"

[[d1_databases]]
binding = "DB"
database_id = "db-id-1"
`

    const result = parseWranglerConfig(content, 'toml')

    expect(result).toEqual({
      account_id: 'abc123',
      d1_databases: [{ binding: 'DB', database_id: 'db-id-1' }],
    })
  })

  it('preserves extra fields', () => {
    const content = '{"account_id": "abc123", "name": "my-worker"}'

    const result = parseWranglerConfig(content, 'json')

    expect(result).toEqual({ account_id: 'abc123', name: 'my-worker' })
  })

  it('unsupported extension -> null', () => {
    expect(parseWranglerConfig('{}', 'yaml')).toBeNull()
  })

  it('empty extension -> null', () => {
    expect(parseWranglerConfig('{}', '')).toBeNull()
  })

  it('invalid json -> null', () => {
    expect(parseWranglerConfig('not valid', 'json')).toBeNull()
  })

  it('invalid jsonc -> null', () => {
    expect(parseWranglerConfig('{invalid', 'jsonc')).toBeNull()
  })

  it('invalid toml -> null', () => {
    expect(parseWranglerConfig('= invalid', 'toml')).toBeNull()
  })

  it('json string primitive -> null', () => {
    expect(parseWranglerConfig('"just a string"', 'json')).toBeNull()
  })

  it('json number primitive -> null', () => {
    expect(parseWranglerConfig('42', 'json')).toBeNull()
  })

  it('json null -> null', () => {
    expect(parseWranglerConfig('null', 'json')).toBeNull()
  })

  it('json array -> null', () => {
    expect(parseWranglerConfig('[1, 2, 3]', 'json')).toBeNull()
  })
})

describe('getAccountId', () => {
  it('valid string -> returns value', () => {
    expect(getAccountId({ account_id: 'abc123' })).toBe('abc123')
  })

  it('missing -> null', () => {
    expect(getAccountId({})).toBeNull()
  })

  it('number -> null', () => {
    expect(getAccountId({ account_id: 123 })).toBeNull()
  })

  it('empty string -> null', () => {
    expect(getAccountId({ account_id: '' })).toBeNull()
  })
})

describe('getD1Binding', () => {
  it('returns matching binding', () => {
    const config = {
      d1_databases: [
        { binding: 'DB', database_id: 'db-1' },
        { binding: 'OTHER', database_id: 'db-2' },
      ],
    }

    expect(getD1Binding(config, 'DB')).toEqual({ binding: 'DB', database_id: 'db-1' })
  })

  it('multiple matches -> returns first', () => {
    const config = {
      d1_databases: [
        { binding: 'DB', database_id: 'first' },
        { binding: 'DB', database_id: 'second' },
      ],
    }

    expect(getD1Binding(config, 'DB')).toEqual({ binding: 'DB', database_id: 'first' })
  })

  it('case-sensitive matching', () => {
    const config = {
      d1_databases: [{ binding: 'DB', database_id: 'db-1' }],
    }

    expect(getD1Binding(config, 'db')).toBeNull()
  })

  it('no match -> null', () => {
    const config = {
      d1_databases: [{ binding: 'OTHER', database_id: 'db-1' }],
    }

    expect(getD1Binding(config, 'DB')).toBeNull()
  })

  it('missing d1_databases -> null', () => {
    expect(getD1Binding({}, 'DB')).toBeNull()
  })

  it('d1_databases not array -> null', () => {
    expect(getD1Binding({ d1_databases: 'invalid' }, 'DB')).toBeNull()
  })

  it('empty d1_databases -> null', () => {
    expect(getD1Binding({ d1_databases: [] }, 'DB')).toBeNull()
  })

  it('non-object entries -> skipped', () => {
    const config = {
      d1_databases: [null, 42, 'string', undefined],
    }

    expect(getD1Binding(config, 'DB')).toBeNull()
  })

  it('entry without binding property -> skipped', () => {
    const config = {
      d1_databases: [{ database_id: 'db-1' }],
    }

    expect(getD1Binding(config, 'DB')).toBeNull()
  })

  it('no binding + single entry -> returns it', () => {
    const config = {
      d1_databases: [{ binding: 'DB', database_id: 'db-1' }],
    }

    expect(getD1Binding(config)).toEqual({ binding: 'DB', database_id: 'db-1' })
  })

  it('no binding + multiple entries -> throws with binding names', () => {
    const config = {
      d1_databases: [
        { binding: 'DB', database_id: 'db-1' },
        { binding: 'OTHER', database_id: 'db-2' },
      ],
    }

    expect(() => getD1Binding(config)).toThrow('Multiple D1 databases found')
    expect(() => getD1Binding(config)).toThrow('DB, OTHER')
  })

  it('no binding + empty -> null', () => {
    expect(getD1Binding({ d1_databases: [] })).toBeNull()
  })

  it('no binding + non-record entries filtered out -> single valid entry', () => {
    const config = {
      d1_databases: [null, { binding: 'DB', database_id: 'db-1' }, 42],
    }

    expect(getD1Binding(config)).toEqual({ binding: 'DB', database_id: 'db-1' })
  })
})

describe('getDatabaseId', () => {
  it('valid string -> returns value', () => {
    expect(getDatabaseId({ database_id: 'db-id-1' })).toBe('db-id-1')
  })

  it('empty string -> null', () => {
    expect(getDatabaseId({ database_id: '' })).toBeNull()
  })

  it('missing -> null', () => {
    expect(getDatabaseId({})).toBeNull()
  })

  it('number -> null', () => {
    expect(getDatabaseId({ database_id: 123 })).toBeNull()
  })
})

describe('getMigrationsDir', () => {
  it('valid string -> returns value', () => {
    expect(getMigrationsDir({ migrations_dir: './migrations' })).toBe('./migrations')
  })

  it('empty string -> null', () => {
    expect(getMigrationsDir({ migrations_dir: '' })).toBeNull()
  })

  it('missing -> null', () => {
    expect(getMigrationsDir({})).toBeNull()
  })

  it('number -> null', () => {
    expect(getMigrationsDir({ migrations_dir: 123 })).toBeNull()
  })

  it('boolean -> null', () => {
    expect(getMigrationsDir({ migrations_dir: true })).toBeNull()
  })
})

describe('getWranglerConfig', () => {
  it('extracts all fields from jsonc config', () => {
    mockedReadFile.mockReturnValue(
      JSON.stringify({
        account_id: 'acc-123',
        d1_databases: [{ binding: 'DB', database_id: 'db-456', migrations_dir: './migrations' }],
      }),
    )

    const result = getWranglerConfig('DB', 'wrangler.jsonc')

    expect(result).toEqual({
      accountId: 'acc-123',
      databaseId: 'db-456',
      migrationsDir: './migrations',
    })
  })

  it('returns null fields when config file not found', () => {
    mockedReadFile.mockReturnValue(null)
    mockedFileExists.mockReturnValue(false)

    const result = getWranglerConfig()

    expect(result).toEqual({ accountId: null, databaseId: null, migrationsDir: null })
  })

  it('returns null databaseId when binding not matched', () => {
    mockedReadFile.mockReturnValue(
      JSON.stringify({
        account_id: 'acc-123',
        d1_databases: [{ binding: 'OTHER', database_id: 'db-456' }],
      }),
    )

    const result = getWranglerConfig('DB', 'wrangler.json')

    expect(result).toEqual({ accountId: 'acc-123', databaseId: null, migrationsDir: null })
  })

  it('auto-detects config path', () => {
    mockedFileExists.mockImplementation(
      (p: unknown) => typeof p === 'string' && p === './wrangler.toml',
    )
    mockedReadFile.mockReturnValue(
      'account_id = "acc-789"\n\n[[d1_databases]]\nbinding = "DB"\ndatabase_id = "db-012"\n',
    )

    const result = getWranglerConfig('DB')

    expect(result).toEqual({ accountId: 'acc-789', databaseId: 'db-012', migrationsDir: null })
  })
})
