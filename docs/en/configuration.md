# Configuration — @jmlq/logger-plugin-postgresql ⚙️

## 🎯 Objective

Configure the PostgreSQL datasource (schema/table/indexes/retention) and its integration with `@jmlq/logger`.

---

## 1) Installation

```bash
    npm i @jmlq/logger @jmlq/logger-plugin-postgresql pg
```

---

## 2) Datasource options

Configuration is passed to `createPostgresDatasource(options)`:

```ts
import type { ILogDatasource } from "../../domain/ports";
import type { IPostgresDatasourceOptions } from "../types";

import { PostgresDatasourceAdapter } from "../../infrastructure/adapters";
import { PostgresLogsRepository } from "../../infrastructure/repositories/postgres-logs.repository";

import {
  SaveLogUseCase,
  FindLogsUseCase,
  PruneLogsUseCase,
  EnsureSchemaAndTableUseCase,
} from "../../application/use-cases";

export async function createPostgresDatasource(
  opts: IPostgresDatasourceOptions,
): Promise<ILogDatasource> {
  const schema = opts.schema ?? "public";
  const table = opts.table ?? "logs";

  const repo = new PostgresLogsRepository(opts.client, schema, table);

  if (opts.createIfMissing) {
    const ensure = new EnsureSchemaAndTableUseCase(opts.client, schema, table);
    await ensure.execute();
  }

  const saveLogUseCase = new SaveLogUseCase(repo);
  const findLogsUseCase = new FindLogsUseCase(repo);

  const pruneLogsUseCase = opts.enablePrune
    ? new PruneLogsUseCase(repo)
    : undefined;

  return new PostgresDatasourceAdapter(
    saveLogUseCase,
    findLogsUseCase,
    pruneLogsUseCase,
  );
}
```

### Common fields (depending on implementation)

- `client`: `ISqlQueryClient` (driver adapter)
- `schema`: target schema (e.g. `public`)
- `table`: target table (e.g. `logs`)
- `createIfMissing`: bootstrap DDL (if enabled)
- `enablePrune`: enable retention (if enabled)
- `pruneDays`: retention days (if enabled)
- `createIndexes`: create/ensure indexes (if enabled)

---

## 3) Recommended environment variables (.env)

This plugin does not read `process.env` directly; the host is responsible for loading environment variables.

```ts
const connectionString = process.env.LOGGER_PG_CONNECTION_STRING;
const schema = process.env.LOGGER_PG_SCHEMA ?? "public";
const table = process.env.LOGGER_PG_TABLE_NAME ?? "logs";
```

---

## 4) Indexes / bootstrap / retention

If your configuration enables bootstrap/indexes/retention, it is delegated to the schema service and/or prune use case:

```ts
export async function ensurePostgresSchemaAndTable(
  client: ISqlQueryClient,
  schema: string,
  table: string,
): Promise<void> {
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(schema)};`);

  const fq = `${quoteIdent(schema)}.${quoteIdent(table)}`;

  await client.query(`
        CREATE TABLE IF NOT EXISTS ${fq} (
          source   TEXT   NULL,
          timestamp BIGINT NOT NULL,
          level     INT    NOT NULL,
          message   TEXT   NOT NULL,
          meta      JSONB
        );

        CREATE INDEX IF NOT EXISTS ${quoteIdent(
          `idx_${table}_ts`,
        )} ON ${fq}(timestamp);

        CREATE INDEX IF NOT EXISTS ${quoteIdent(
          `idx_${table}_level_ts`,
        )} ON ${fq}(level, timestamp);
      `);
}

export async function pruneLogsOlderThan(
  client: ISqlQueryClient,
  schema: string,
  table: string,
  days: number,
): Promise<number> {
  const fq = `${quoteIdent(schema)}.${quoteIdent(table)}`;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const res = await client.query<{ ok: number }>(
    `DELETE FROM ${fq} WHERE timestamp < $1 RETURNING 1 as ok`,
    [cutoff],
  );

  return res.rows.length;
}
```

#### Timestamp type

```ts
export type PostgresRawTimestamp = number | string | Date;
```

---

## 5) Integration with `@jmlq/logger`

```ts
import { createLogger, LogLevel } from "@jmlq/logger";
import { createPostgresDatasource } from "@jmlq/logger-plugin-postgresql";

const pgDs = await createPostgresDatasource({
  client: sqlClientAdapter,
  schema,
  table,
  createIfMissing: true,
  enablePrune: true,
  pruneDays: 7,
});

const logger = createLogger({
  datasources: [pgDs],
  minLevel: LogLevel.INFO,
});
```

---

## ⬅️ Previous

- [`architecture`](./architecture.md)

## ➡️ Next

- [Express Integration](./integration-express.md)
- [Troubleshooting](./troubleshooting.md)
