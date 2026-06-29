import type { HttpClient } from "../http";
import type { ExportRatesOptions, SDKResponse } from "../types";
export declare class ExportsResource {
    private readonly http;
    constructor(http: HttpClient);
    rates(options?: ExportRatesOptions): Promise<SDKResponse<string | Record<string, unknown>>>;
}
//# sourceMappingURL=exports.d.ts.map