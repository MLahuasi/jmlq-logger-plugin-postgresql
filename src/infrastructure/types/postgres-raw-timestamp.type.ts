/**
 * Tipo de timestamp tal como puede venir desde PostgreSQL:
 *  - number  → ms desde epoch
 *  - string  → típico de BIGINT/int8 cuando pg no tiene parser custom
 *  - Date    → en caso de mapear a tipo fecha
 */
export type PostgresRawTimestamp = number | string | Date;
