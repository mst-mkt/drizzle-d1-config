import { describe, expect, it, vi } from 'vite-plus/test'

import { parsePackageManager, detectPackageManager } from './package-manager'
import { fileExists, readFile } from './utils'

vi.mock('./utils', async (importOriginal) => {
  const original = await importOriginal<typeof import('./utils')>()
  return {
    ...original,
    readFile: vi.fn<(path: string) => string | null>(() => null),
    fileExists: vi.fn<(path: string) => boolean>(() => false),
  }
})

const mockedReadFile = vi.mocked(readFile)
const mockedFileExists = vi.mocked(fileExists)

describe('parsePackageManager', () => {
  it('name with version -> returns name', () => {
    expect(parsePackageManager('pnpm@10.33.0')).toBe('pnpm')
  })

  it('name without version -> returns name', () => {
    expect(parsePackageManager('pnpm')).toBe('pnpm')
  })

  it('yarn with version -> returns yarn', () => {
    expect(parsePackageManager('yarn@4.0.0')).toBe('yarn')
  })

  it('npm with version -> returns npm', () => {
    expect(parsePackageManager('npm@10.0.0')).toBe('npm')
  })

  it('bun with version -> returns bun', () => {
    expect(parsePackageManager('bun@1.0.0')).toBe('bun')
  })

  it('empty string -> null', () => {
    expect(parsePackageManager('')).toBeNull()
  })

  it('starts with @ -> null', () => {
    expect(parsePackageManager('@1.0.0')).toBeNull()
  })
})

describe('detectPackageManager', () => {
  it('detects from packageManager field in package.json', () => {
    mockedReadFile.mockReturnValue(JSON.stringify({ packageManager: 'pnpm@10.0.0' }))

    expect(detectPackageManager()).toBe('pnpm')
  })

  it('falls back to lockfile when package.json has no packageManager', () => {
    mockedReadFile.mockReturnValue(JSON.stringify({}))
    mockedFileExists.mockImplementation(
      (p: unknown) => typeof p === 'string' && p === 'pnpm-lock.yaml',
    )

    expect(detectPackageManager()).toBe('pnpm')
  })

  it('falls back to lockfile when package.json is missing', () => {
    mockedReadFile.mockReturnValue(null)
    mockedFileExists.mockImplementation((p: unknown) => typeof p === 'string' && p === 'yarn.lock')

    expect(detectPackageManager()).toBe('yarn')
  })

  it('detects bun from bun.lockb', () => {
    mockedReadFile.mockReturnValue(null)
    mockedFileExists.mockImplementation((p: unknown) => typeof p === 'string' && p === 'bun.lockb')

    expect(detectPackageManager()).toBe('bun')
  })

  it('detects npm from package-lock.json', () => {
    mockedReadFile.mockReturnValue(null)
    mockedFileExists.mockImplementation(
      (p: unknown) => typeof p === 'string' && p === 'package-lock.json',
    )

    expect(detectPackageManager()).toBe('npm')
  })

  it('returns null when nothing is found', () => {
    mockedReadFile.mockReturnValue(null)
    mockedFileExists.mockReturnValue(false)

    expect(detectPackageManager()).toBeNull()
  })

  it('packageManager field takes priority over lockfile', () => {
    mockedReadFile.mockReturnValue(JSON.stringify({ packageManager: 'yarn@4.0.0' }))
    mockedFileExists.mockImplementation(
      (p: unknown) => typeof p === 'string' && p === 'pnpm-lock.yaml',
    )

    expect(detectPackageManager()).toBe('yarn')
  })

  it('invalid package.json -> falls back to lockfile', () => {
    mockedReadFile.mockReturnValue('not json')
    mockedFileExists.mockImplementation((p: unknown) => typeof p === 'string' && p === 'bun.lock')

    expect(detectPackageManager()).toBe('bun')
  })
})
