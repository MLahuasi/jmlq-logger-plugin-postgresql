import { LogEntry } from "../../domain/model";
import { IPostgresLogsRepository, ISqlQueryClient } from "../../domain/ports";
import { LogFilterRequest } from "../../domain/request";
import { ILogResponse } from "../../domain/response";
import { PostgresLogRowHelper, quoteIdent } from "../helpers";
import { pruneLogsOlderThan } from "../services";

export class PostgresLogsRepository implements IPostgresLogsRepository {
  private readonly fqTable: string;

  constructor(
    private readonly client: ISqlQueryClient,
    private readonly schema: string,
    private readonly table: string
  ) {
    this.fqTable = `${quoteIdent(schema)}.${quoteIdent(table)}`;
  }

  async healthcheck(): Promise<void> {
    await this.client.query("SELECT 1");
  }

  async insert(log: LogEntry): Promise<void> {
    await this.client.query(
      `INSERT INTO ${this.fqTable}(source, timestamp, level, message, meta)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        log.source ?? null,
        log.timestamp,
        log.level,
        log.message,
        log.meta ?? null,
      ]
    );
  }

  async find(filter: LogFilterRequest): Promise<ILogResponse[]> {
    const f = filter ?? {};

    const conditions: string[] = [];
    const params: Array<string | number | boolean | null> = [];
    let index = 1;

    if (f.levelMin != null) {
      conditions.push(`level >= $${index}`);
      params.push(f.levelMin);
      index += 1;
    }

    if (f.since != null) {
      conditions.push(`timestamp >= $${index}`);
      params.push(f.since);
      index += 1;
    }

    if (f.until != null) {
      conditions.push(`timestamp <= $${index}`);
      params.push(f.until);
      index += 1;
    }

    if (f.query && f.query.trim().length > 0) {
      conditions.push(`message ILIKE $${index}`);
      params.push(`%${f.query.trim()}%`);
      index += 1;
    }

    let sql = `SELECT source, timestamp, level, message, meta FROM ${this.fqTable}`;
    if (conditions.length > 0) sql += ` WHERE ${conditions.join(" AND ")}`;

    // Mantienes tu estrategia: paginar desde antiguos (ASC) y luego invertir en memoria
    sql += " ORDER BY timestamp ASC";

    const hasLimit = typeof f.limit === "number";
    const hasOffsetPage =
      typeof f.offset === "number" && Number.isFinite(f.offset) && f.offset > 0;

    if (hasLimit) {
      const limit = f.limit as number;
      sql += ` LIMIT $${index}`;
      params.push(limit);
      index += 1;

      if (hasOffsetPage) {
        const page = f.offset as number;
        const rowOffset = page * limit;
        sql += ` OFFSET $${index}`;
        params.push(rowOffset);
        index += 1;
      }
    } else if (hasOffsetPage) {
      sql += ` OFFSET $${index}`;
      params.push(f.offset as number);
      index += 1;
    }

    const result = await this.client.query<ILogResponse>(sql, params);

    const rowsInPageDesc = result.rows.slice().reverse();
    return PostgresLogRowHelper.mapRows(rowsInPageDesc);
  }

  async pruneOlderThan(days: number): Promise<number> {
    return pruneLogsOlderThan(this.client, this.schema, this.table, days);
  }
}
