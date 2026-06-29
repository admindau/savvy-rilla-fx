import type { HttpClient } from "../http";
import type { HealthStatus, SDKResponse } from "../types";

export class HealthResource {
  constructor(private readonly http: HttpClient) {}

  check(): Promise<SDKResponse<HealthStatus>> {
    return this.http.get("/api/health");
  }
}
