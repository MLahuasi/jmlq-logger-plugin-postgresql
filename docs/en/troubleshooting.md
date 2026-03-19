# Troubleshooting — @jmlq/logger-plugin-postgresql 🩺

## 🎯 Objective

Resolve common issues when using the PostgreSQL datasource as a target for `@jmlq/logger`.

---

## 1) Schema/table is not created

Check:

- `createIfMissing` (if enabled in your configuration)
- PostgreSQL user permissions (CREATE SCHEMA / CREATE TABLE)
- that the host calls `createPostgresDatasource(...)` during bootstrap

Reference (schema service):

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
```

---

## 2) Connection error (connection string)

Typical pattern in host:

- resolve URI from `process.env.LOGGER_PG_CONNECTION_STRING`
- create `new Pool({ connectionString })`
- validate connection with `SELECT 1` (recommended)

---

## 3) Logs are not appearing

Checklist:

- `minLevel` in the core allows the used log level
- the datasource is actually passed to `createLogger({ datasources: [...] })`
- the repository executes INSERT (no silent failure)

Reference (factory wiring):

```ts
const repo = new PostgresLogsRepository(opts.client, schema, table);

const saveLogUseCase = new SaveLogUseCase(repo);

return new PostgresDatasourceAdapter(
  saveLogUseCase,
  findLogsUseCase,
  pruneLogsUseCase,
);
```

---

## 4) Retention (prune) is not working

If retention is enabled:

- confirm `enablePrune` is active
- confirm `pruneDays`
- confirm that the timestamp stored in the table matches the field used for deletion

Reference:

```ts
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

---

## 5) getLogs(...) does not work with PostgreSQL

To support reading, the datasource must expose `find` (`ILogDatasource.find?`).

Verify that the adapter implements search:

```ts
export class PostgresDatasourceAdapter implements ILogDatasource {
  async find(filter?: LogSearchRequest): Promise<LogRecord[]> {
    const domainFilter = (filter ?? {}) as any;

    const result = await this.findLogsUseCase.execute(domainFilter);

    return result as any;
  }
}
```

---

## ⬅️ Previous

- [`architecture`](./architecture.md)

## ➡️ Next

- [Configuration](./configuration.md)
- [Express Integration](./integration-express.md)
