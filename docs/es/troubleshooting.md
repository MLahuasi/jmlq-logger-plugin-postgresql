# Troubleshooting — @jmlq/logger-plugin-postgresql 🩺

## 🎯 Objetivo

Resolver problemas comunes al usar el datasource PostgreSQL como destino de `@jmlq/logger`.

---

## 1) No se crea schema/tabla

Revisar:

- `createIfMissing` (si tu configuración lo usa)
- permisos del usuario en PostgreSQL (CREATE SCHEMA/TABLE)
- que el host llame a `createPostgresDatasource(...)` en bootstrap

Referencia (schema service):

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

## 2) Error de conexión (connection string)

Patrón típico en host:

- resolver URI desde `process.env.LOGGER_PG_CONNECTION_STRING`
- crear `new Pool({ connectionString })`
- validar conexión con `SELECT 1` (recomendado)

---

## 3) Los logs no aparecen

Checklist:

- `minLevel` del core permite el nivel usado
- el datasource se pasó realmente a `createLogger({ datasources: [...] })`
- el repositorio ejecuta INSERT (no falla silenciosamente)

Referencia (repository):

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

## 4) La retención (prune) no funciona

Si habilitaste retención:

- confirma que `enablePrune` está activo
- confirma `pruneDays`
- confirma que el timestamp usado en la tabla corresponde al campo evaluado para borrar
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

## 5) getLogs(...) no funciona con PostgreSQL

Para soportar lectura, el datasource debe exponer `find` (vía `ILogDatasource.find?`).  
Confirma que el adapter implemente búsqueda:

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

## ⬅️ Anterior

- [`arquitectura`](./architecture.md)

## ➡️ Siguiente

- [Configuración](./configuration.md)
- [Integración Express](./integration-express.md)
