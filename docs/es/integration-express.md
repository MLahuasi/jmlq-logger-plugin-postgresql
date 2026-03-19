# Integración con Express — @jmlq/logger-plugin-postgresql 🚏

## 🎯 Objetivo

Mostrar el patrón de integración con Express:

- construir datasource PostgreSQL
- componerlo con `@jmlq/logger`
- inyectar `ILogger` en `req.logger`

---

## 1) Implementar `ISqlQueryClient` en el host

El plugin define el contrato `ISqlQueryClient`. El host lo implementa usando `pg.Pool`.

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

## 2) Crear datasource del plugin

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

## 3) Componer con el core

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

## 5) Uso real en controllers

Ejemplo:

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

## 6) Cierre controlado

Recomendación en shutdown del host:

- `await logger.flush?.()` (si el datasource lo soporta)
- cerrar el `pg.Pool` desde el host (lifecycle del driver)

---

## ⬅️ Anterior

- [`arquitectura`](./architecture.md)

## ➡️ Siguiente

- [Configuración](./configuration.md)
- [Troubleshooting](./troubleshooting.md)
