import type { HttpClient } from "../http";
import type { ExportRatesOptions, SDKResponse } from "../types";
import { createQueryString } from "../utils";

export class ExportsResource {
  constructor(private readonly http: HttpClient) {}

  rates(options: ExportRatesOptions = {}): Promise<SDKResponse<string | Record<string, unknown>>> {
    return this.http.get(`/api/v1/export/rates${createQueryString(options)}`);
  }
}
