# drizzle-d1-config

A helper for easily configuring `drizzle.config.ts` when using Cloudflare D1.
Automatically resolves the necessary settings from `wrangler.jsonc` and other sources.

<div align="right">

[Japanese >](./README.ja.md)

</div>

## Install

```bash
pnpm add drizzle-d1-config
```

## Usage

### HTTP (Remote)

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'
import { d1Config } from 'drizzle-d1-config/http'

export default defineConfig({
  ...d1Config(),
  schema: './src/db/schema.ts',
})
```

This generates a config like the following.

```typescript
{
  out: migrationsDir,
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId,
    databaseId,
    token,
  },
}
```

### Local

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'
import { d1Config } from 'drizzle-d1-config/local'

export default defineConfig({
  ...d1Config(),
  schema: './src/db/schema.ts',
})
```

This generates a config like the following.

```typescript
{
  out: migrationsDir,
  dialect: 'sqlite',
  dbCredentials: {
    url: localSqlitePath,
  },
}
```

### Options

All options are optional.

#### HTTP

| Option               | Description                | Note                                                                 |
| -------------------- | -------------------------- | -------------------------------------------------------------------- |
| `out`                | Migration output directory |                                                                      |
| `binding`            | D1 binding name            | Required if multiple D1 databases exist                              |
| `wranglerConfigPath` | Wrangler config file path  | `wrangler.jsonc`, `wrangler.toml`, `wrangler.json` are auto-detected |
| `accountId`          | Cloudflare account ID      |                                                                      |
| `databaseId`         | D1 database ID             |                                                                      |
| `token`              | Cloudflare API token       |                                                                      |

#### Local

| Option               | Description                | Note                                                                 |
| -------------------- | -------------------------- | -------------------------------------------------------------------- |
| `out`                | Migration output directory |                                                                      |
| `binding`            | D1 binding name            | Required if multiple D1 databases exist                              |
| `wranglerConfigPath` | Wrangler config file path  | `wrangler.jsonc`, `wrangler.toml`, `wrangler.json` are auto-detected |
| `databaseId`         | D1 database ID             |                                                                      |
| `persistDir`         | Wrangler state directory   | Required if using `--persist-to` with Wrangler                       |

### Resolution Details

Each value is resolved in the following priority order.
The wrangler config file is searched in this order across all fields.

1. `wrangler.jsonc`
2. `wrangler.toml`
3. `wrangler.json`

If multiple entries exist in `d1_databases`, you need to specify the binding name of the target DB. If there is only one, it is resolved automatically.

#### accountId (HTTP)

1. Explicitly provided argument
2. `account_id` from the wrangler config file
3. `account.id` from `./node_modules/.cache/wrangler/wrangler-account.json`

#### databaseId (HTTP, Local)

1. Explicitly provided argument
2. `database_id` of the matching DB in `d1_databases` from the wrangler config file

#### migrationsDir (HTTP, Local)

1. Explicitly provided argument
2. `migrations_dir` of the matching DB in `d1_databases` from the wrangler config file

#### token (HTTP)

1. Explicitly provided argument
2. Retrieved from the output of `wrangler auth token --json`
   - The package manager is detected automatically.

#### localSqlitePath (Local)

The path to a local SQLite file such as `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`.
Computed from `databaseId`.
(ref: [cloudflare/workers-sdk/miniflare](https://github.com/cloudflare/workers-sdk/blob/5ededb5d52f4362ce8f72d442ba825d48dcabbf8/packages/miniflare/src/plugins/shared/index.ts#L275-L289))

## License

[MIT](./LICENSE)
