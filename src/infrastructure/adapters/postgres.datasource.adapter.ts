import type {
  ILogDatasource,
  LogEntry as CoreLogEntry,
  LogSearchRequest,
  LogRecord,
} from "@jmlq/logger";

import type {
  SaveLogUseCase,
  FindLogsUseCase,
  PruneLogsUseCase,
} from "../../application/use-cases";

import type { SaveLogRequest } from "../../domain/request";

/**
 * Adapter que expone el contrato del core (@jmlq/logger).
 * Thin adapter: delega a use-cases.
 */
export class PostgresDatasourceAdapter implements ILogDatasource {
  readonly name = "postgres";

  constructor(
    private readonly saveLogUseCase: SaveLogUseCase,
    private readonly findLogsUseCase: FindLogsUseCase,
    private readonly pruneLogsUseCase?: PruneLogsUseCase
  ) {}

  async save(log: CoreLogEntry): Promise<void> {
    const dto: SaveLogRequest = { log };
    await this.saveLogUseCase.execute(dto);
  }

  async find(filter?: LogSearchRequest): Promise<LogRecord[]> {
    // Ideal: mapper explícito core->domain si tus requests difieren.
    const domainFilter = (filter ?? {}) as any;

    const result = await this.findLogsUseCase.execute(domainFilter);

    // Si el use-case ya retorna LogRecord (core), devuelve directo.
    // Si retorna ILogResponse del dominio, aquí mapearías.
    return result as any;
  }

  /**
   * Postgres no tiene buffer interno en este plugin.
   * Se implementa por contrato para estandarización.
   */
  async flush(): Promise<void> {
    // noop
  }

  /**
   * Este adapter NO es dueño del pool/client, así que no lo cierra.
   * El ciclo de vida lo gestiona el consumidor.
   */
  async dispose(): Promise<void> {
    // noop
  }

  /**
   * Feature opcional del plugin: retención.
   * Solo funciona si el factory inyectó PruneLogsUseCase.
   */
  async pruneOlderThan(days: number): Promise<number> {
    if (!this.pruneLogsUseCase) return 0;
    return this.pruneLogsUseCase.execute({ days });
  }
}
