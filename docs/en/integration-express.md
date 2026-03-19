# Express Integration — @jmlq/logger-plugin-postgresql 🚏

## 🎯 Objective

Show the integration pattern with Express:

- build PostgreSQL datasource
- compose it with `@jmlq/logger`
- inject `ILogger` into `req.logger`

---

## 1) Implement `ISqlQueryClient` in the host

The plugin defines the `ISqlQueryClient` contract. The host implements it using `pg.Pool`.

```ts
export interface ISqlQueryResult<T = any> {
  rows: T[];
  rowCount?: number;
}

export interface ISqlQueryClient {
  query<T = any>(
    text: string,
    params?: ReadonlyArray<any>,
  ): Promise<ISqlQueryResult<T>>;
}
```

---

## 2) Create datasource (plugin)

```ts
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

---

## 3) Compose with core

```ts
import { createLogger, LogLevel } from "@jmlq/logger";

const logger = createLogger({
  datasources: [postgresDatasource],
  minLevel: LogLevel.INFO,
});
```

---

## 4) Middleware `attachLogger`

```ts
import type { Request, Response, NextFunction } from "express";
import type { ILogger } from "@jmlq/logger";

export function attachLogger(logger: ILogger) {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { logger?: ILogger }).logger = logger;
    next();
  };
}
```

---

## 5) Real usage in controllers

Example

```ts
req.logger?.info("auth.register.delivery", {
  email: result.delivery.email,
  expiresAt: result.delivery.expiresAt,
  hasDelivery: true,
});

req.logger?.info("auth.remember.delivery", {
  email: payload.delivery.email,
  expiresAt: payload.delivery.expiresAt,
  hasDelivery: true,
});
```

---

## 6) Graceful shutdown

Recommended at host shutdown:

- `await logger.flush?.()` (if supported)
- Close `pg.Pool` from the host (driver lifecycle responsibility)

---

## ⬅️ Previous

- [`architecture`](./architecture.md)

## ➡️ Next

- [Configuration](./configuration.md)
- [Troubleshooting](./troubleshooting.md)
