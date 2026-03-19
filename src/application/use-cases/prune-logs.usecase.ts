import { IPostgresLogsRepository } from "../../domain/ports";

export interface PruneLogsRequest {
  days: number;
}

export interface IPruneLogsUseCase {
  execute(req: PruneLogsRequest): Promise<number>;
}

/**
 * PruneLogsUseCase
 * -----------------------------------------------------------------------------
 * Caso de uso para limpieza por retención.
 *
 * SRP:
 * - Validar/normalizar el input (days)
 * - Delegar la operación al repositorio
 */
export class PruneLogsUseCase implements IPruneLogsUseCase {
  constructor(private readonly repo: IPostgresLogsRepository) {}

  async execute(req: PruneLogsRequest): Promise<number> {
    const days = Number(req?.days);

    // validación mínima defensiva
    if (!Number.isFinite(days) || days <= 0) return 0;

    return this.repo.pruneOlderThan(days);
  }
}
