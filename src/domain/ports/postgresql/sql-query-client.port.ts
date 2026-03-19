export interface ISqlQueryResult<T = any> {
  rows: T[];
  rowCount?: number;
}

export interface ISqlQueryClient {
  query<T = any>(
    text: string,
    params?: ReadonlyArray<any>
  ): Promise<ISqlQueryResult<T>>;
}
