export class SavvyRillaFXError extends Error {
    name = "SavvyRillaFXError";
    status;
    code;
    requestId;
    details;
    response;
    constructor(args) {
        super(args.message);
        this.status = args.status;
        this.code = args.code ?? "API_ERROR";
        this.requestId = args.requestId;
        this.details = args.details;
        this.response = args.response;
    }
}
export class SavvyRillaFXRateLimitError extends SavvyRillaFXError {
    name = "SavvyRillaFXRateLimitError";
    retryAfterSeconds;
    constructor(args) {
        super(args);
        this.retryAfterSeconds = args.retryAfterSeconds;
    }
}
export class SavvyRillaFXTimeoutError extends SavvyRillaFXError {
    name = "SavvyRillaFXTimeoutError";
}
export function errorFromPayload(status, payload, response) {
    const retryAfter = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfter ? Number(retryAfter) : undefined;
    const args = {
        message: payload.error.message,
        status,
        code: payload.error.code,
        requestId: payload.requestId,
        details: payload.error.details,
        response,
        retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
    };
    if (status === 429) {
        return new SavvyRillaFXRateLimitError(args);
    }
    return new SavvyRillaFXError(args);
}
//# sourceMappingURL=errors.js.map