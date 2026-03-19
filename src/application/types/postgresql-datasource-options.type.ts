import type { ISqlQueryClient } from "../../domain/ports";

export interface IPostgresDatasourceOptions {
  client: ISqlQueryClient;
  schema?: string;
  table?: string;

  /**
   * Si true: crea schema/tabla si no existen.
   * (solo usa .query(), no depende de pg)
   */
  createIfMissing?: boolean;

  /**
   * Habilita el use-case de prune y el método pruneOlderThan() en el adapter.
   */
  enablePrune?: boolean;
}
