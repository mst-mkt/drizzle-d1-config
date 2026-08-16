import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { loadTypeScriptConfig } from './typescript-config'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drizzle-d1-typescript-config-'))
  vi.stubEnv('CLOUDFLARE_ENV', undefined)
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true })
  vi.unstubAllEnvs()
})

const writeConfig = (content: string) => {
  const filePath = path.join(tmpDir, 'cloudflare.config.ts')
  fs.writeFileSync(filePath, content)
  return filePath
}

const authoringApiUrl = import.meta.resolve('@cloudflare/config/public')

describe('loadTypeScriptConfig', () => {
  it('reads a config written with the authoring API', () => {
    fs.writeFileSync(path.join(tmpDir, 'entry.ts'), "throw new Error('entrypoint executed')")
    const configPath = writeConfig(`
      import { bindings, defineSettings, defineWorker } from '${authoringApiUrl}'
      import * as entrypoint from './entry.ts' with { type: 'cf-worker' }

      export const settings = defineSettings({ accountId: 'acc-123' })
      export default defineWorker({
        name: 'my-worker',
        entrypoint,
        compatibilityDate: '2026-01-01',
        env: { DB: bindings.d1({ id: 'db-456', name: 'my-db' }) },
      })
    `)

    const result = loadTypeScriptConfig(configPath)

    expect(result.account_id).toBe('acc-123')
    expect(result.d1_databases).toEqual([
      { binding: 'DB', database_id: 'db-456', database_name: 'my-db' },
    ])
  })

  it('passes mode to a function-form config, and nothing when omitted', () => {
    const configPath = writeConfig(`
      export default (ctx: { mode: string | undefined }) => ({
        type: 'worker',
        name: 'my-worker',
        compatibilityDate: '2026-01-01',
        env: { DB: { type: 'd1', id: \`db-\${ctx.mode ?? 'none'}\` } },
      })
    `)

    expect(loadTypeScriptConfig(configPath, 'staging').d1_databases).toEqual([
      { binding: 'DB', database_id: 'db-staging' },
    ])
    expect(loadTypeScriptConfig(configPath).d1_databases).toEqual([
      { binding: 'DB', database_id: 'db-none' },
    ])
  })

  it('falls back to CLOUDFLARE_ENV for mode', () => {
    vi.stubEnv('CLOUDFLARE_ENV', 'production')
    const configPath = writeConfig(`
      export default (ctx: { mode: string | undefined }) => ({
        type: 'worker',
        name: 'my-worker',
        compatibilityDate: '2026-01-01',
        env: { DB: { type: 'd1', id: \`db-\${ctx.mode}\` } },
      })
    `)

    expect(loadTypeScriptConfig(configPath).d1_databases).toEqual([
      { binding: 'DB', database_id: 'db-production' },
    ])
  })

  it('is not corrupted by output the config writes to stdout', () => {
    const configPath = writeConfig(`
      console.log('not JSON, written by the config itself')
      export default {
        type: 'worker',
        name: 'my-worker',
        compatibilityDate: '2026-01-01',
        env: { DB: { type: 'd1', id: 'db-789' } },
      }
    `)

    expect(loadTypeScriptConfig(configPath).d1_databases).toEqual([
      { binding: 'DB', database_id: 'db-789' },
    ])
  })

  it('throws when the config cannot be read', () => {
    const configPath = writeConfig('export default {')

    expect(() => loadTypeScriptConfig(configPath)).toThrow('Failed to load')
  })
})
