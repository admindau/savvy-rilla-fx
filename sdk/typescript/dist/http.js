import { errorFromPayload, SavvyRillaFXError, SavvyRillaFXTimeoutError } from "./errors";
import { normalizeBaseUrl, parseRetryAfter, sleep } from "./utils";
export class HttpClient {
    apiKey;
    baseUrl;
    timeoutMs;
    retries;
    fetchImpl;
    userAgent;
    constructor(options = {}) {
        this.apiKey = options.apiKey;
        this.baseUrl = normalizeBaseUrl(options.baseUrl ?? "https://fx.savvyrilla.tech");
        this.timeoutMs = options.timeoutMs ?? 10_000;
        this.retries = options.retries ?? 2;
        this.fetchImpl = options.fetch ?? fetch;
        this.userAgent = options.userAgent;
    }
    async get(path, options = {}) {
        return this.request(path, { method: "GET", ...options });
    }
    async request(path, options = {}) {
        const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
        const maxAttempts = Math.max(1, this.retries + 1);
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? this.timeoutMs);
            try {
                const response = await this.fetchImpl(url, {
                    method: options.method ?? "GET",
                    signal: options.signal ?? controller.signal,
                    headers: {
                        Accept: "application/json",
                        ...(this.userAgent ? { "User-Agent": this.userAgent } : {}),
                        ...(this.apiKey ? { "X-API-Key": this.apiKey } : {}),
                        ...(options.headers ?? {}),
                    },
                });
                clearTimeout(timeout);
                if (response.status === 304) {
                    return {
                        success: true,
                        requestId: response.headers.get("X-Request-ID") ?? "",
                        timestamp: new Date().toISOString(),
                        version: response.headers.get("X-API-Version") ?? "v1",
                        durationMs: 0,
                        data: undefined,
                        response,
                        headers: response.headers,
                        status: response.status,
                    };
                }
                const payload = (await response.json());
                if (!response.ok || payload.success === false) {
                    throw errorFromPayload(response.status, payload, response);
                }
                return {
                    ...payload,
                    response,
                    headers: response.headers,
                    status: response.status,
                };
            }
            catch (error) {
                clearTimeout(timeout);
                lastError = error;
                if (error instanceof SavvyRillaFXError && error.status === 429 && attempt < maxAttempts) {
                    await sleep(parseRetryAfter(error.response?.headers.get("Retry-After") ?? null) ?? 1000 * attempt);
                    continue;
                }
                if (error instanceof SavvyRillaFXError) {
                    throw error;
                }
                if (error instanceof DOMException && error.name === "AbortError") {
                    throw new SavvyRillaFXTimeoutError({
                        message: `Request timed out after ${options.timeoutMs ?? this.timeoutMs}ms.`,
                        status: 408,
                        code: "REQUEST_TIMEOUT",
                    });
                }
                if (attempt < maxAttempts) {
                    await sleep(250 * attempt);
                    continue;
                }
            }
        }
        throw new SavvyRillaFXError({
            message: lastError instanceof Error ? lastError.message : "Request failed.",
            status: 0,
            code: "NETWORK_ERROR",
            details: lastError,
        });
    }
}
//# sourceMappingURL=http.js.map