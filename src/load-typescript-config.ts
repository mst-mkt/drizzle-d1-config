import fs from 'node:fs'

const [configPath, mode] = process.argv.slice(2)

if (configPath === undefined) {
  process.stderr.write('Usage: load-typescript-config <config-path> [mode]\n')
  process.exit(1)
}

const api = await import('@cloudflare/config').catch(() => null)
if (api === null) process.exit(2)

const { result } = await api.loadAndValidateConfig(
  configPath,
  { mode },
  { include: ['default', 'settings'] },
)
if (!result.success) {
  const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
  process.stderr.write(`Invalid \`${configPath}\`:\n${issues.join('\n')}\n`)
  process.exit(1)
}

const { default: worker, settings } = result.data
if (worker?.type !== 'worker') {
  process.stderr.write(`\`${configPath}\` must have a default worker export.\n`)
  process.exit(1)
}

const config = api.convertToWranglerConfig(
  worker,
  settings?.type === 'settings' ? settings : undefined,
)

// fd 3 rather than stdout, which the config itself may write to.
fs.writeSync(3, JSON.stringify(config))
