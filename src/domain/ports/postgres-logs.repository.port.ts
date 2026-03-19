import { LogEntry } from "../model";
import { LogFilterRequest } from "../request";
import { ILogResponse } from "../response";

export interface IPostgresLogsRepository {
  insert(log: LogEntry): Promise<void>;
  find(filter: LogFilterRequest): Promise<ILogResponse[]>;
  pruneOlderThan(days: number): Promise<number>;
  healthcheck(): Promise<void>;
}
