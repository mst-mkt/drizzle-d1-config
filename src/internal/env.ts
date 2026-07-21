const getEnv = (key: string) => {
  const value = process.env[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Reads the Cloudflare account ID from the `CLOUDFLARE_ACCOUNT_ID` environment variable.
 *
 * @returns The account ID string, or `null` if unset or empty
 */
export const getAccountIdFromEnv = () => getEnv('CLOUDFLARE_ACCOUNT_ID')

/**
 * Reads the D1 database ID from the `CLOUDFLARE_DATABASE_ID` environment variable.
 *
 * @returns The database ID string, or `null` if unset or empty
 */
export const getDatabaseIdFromEnv = () => getEnv('CLOUDFLARE_DATABASE_ID')

/**
 * Reads the Cloudflare API token from the `CLOUDFLARE_D1_TOKEN` or `CLOUDFLARE_API_TOKEN`
 * environment variable, preferring the D1-scoped one.
 *
 * @returns The API token string, or `null` if both are unset or empty
 */
export const getTokenFromEnv = () => getEnv('CLOUDFLARE_D1_TOKEN') ?? getEnv('CLOUDFLARE_API_TOKEN')
