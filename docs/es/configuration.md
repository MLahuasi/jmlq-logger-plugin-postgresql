# Configuración — @jmlq/logger-plugin-postgresql ⚙️

## 🎯 Objetivo

Configurar el datasource PostgreSQL (schema/tabla/índices/retención) y su integración con `@jmlq/logger`.

---

## 1) Instalación

```bash
npm i @jmlq/logger @jmlq/logger-plugin-postgresql pg
```

---

## 2) Opciones del datasource

La configuración se pasa a `createPostgresDatasource(options)`:

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

### Campos comunes (según implementación)

- `client`: `ISqlQueryClient` (adapter del driver)
- `schema`: schema destino (ej. `public`)
- `table`: tabla destino (ej. `logs`)
- `createIfMissing`: bootstrap DDL (si aplica)
- `enablePrune`: habilitar poda (si aplica)
- `pruneDays`: días de retención (si aplica)
- `createIndexes`: crear/verificar índices (si aplica)

---

## 3) Variables de entorno recomendadas (.env)

El plugin no consume `process.env` directamente; el host decide cómo cargar envs.

```ts
const connectionString = process.env.LOGGER_PG_CONNECTION_STRING;
const schema = process.env.LOGGER_PG_SCHEMA ?? "public";
const table = process.env.LOGGER_PG_TABLE_NAME ?? "logs";
```

---

## 4) Índices / bootstrap / retención

Si tu configuración habilita bootstrap/índices/retención, se delega al servicio de esquema y/o caso de uso de prune:

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

## 5) Integración con `@jmlq/logger`

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

## ⬅️ Anterior

- [`arquitectura`](./architecture.md)

## ➡️ Siguiente

- [Integración Express](./integration-express.md)
- [Troubleshooting](./troubleshooting.md)
