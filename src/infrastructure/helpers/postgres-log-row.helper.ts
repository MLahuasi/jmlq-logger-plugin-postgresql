import { ILogResponse } from "../../domain/response";
import { PostgresRawTimestamp } from "../types";

/**
 * Helper para normalizar filas de PostgreSQL y convertirlas en LogRecord.
 *
 * Objetivos:
 *  - Encapsular la lógica de normalización de timestamp.
 *  - Evitar que los consumidores tengan que lidiar con BIGINT/string/Date.
 *  - Garantizar que LogRecord.timestamp sea siempre un number (ms).
 */
export class PostgresLogRowHelper {
  /**
   * Convierte cualquier representación de timestamp de PostgreSQL
   * a un number (ms desde epoch).
   */
  public static normalizeTimestamp(timestamp: PostgresRawTimestamp): number {
    // Caso 1: Date
    if (timestamp instanceof Date) {
      const ms = timestamp.getTime();
      if (Number.isNaN(ms)) {
        throw new Error("PostgresLogRowHelper: invalid Date timestamp");
      }
      return ms;
    }
    // Caso 2: number (ms)
    if (typeof timestamp === "number") {
      if (!Number.isFinite(timestamp)) {
        throw new Error("PostgresLogRowHelper: invalid numeric timestamp");
      }
      return timestamp;
    }
    // Caso 3: string (típico de BIGINT/int8)
    const asNumber = Number(timestamp);
    if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
      return asNumber;
    }
    // Intento final: parsear como fecha legible
    const asDate = new Date(timestamp);
    const msFromDate = asDate.getTime();
    if (!Number.isNaN(msFromDate)) {
      return msFromDate;
    }
    throw new Error(
      `PostgresLogRowHelper: cannot normalize timestamp value: ${String(
        timestamp
      )}`
    );
  }
  /**
   * Mapea una fila cruda de PostgreSQL a un LogRecord con timestamp normalizado.
   */
  public static mapRow(row: ILogResponse): ILogResponse {
    return {
      ...row,
      timestamp: PostgresLogRowHelper.normalizeTimestamp(row.timestamp),
    };
  }
  /**
   * Mapea un array de filas crudas de PostgreSQL a LogRecord[].
   */
  public static mapRows(rows: ILogResponse[]): ILogResponse[] {
    return rows.map((row) => PostgresLogRowHelper.mapRow(row));
  }
}
