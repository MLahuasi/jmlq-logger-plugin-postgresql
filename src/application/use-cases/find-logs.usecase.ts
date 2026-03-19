import type { LogFilterRequest } from "../../domain/request";
import type { ILogResponse } from "../../domain/response";
import type { IPostgresLogsRepository } from "../../domain/ports";

export class FindLogsUseCase {
  constructor(private readonly repo: IPostgresLogsRepository) {}

  async execute(filter: LogFilterRequest): Promise<ILogResponse[]> {
    return this.repo.find(filter ?? {});
  }
}
