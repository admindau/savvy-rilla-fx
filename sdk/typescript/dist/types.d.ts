export type CurrencyCode = string;
export type ApiVersion = "v1" | string;
export interface ApiEnvelope<TData> {
    success: true;
    requestId: string;
    timestamp: string;
    version: ApiVersion;
    durationMs: number;
    data: TData;
}
export interface ApiErrorPayload {
    success: false;
    requestId?: string;
    timestamp?: string;
    version?: ApiVersion;
    durationMs?: number;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}
export interface ExchangeRate {
    id?: string;
    base?: CurrencyCode;
    quote?: CurrencyCode;
    base_currency?: CurrencyCode;
    quote_currency?: CurrencyCode;
    rate?: number;
    value?: number;
    buy_rate?: number;
    sell_rate?: number;
    mid_rate?: number;
    source?: string;
    rate_date?: string;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}
export interface Currency {
    code: CurrencyCode;
    name?: string;
    symbol?: string;
    region?: string;
    is_active?: boolean;
    [key: string]: unknown;
}
export interface MarketSummary {
    marketHealth?: {
        score: number;
        status: string;
        color?: string;
        description?: string;
        [key: string]: unknown;
    };
    latestRate?: ExchangeRate;
    trend?: string;
    volatility?: string;
    commentary?: string;
    [key: string]: unknown;
}
export interface MarketInsights {
    commentary?: string;
    summary?: string;
    signals?: Array<Record<string, unknown>>;
    insights?: Array<Record<string, unknown>>;
    [key: string]: unknown;
}
export interface HealthStatus {
    status?: string;
    service?: string;
    environment?: string;
    uptimeSeconds?: number;
    db?: boolean;
    [key: string]: unknown;
}
export interface ListCurrenciesOptions {
    active?: boolean;
}
export interface CurrencyPairOptions {
    base?: CurrencyCode;
    quote?: CurrencyCode;
}
export type LatestRateOptions = CurrencyPairOptions;
export interface LatestByQuoteOptions {
    base?: CurrencyCode;
}
export interface RecentRatesOptions extends CurrencyPairOptions {
    limit?: number;
}
export interface HistoryRatesOptions extends CurrencyPairOptions {
    mode?: "all" | "range";
    from?: string;
    to?: string;
    limit?: number;
}
export interface ExportRatesOptions extends CurrencyPairOptions {
    format?: "csv" | "json";
    mode?: "all" | "range";
    from?: string;
    to?: string;
    limit?: number;
}
export type SummaryOptions = CurrencyPairOptions;
export interface RequestOptions {
    signal?: AbortSignal;
    headers?: Record<string, string>;
    timeoutMs?: number;
}
export interface SDKResponse<TData> extends ApiEnvelope<TData> {
    response: Response;
    headers: Headers;
    status: number;
}
//# sourceMappingURL=types.d.ts.map