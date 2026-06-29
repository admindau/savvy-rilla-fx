import type { HttpClient } from "../http";
import type { ExchangeRate, HistoryRatesOptions, LatestByQuoteOptions, LatestRateOptions, RecentRatesOptions, SDKResponse } from "../types";
export declare class RatesResource {
    private readonly http;
    constructor(http: HttpClient);
    latest(options?: LatestRateOptions): Promise<SDKResponse<ExchangeRate>>;
    latestByQuote(quote: string, options?: LatestByQuoteOptions): Promise<SDKResponse<ExchangeRate>>;
    recent(options?: RecentRatesOptions): Promise<SDKResponse<ExchangeRate[]>>;
    history(options?: HistoryRatesOptions): Promise<SDKResponse<ExchangeRate[]>>;
}
//# sourceMappingURL=rates.d.ts.map