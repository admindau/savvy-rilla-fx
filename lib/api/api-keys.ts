import crypto from "node:crypto";
import { type NextRequest } from "next/server";
import { apiError } from "./response";
import type { ApiContext, ApiKeyContext } from "./request-id";
import { supabaseServer } from "@/lib/supabase/server";

const KEY_PREFIX = "srfx";
const DEFAULT_ENVIRONMENT = "live";

type ApiKeyRow = {
  id: string;
  developer_id: string | null;
  name: string | null;
  key_prefix: string;
  key_hash: string;
  environment: string;
  status: string;
  scopes: string[] | null;
  daily_quota: number | null;
  monthly_quota: number | null;
  rate_limit_per_minute: number | null;
  expires_at: string | null;
  revoked_at: string | null;
  fx_developer_accounts?: {
    plan: string | null;
    status: string | null;
  } | null;
};

export type CreateApiKeyInput = {
  developerId?: string | null;
  name: string;
  environment?: "test" | "live" | "admin";
  scopes?: string[];
  dailyQuota?: number | null;
  monthlyQuota?: number | null;
  rateLimitPerMinute?: number | null;
  expiresAt?: string | null;
};

export type CreatedApiKey = {
  id: string;
  key: string;
  prefix: string;
  environment: string;
};

function getApiKeyFromRequest(req: NextRequest): string | null {
  const explicit = req.headers.get("x-api-key")?.trim();
  if (explicit) return explicit;

  const authorization = req.headers.get("authorization")?.trim();
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim() || null;
  }

  return null;
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

function makeSecret(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function normalizeEnvironment(environment?: string | null): "test" | "live" | "admin" {
  if (environment === "test" || environment === "admin") return environment;
  return DEFAULT_ENVIRONMENT;
}

export function generateApiKey(environment: "test" | "live" | "admin" = DEFAULT_ENVIRONMENT) {
  const secret = makeSecret();
  const key = `${KEY_PREFIX}_${environment}_${secret}`;
  const prefix = key.slice(0, 16);
  return { key, prefix };
}

export async function createApiKey(input: CreateApiKeyInput): Promise<CreatedApiKey> {
  const environment = normalizeEnvironment(input.environment);
  const { key, prefix } = generateApiKey(environment);
  const keyHash = hashApiKey(key);

  const { data, error } = await supabaseServer
    .from("fx_api_keys")
    .insert({
      developer_id: input.developerId ?? null,
      name: input.name,
      key_prefix: prefix,
      key_hash: keyHash,
      environment,
      status: "active",
      scopes: input.scopes ?? ["rates:read", "summary:read"],
      daily_quota: input.dailyQuota ?? 1000,
      monthly_quota: input.monthlyQuota ?? 30000,
      rate_limit_per_minute: input.rateLimitPerMinute ?? 120,
      expires_at: input.expiresAt ?? null,
    })
    .select("id, key_prefix, environment")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create API key.");
  }

  return {
    id: data.id as string,
    key,
    prefix: data.key_prefix as string,
    environment: data.environment as string,
  };
}

function isExpired(expiresAt: string | null): boolean {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

export async function validateApiKey(req: NextRequest, context: ApiContext) {
  const apiKey = getApiKeyFromRequest(req);
  const requireKeys = process.env.FX_API_REQUIRE_KEYS === "true";

  if (!apiKey) {
    if (!requireKeys) return null;
    return apiError(
      context,
      401,
      "API_KEY_REQUIRED",
      "This endpoint requires an API key. Send it using X-API-Key or Authorization: Bearer.",
    );
  }

  if (!apiKey.startsWith(`${KEY_PREFIX}_`)) {
    return apiError(context, 401, "INVALID_API_KEY", "The supplied API key is invalid.");
  }

  const keyHash = hashApiKey(apiKey);

  const { data, error } = await supabaseServer
    .from("fx_api_keys")
    .select(
      "id, developer_id, name, key_prefix, key_hash, environment, status, scopes, daily_quota, monthly_quota, rate_limit_per_minute, expires_at, revoked_at, fx_developer_accounts(plan, status)",
    )
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error) {
    return apiError(
      context,
      500,
      "API_KEY_LOOKUP_FAILED",
      "Unable to validate the supplied API key.",
      error.message,
    );
  }

  const row = data as ApiKeyRow | null;
  if (!row) {
    return apiError(context, 401, "INVALID_API_KEY", "The supplied API key was not found.");
  }

  if (row.status !== "active" || row.revoked_at) {
    return apiError(context, 403, "API_KEY_REVOKED", "The supplied API key is no longer active.");
  }

  if (isExpired(row.expires_at)) {
    return apiError(context, 403, "API_KEY_EXPIRED", "The supplied API key has expired.");
  }

  if (row.fx_developer_accounts?.status && row.fx_developer_accounts.status !== "active") {
    return apiError(context, 403, "DEVELOPER_DISABLED", "The developer account is not active.");
  }

  const apiKeyContext: ApiKeyContext = {
    id: row.id,
    developerId: row.developer_id,
    prefix: row.key_prefix,
    name: row.name,
    environment: row.environment,
    plan: row.fx_developer_accounts?.plan ?? null,
    scopes: row.scopes ?? [],
    dailyQuota: row.daily_quota,
    monthlyQuota: row.monthly_quota,
    rateLimitPerMinute: row.rate_limit_per_minute,
  };

  context.apiKey = apiKeyContext;
  context.authMode = "api_key";

  void supabaseServer
    .from("fx_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return null;
}
