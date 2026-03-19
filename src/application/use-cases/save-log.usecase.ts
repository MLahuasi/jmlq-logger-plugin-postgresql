import type { SaveLogRequest } from "../../domain/request";
import type { IPostgresLogsRepository } from "../../domain/ports";

export class SaveLogUseCase {
  constructor(private readonly repo: IPostgresLogsRepository) {}

  async execute(req: SaveLogRequest): Promise<void> {
    if (!req?.log) return;
    await this.repo.insert(req.log);
  }
}
