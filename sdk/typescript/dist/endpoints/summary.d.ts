import type { HttpClient } from "../http";
import type { MarketInsights, MarketSummary, SDKResponse, SummaryOptions } from "../types";
export declare class SummaryResource {
    private readonly http;
    constructor(http: HttpClient);
    market(options?: SummaryOptions): Promise<SDKResponse<MarketSummary>>;
    insights(options?: SummaryOptions): Promise<SDKResponse<MarketInsights>>;
}
//# sourceMappingURL=summary.d.ts.map