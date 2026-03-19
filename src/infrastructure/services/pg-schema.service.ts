import { ISqlQueryClient } from "../../domain/ports";
import { quoteIdent } from "../helpers";

/**
 * Crea el schema y la tabla de logs si no existen,
 * junto con índices básicos por timestamp y (level, timestamp).
 */
export async function ensurePostgresSchemaAndTable(
  client: ISqlQueryClient,
  schema: string,
  table: string
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
      `idx_${table}_ts`
    )} ON ${fq}(timestamp);

    CREATE INDEX IF NOT EXISTS ${quoteIdent(
      `idx_${table}_level_ts`
    )} ON ${fq}(level, timestamp);
  `);
}

/**
 * Elimina filas con timestamp < ahora - días.
 * Retorna la cantidad de filas borradas.
 */
export async function pruneLogsOlderThan(
  client: ISqlQueryClient,
  schema: string,
  table: string,
  days: number
): Promise<number> {
  const fq = `${quoteIdent(schema)}.${quoteIdent(table)}`;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const res = await client.query<{ ok: number }>(
    `DELETE FROM ${fq} WHERE timestamp < $1 RETURNING 1 as ok`,
    [cutoff]
  );

  return res.rows.length;
}
