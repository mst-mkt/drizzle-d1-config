import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fileExists, isRecord } from './utils'

const MISSING_PACKAGE_EXIT = 2

const resolveScriptPath = () => {
  const here = fileURLToPath(import.meta.url)
  const dir = path.dirname(here)
  const ext = path.extname(here)
  const name = `load-typescript-config${ext}`

  return ext === '.mjs'
    ? path.join(dir, name) // bundled, so the script sits alongside
    : path.join(dir, '..', name) // unbundled, so it stays one level up
}

/**
 * Evaluates a `cloudflare.config.ts` file into the classic wrangler config shape.
 *
 * The evaluation runs in a child process, so this function can stay synchronous.
 * It has to be: drizzle-kit 0.x never awaits the value a config file exports.
 *
 * @param configPath - Path to the `cloudflare.config.ts` file
 * @param mode - The `ctx.mode` passed to function-form configs. Defaults to the `CLOUDFLARE_ENV` env var.
 * @throws If `@cloudflare/config` is not installed, or the config is invalid
 */
export const loadTypeScriptConfig = (configPath: string, mode?: string) => {
  const scriptPath = resolveScriptPath()
  if (!fileExists(scriptPath)) {
    const message = [
      `Missing script at \`${scriptPath}\`.`,
      'This is a bug in drizzle-d1-config.',
      'Please report it at https://github.com/mst-mkt/drizzle-d1-config/issues/new',
    ].join('\n')
    throw new Error(message)
  }

  const resolvedMode = mode ?? process.env.CLOUDFLARE_ENV
  const args = [scriptPath, path.resolve(configPath), ...(resolvedMode ? [resolvedMode] : [])]

  // Drop NODE_OPTIONS so that no module loader is inherited.
  const { NODE_OPTIONS: _, ...env } = process.env

  const { status, output } = spawnSync(process.execPath, args, {
    stdio: ['ignore', 'inherit', 'inherit', 'pipe'],
    encoding: 'utf-8',
    env,
  })

  if (status === MISSING_PACKAGE_EXIT) {
    throw new Error(
      `\`@cloudflare/config\` is required to read \`${configPath}\`. Install it with your package manager.`,
    )
  }

  const payload = output.at(3)
  if (status !== 0 || typeof payload !== 'string') {
    throw new Error(`Failed to load \`${configPath}\`.`)
  }

  const config = JSON.parse(payload)
  return isRecord(config) ? config : {}
}
