import { fileExists, isRecord, readFile } from './utils'

export const parsePackageManager = (packageManagerField: string) => {
  const name = packageManagerField.split('@').at(0)
  return typeof name === 'string' && name.length > 0 ? name : null
}

const LOCKFILE_TO_PM = {
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
  'bun.lockb': 'bun',
  'bun.lock': 'bun',
  'package-lock.json': 'npm',
} satisfies Record<string, string>

const detectFromLockfile = () => {
  const entry = Object.entries(LOCKFILE_TO_PM).find(([lockfile]) => fileExists(lockfile))
  return entry?.at(1) ?? null
}

const detectFromPackageJson = () => {
  const content = readFile('./package.json')
  if (content === null) return null

  try {
    const parsed = JSON.parse(content)

    if (!isRecord(parsed)) return null
    if (typeof parsed.packageManager !== 'string') return null

    return parsePackageManager(parsed.packageManager)
  } catch {
    return null
  }
}

/**
 * Detects the package manager by checking `packageManager` field in `package.json`,
 * then falling back to lockfile detection. Returns `null` if neither is found.
 */
export const detectPackageManager = () => {
  return detectFromPackageJson() ?? detectFromLockfile()
}
