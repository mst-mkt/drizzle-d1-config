import { execFileSync } from 'node:child_process'

import { detectPackageManager } from './package-manager'
import { isRecord } from './utils'

type ExecConfig = {
  bin: string
  extraArgs?: string[]
}

const EXEC_CONFIGS: Record<string, ExecConfig> = {
  npm: { bin: 'npx', extraArgs: ['--no'] },
  pnpm: { bin: 'pnpm' },
  yarn: { bin: 'yarn' },
  bun: { bin: 'bun' },
}

const WRANGLER_ARGS = ['wrangler', 'auth', 'token', '--json']

const execWranglerToken = (bin: string, extraArgs: string[] = []) => {
  try {
    return execFileSync(bin, [...extraArgs, ...WRANGLER_ARGS], {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })
  } catch {
    return null
  }
}

export const parseTokenOutput = (output: string) => {
  try {
    const parsed = JSON.parse(output)

    if (!isRecord(parsed)) return null

    const { token } = parsed
    const isValidToken = typeof token === 'string' && token.length > 0

    return isValidToken ? token : null
  } catch {
    return null
  }
}

/**
 * Retrieves the Cloudflare API token by running `wrangler auth token --json`.
 * Falls back to `null` if wrangler is not installed or not authenticated.
 *
 * @returns The API token string, or `null` if unavailable
 */
export const getTokenFromCli = () => {
  const pm = detectPackageManager()
  if (pm === null) return null

  const config = EXEC_CONFIGS[pm] ?? { bin: pm }
  const output = execWranglerToken(config.bin, config.extraArgs)
  if (output === null) return null

  return parseTokenOutput(output)
}
