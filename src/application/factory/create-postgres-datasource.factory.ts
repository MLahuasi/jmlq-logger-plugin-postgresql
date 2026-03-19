import type { ILogDatasource } from "../../domain/ports";
import type { IPostgresDatasourceOptions } from "../types";

// -----------------------------------------------------------------------------
// Infraestructura (implementaciones)
// -----------------------------------------------------------------------------
import { PostgresDatasourceAdapter } from "../../infrastructure/adapters";
import { PostgresLogsRepository } from "../../infrastructure/repositories/postgres-logs.repository";

// -----------------------------------------------------------------------------
// Use-cases (application)
// -----------------------------------------------------------------------------
import {
  SaveLogUseCase,
  FindLogsUseCase,
  PruneLogsUseCase,
  EnsureSchemaAndTableUseCase,
} from "../../application/use-cases";

/**
 * createPostgresDatasource
 * -----------------------------------------------------------------------------
 * Composition Root del plugin PostgreSQL.
 *
 * Responsabilidad:
 * - Construir el grafo de dependencias (repo, services, use-cases)
 * - Exponer un ILogDatasource compatible con @jmlq/logger
 *
 * Clean Architecture:
 * - Vive en application por consistencia del monorepo (como solicitaste).
 * - No depende de librerías externas (no importa 'pg').
 * - Infra y dominio quedan sin dependencia al consumidor.
 */
export async function createPostgresDatasource(
  opts: IPostgresDatasourceOptions
): Promise<ILogDatasource> {
  const schema = opts.schema ?? "public";
  const table = opts.table ?? "logs";

  // ---------------------------------------------------------------------------
  // 1) Repository (infraestructura) — SQL real pero solo vía ISqlQueryClient
  // ---------------------------------------------------------------------------
  const repo = new PostgresLogsRepository(opts.client, schema, table);

  // ---------------------------------------------------------------------------
  // 2) Bootstrap opcional (create schema/table)
  // ---------------------------------------------------------------------------
  if (opts.createIfMissing) {
    const ensure = new EnsureSchemaAndTableUseCase(opts.client, schema, table);
    await ensure.execute();
  }

  // ---------------------------------------------------------------------------
  // 3) Use-cases (application)
  // ---------------------------------------------------------------------------
  const saveLogUseCase = new SaveLogUseCase(repo);
  const findLogsUseCase = new FindLogsUseCase(repo);

  const pruneLogsUseCase = opts.enablePrune
    ? new PruneLogsUseCase(repo)
    : undefined;

  // ---------------------------------------------------------------------------
  // 4) Adapter (infraestructura) que expone contrato del core
  // ---------------------------------------------------------------------------
  return new PostgresDatasourceAdapter(
    saveLogUseCase,
    findLogsUseCase,
    pruneLogsUseCase
  );
}
