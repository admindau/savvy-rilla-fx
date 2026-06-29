import type { RequestOptions, SDKResponse } from "./types";
export interface SavvyRillaFXClientOptions {
    apiKey?: string;
    baseUrl?: string;
    timeoutMs?: number;
    retries?: number;
    fetch?: typeof fetch;
    userAgent?: string;
}
export declare class HttpClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeoutMs;
    private readonly retries;
    private readonly fetchImpl;
    private readonly userAgent;
    constructor(options?: SavvyRillaFXClientOptions);
    get<TData>(path: string, options?: RequestOptions): Promise<SDKResponse<TData>>;
    request<TData>(path: string, options?: RequestOptions & {
        method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    }): Promise<SDKResponse<TData>>;
}
//# sourceMappingURL=http.d.ts.map