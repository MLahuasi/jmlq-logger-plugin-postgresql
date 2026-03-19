import { ISqlQueryClient } from "../../domain/ports";
import { ensurePostgresSchemaAndTable } from "../../infrastructure/services";

export interface IEnsureSchemaAndTableUseCase {
  execute(): Promise<void>;
}

/**
 * EnsureSchemaAndTableUseCase
 * -----------------------------------------------------------------------------
 * Caso de uso de bootstrap para asegurar schema y tabla.
 *
 * Nota:
 * - No depende de 'pg' ni de libs externas.
 * - Solo requiere ISqlQueryClient (contrato .query()).
 *
 * SRP:
 * - Ejecutar DDL idempotente (IF NOT EXISTS)
 */
export class EnsureSchemaAndTableUseCase
  implements IEnsureSchemaAndTableUseCase
{
  constructor(
    private readonly client: ISqlQueryClient,
    private readonly schema: string,
    private readonly table: string
  ) {}

  async execute(): Promise<void> {
    await ensurePostgresSchemaAndTable(this.client, this.schema, this.table);
  }
}
