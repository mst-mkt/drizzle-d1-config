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

| Option               | Description                     | Note                                                                                         |
| -------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| `out`                | Migration output directory      |                                                                                              |
| `binding`            | D1 binding name                 | Required if multiple D1 databases exist                                                      |
| `wranglerConfigPath` | Wrangler config file path       | `cloudflare.config.ts`, `wrangler.jsonc`, `wrangler.toml`, `wrangler.json` are auto-detected |
| `mode`               | Mode for `cloudflare.config.ts` | Passed as `ctx.mode` to a function-form config                                               |
| `accountId`          | Cloudflare account ID           |                                                                                              |
| `databaseId`         | D1 database ID                  |                                                                                              |
| `token`              | Cloudflare API token            |                                                                                              |

#### Local

| Option               | Description                     | Note                                                                                         |
| -------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| `out`                | Migration output directory      |                                                                                              |
| `binding`            | D1 binding name                 | Required if multiple D1 databases exist                                                      |
| `wranglerConfigPath` | Wrangler config file path       | `cloudflare.config.ts`, `wrangler.jsonc`, `wrangler.toml`, `wrangler.json` are auto-detected |
| `mode`               | Mode for `cloudflare.config.ts` | Passed as `ctx.mode` to a function-form config                                               |
| `databaseId`         | D1 database ID                  |                                                                                              |
| `persistDir`         | Wrangler state directory        | Required if using `--persist-to` with Wrangler                                               |

### Resolution Details

Each value is resolved in the following priority order.
The wrangler config file is searched in this order across all fields.

1. `cloudflare.config.ts`
2. `wrangler.jsonc`
3. `wrangler.toml`
4. `wrangler.json`

If multiple entries exist in `d1_databases`, you need to specify the binding name of the target DB. If there is only one, it is resolved automatically.

Environment variables are read from `process.env`.

#### accountId (HTTP)

1. Explicitly provided argument
2. `CLOUDFLARE_ACCOUNT_ID` environment variable
3. `account_id` from the wrangler config file
4. `account.id` from `./node_modules/.cache/wrangler/wrangler-account.json`

#### databaseId (HTTP, Local)

1. Explicitly provided argument
2. `CLOUDFLARE_DATABASE_ID` environment variable
3. `database_id` of the matching DB in `d1_databases` from the wrangler config file

#### migrationsDir (HTTP, Local)

1. Explicitly provided argument
2. `migrations_dir` of the matching DB in `d1_databases` from the wrangler config file

> [!NOTE]
> `cloudflare.config.ts` has no equivalent of `migrations_dir`, so `out` is never resolved from it.
> Pass `out` explicitly. Wrangler itself behaves the same way and falls back to its default migrations directory.
>
> ```ts
> d1Config({ out: './drizzle/migrations' })
> ```

#### token (HTTP)

1. Explicitly provided argument
2. `CLOUDFLARE_D1_TOKEN` environment variable
3. `CLOUDFLARE_API_TOKEN` environment variable
4. Retrieved from the output of `wrangler auth token --json`
   - The package manager is detected automatically.

#### localSqlitePath (Local)

The path to a local SQLite file such as `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`.
Computed from `databaseId`.
(ref: [cloudflare/workers-sdk/miniflare](https://github.com/cloudflare/workers-sdk/blob/5ededb5d52f4362ce8f72d442ba825d48dcabbf8/packages/miniflare/src/plugins/shared/index.ts#L275-L289))

### Tips

Here are two ways to switch between local and remote configurations.

#### Environment Variable

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'
import { d1Config as d1HttpConfig } from 'drizzle-d1-config/http'
import { d1Config as d1LocalConfig } from 'drizzle-d1-config/local'

const isLocal = process.env.NODE_ENV === 'development'

export default defineConfig({
  ...(isLocal ? d1LocalConfig() : d1HttpConfig()),
  schema: './src/db/schema.ts',
})
```

#### Separate Files

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'
import { d1Config } from 'drizzle-d1-config/local'

export default defineConfig({
  ...d1Config(),
  schema: './src/db/schema.ts',
})
```

```typescript
// drizzle.remote.config.ts
import { defineConfig } from 'drizzle-kit'
import { d1Config } from 'drizzle-d1-config/http'

export default defineConfig({
  ...d1Config(),
  schema: './src/db/schema.ts',
})
```

Specify the config file when running `drizzle-kit`:

```jsonc
// package.json
{
  "scripts": {
    "db:migrate:local": "drizzle-kit migrate",
    "db:migrate:remote": "drizzle-kit migrate --config ./drizzle.remote.config.ts",
    "db:studio:local": "drizzle-kit studio",
    "db:studio:remote": "drizzle-kit studio --config ./drizzle.remote.config.ts",
  },
}
```

## License

[MIT](./LICENSE)
