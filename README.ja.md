# drizzle-d1-config

Cloudflare D1 を使用する際に `drizzle.config.ts` を簡単に設定するためのヘルパーです。
`wrangler.jsonc` などから必要な設定を自動で解決します。

<div align="right">

[英語 >](./README.md)

</div>

## Install

```bash
pnpm add drizzle-d1-config
```

> [!NOTE]
> `cloudflare.config.ts` を使う場合は、optional peer dependency の `@cloudflare/config` をインストールしてください。
>
> ```bash
> pnpm add @cloudflare/config
> ```

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

上記の設定により、以下のような config が生成されます。

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

上記の設定により、以下のような config が生成されます。

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

すべてのオプションは任意です。

#### HTTP

| Option               | Description                    | Note                                                                                    |
| -------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| `out`                | migration の output directory  |                                                                                         |
| `binding`            | D1 binding 名                  | 複数 D1 database がある場合は必須                                                       |
| `wranglerConfigPath` | wrangler config file の path   | `cloudflare.config.ts`, `wrangler.jsonc`, `wrangler.toml`, `wrangler.json` は自動で検出 |
| `mode`               | `cloudflare.config.ts` の mode | 関数形式の config に `ctx.mode` として渡される                                          |
| `accountId`          | Cloudflare account ID          |                                                                                         |
| `databaseId`         | D1 database ID                 |                                                                                         |
| `token`              | Cloudflare API token           |                                                                                         |

#### Local

| Option               | Description                    | Note                                                                                    |
| -------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| `out`                | migration の output directory  |                                                                                         |
| `binding`            | D1 binding 名                  | 複数 D1 database がある場合は必須                                                       |
| `wranglerConfigPath` | wrangler config file の path   | `cloudflare.config.ts`, `wrangler.jsonc`, `wrangler.toml`, `wrangler.json` は自動で検出 |
| `mode`               | `cloudflare.config.ts` の mode | 関数形式の config に `ctx.mode` として渡される                                          |
| `databaseId`         | D1 database ID                 |                                                                                         |
| `persistDir`         | wrangler の state directory    | Wrangler で `--persist-to` を使用している場合は必要                                     |

### Resolution Details

各設定値は以下の優先順位で解決されます。
全項目で共通して、Wrangler の設定ファイルは以下の順番で探索されます。

1. `cloudflare.config.ts`
2. `wrangler.jsonc`
3. `wrangler.toml`
4. `wrangler.json`

Wrangler の設定内に `d1_databases` が複数存在する場合は、使用する DB の binding を指定する必要があります。1 つの場合は自動で解決されます。

環境変数は `process.env` から読み取られます。

#### accountId (HTTP)

1. 引数で明示的に指定された値
2. 環境変数 `CLOUDFLARE_ACCOUNT_ID`
3. Wrangler 設定ファイルの `account_id`
4. `./node_modules/.cache/wrangler/wrangler-account.json` の `account.id`

#### databaseId (HTTP, Local)

1. 引数で明示的に指定された値
2. 環境変数 `CLOUDFLARE_DATABASE_ID`
3. Wrangler 設定ファイルの `d1_databases` 内の該当 DB の `database_id`

#### migrationsDir (HTTP, Local)

1. 引数で明示的に指定された値
2. Wrangler 設定ファイルの `d1_databases` 内の該当 DB の `migrations_dir`

> [!NOTE]
> `cloudflare.config.ts` には `migrations_dir` に相当する設定がないため、`out` が解決されることはありません。
> `out` を明示的に指定してください。Wrangler 自身も同様の挙動で、既定の migrations directory にフォールバックします。
>
> ```ts
> d1Config({ out: './drizzle/migrations' })
> ```

#### token (HTTP)

1. 引数で明示的に指定された値
2. 環境変数 `CLOUDFLARE_D1_TOKEN`
3. 環境変数 `CLOUDFLARE_API_TOKEN`
4. `wrangler auth token --json` の出力から取得
   - package manager は自動で検出されます。

#### localSqlitePath (Local)

`.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite` のようなローカルの SQLite ファイルのパス。
`databaseId` から計算されます。
(ref: [cloudflare/workers-sdk/miniflare](https://github.com/cloudflare/workers-sdk/blob/5ededb5d52f4362ce8f72d442ba825d48dcabbf8/packages/miniflare/src/plugins/shared/index.ts#L275-L289))

### Tips

ローカルとリモートの設定は、以下のように使い分けできます。

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

以下のように `drizzle-kit` 実行時に config ファイルを指定します。

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
