import type { HttpClient } from "../http";
import type { HealthStatus, SDKResponse } from "../types";
export declare class HealthResource {
    private readonly http;
    constructor(http: HttpClient);
    check(): Promise<SDKResponse<HealthStatus>>;
}
//# sourceMappingURL=health.d.ts.map