import type { ApiErrorPayload } from "./types";

export class SavvyRillaFXError extends Error {
  readonly name: string = "SavvyRillaFXError";
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
  }) {
    super(args.message);
    this.status = args.status;
    this.code = args.code ?? "API_ERROR";
    this.requestId = args.requestId;
    this.details = args.details;
    this.response = args.response;
  }
}

export class SavvyRillaFXRateLimitError extends SavvyRillaFXError {
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
  }) {
    super(args);
    this.retryAfterSeconds = args.retryAfterSeconds;
  }
}

export class SavvyRillaFXTimeoutError extends SavvyRillaFXError {
  readonly name = "SavvyRillaFXTimeoutError";
}

export function errorFromPayload(status: number, payload: ApiErrorPayload, response: Response) {
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
