import type { ApiErrorPayload } from "./types";
export declare class SavvyRillaFXError extends Error {
    readonly name: string;
    readonly status: number;
    readonly code: string;
    readonly requestId: string | undefined;
    readonly details: unknown;
    readonly response: Response | undefined;
    constructor(args: {
        message: string;
        status: number;
        code?: string | undefined;
        requestId?: string | undefined;
        details?: unknown;
        response?: Response | undefined;
    });
}
export declare class SavvyRillaFXRateLimitError extends SavvyRillaFXError {
    readonly name = "SavvyRillaFXRateLimitError";
    readonly retryAfterSeconds: number | undefined;
    constructor(args: {
        message: string;
        status: number;
        code?: string | undefined;
        requestId?: string | undefined;
        details?: unknown;
        response?: Response | undefined;
        retryAfterSeconds?: number | undefined;
    });
}
export declare class SavvyRillaFXTimeoutError extends SavvyRillaFXError {
    readonly name = "SavvyRillaFXTimeoutError";
}
export declare function errorFromPayload(status: number, payload: ApiErrorPayload, response: Response): SavvyRillaFXError;
//# sourceMappingURL=errors.d.ts.map