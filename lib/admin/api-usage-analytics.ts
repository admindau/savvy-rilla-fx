import { supabaseServer } from "@/lib/supabase/server";

export type UsageStatus = "healthy" | "watch" | "attention";

export type UsageSummary = {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  errorRate: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  activeKeys: number;
  observedKeys: number;
  periodDays: number;
  status: UsageStatus;
};

export type EndpointUsage = {
  path: string;
  method: string;
  requests: number;
  errors: number;
  averageLatencyMs: number;
  errorRate: number;
};

export type KeyUsage = {
  apiKeyId: string;
  developerId: string | null;
  name: string;
  keyPrefix: string;
  environment: string;
  status: string;
  developerName: string;
  developerEmail: string | null;
  company: string | null;
  plan: string;
  requests: number;
  errors: number;
  successRate: number;
  averageLatencyMs: number;
  lastUsedAt: string | null;
  dailyQuota: number | null;
  monthlyQuota: number | null;
  rateLimitPerMinute: number | null;
};

export type DailyUsage = {
  date: string;
  requests: number;
  errors: number;
  averageLatencyMs: number;
};

export type RecentRequest = {
  id: number;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  apiKeyName: string;
  keyPrefix: string | null;
  developerName: string;
};

export type UsageAnalytics = {
  generatedAt: string;
  summary: UsageSummary;
  dailyUsage: DailyUsage[];
  topEndpoints: EndpointUsage[];
  keyUsage: KeyUsage[];
  recentRequests: RecentRequest[];
};

type DeveloperAccountRow = {
  name: string | null;
  email: string | null;
  company: string | null;
  plan: string | null;
  status: string | null;
};

type ApiKeyRow = {
  id: string;
  developer_id: string | null;
  name: string | null;
  key_prefix: string | null;
  environment: string | null;
  status: string | null;
  daily_quota: number | null;
  monthly_quota: number | null;
  rate_limit_per_minute: number | null;
  last_used_at: string | null;
  fx_developer_accounts?: DeveloperAccountRow | DeveloperAccountRow[] | null;
};

type UsageLogRow = {
  id: number;
  api_key_id: string | null;
  developer_id: string | null;
  request_id: string;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

function normalizeDeveloper(
  developer: DeveloperAccountRow | DeveloperAccountRow[] | null | undefined,
): DeveloperAccountRow | null {
  if (Array.isArray(developer)) return developer[0] ?? null;
  return developer ?? null;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))] ?? 0;
}

function getDateKey(value: string) {
  return value.slice(0, 10);
}

function buildPeriodDates(days: number) {
  const dates: string[] = [];
  const today = new Date();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    dates.push(date.toISOString().slice(0, 10));
  }

  return dates;
}

function getUsageStatus(errorRate: number, averageLatencyMs: number): UsageStatus {
  if (errorRate >= 10 || averageLatencyMs >= 1500) return "attention";
  if (errorRate >= 3 || averageLatencyMs >= 800) return "watch";
  return "healthy";
}

export async function getApiUsageAnalytics(periodDays = 30): Promise<UsageAnalytics> {
  const safePeriodDays = Math.min(Math.max(Math.round(periodDays), 1), 90);
  const since = new Date();
  since.setDate(since.getDate() - safePeriodDays);

  const [keysResult, logsResult] = await Promise.all([
    supabaseServer
      .from("fx_api_keys")
      .select(
        "id, developer_id, name, key_prefix, environment, status, daily_quota, monthly_quota, rate_limit_per_minute, last_used_at, fx_developer_accounts(name, email, company, plan, status)",
      )
      .order("created_at", { ascending: false }),
    supabaseServer
      .from("fx_api_usage_logs")
      .select(
        "id, api_key_id, developer_id, request_id, method, path, status_code, duration_ms, ip_address, user_agent, created_at",
      )
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  if (keysResult.error) {
    throw new Error(keysResult.error.message);
  }

  if (logsResult.error) {
    throw new Error(logsResult.error.message);
  }

  const keys = (keysResult.data ?? []) as ApiKeyRow[];
  const logs = (logsResult.data ?? []) as UsageLogRow[];

  const keysById = new Map(keys.map((key) => [key.id, key]));
  const latencyValues = logs.map((log) => Number(log.duration_ms) || 0);
  const totalRequests = logs.length;
  const failedRequests = logs.filter((log) => log.status_code >= 400).length;
  const successfulRequests = totalRequests - failedRequests;
  const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
  const averageLatencyMs = average(latencyValues);
  const p95LatencyMs = percentile(latencyValues, 95);
  const observedKeys = new Set(logs.map((log) => log.api_key_id).filter(Boolean)).size;

  const endpointMap = new Map<string, UsageLogRow[]>();
  const keyMap = new Map<string, UsageLogRow[]>();
  const dailyMap = new Map<string, UsageLogRow[]>();

  for (const log of logs) {
    const endpointKey = `${log.method} ${log.path}`;
    endpointMap.set(endpointKey, [...(endpointMap.get(endpointKey) ?? []), log]);

    if (log.api_key_id) {
      keyMap.set(log.api_key_id, [...(keyMap.get(log.api_key_id) ?? []), log]);
    }

    const dateKey = getDateKey(log.created_at);
    dailyMap.set(dateKey, [...(dailyMap.get(dateKey) ?? []), log]);
  }

  const topEndpoints: EndpointUsage[] = [...endpointMap.entries()]
    .map(([key, endpointLogs]) => {
      const [method, ...pathParts] = key.split(" ");
      const path = pathParts.join(" ");
      const errors = endpointLogs.filter((log) => log.status_code >= 400).length;
      const requests = endpointLogs.length;

      return {
        method,
        path,
        requests,
        errors,
        averageLatencyMs: Math.round(average(endpointLogs.map((log) => log.duration_ms))),
        errorRate: round(requests > 0 ? (errors / requests) * 100 : 0),
      };
    })
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10);

  const keyUsage: KeyUsage[] = keys
    .map((key) => {
      const developer = normalizeDeveloper(key.fx_developer_accounts);
      const keyLogs = keyMap.get(key.id) ?? [];
      const requests = keyLogs.length;
      const errors = keyLogs.filter((log) => log.status_code >= 400).length;

      return {
        apiKeyId: key.id,
        developerId: key.developer_id,
        name: key.name ?? "Unnamed key",
        keyPrefix: key.key_prefix ?? "srfx_••••",
        environment: key.environment ?? "live",
        status: key.status ?? "unknown",
        developerName: developer?.name ?? "Unknown developer",
        developerEmail: developer?.email ?? null,
        company: developer?.company ?? null,
        plan: developer?.plan ?? "free",
        requests,
        errors,
        successRate: round(requests > 0 ? ((requests - errors) / requests) * 100 : 0),
        averageLatencyMs: Math.round(average(keyLogs.map((log) => log.duration_ms))),
        lastUsedAt: key.last_used_at,
        dailyQuota: key.daily_quota,
        monthlyQuota: key.monthly_quota,
        rateLimitPerMinute: key.rate_limit_per_minute,
      };
    })
    .sort((a, b) => b.requests - a.requests);

  const dailyUsage: DailyUsage[] = buildPeriodDates(safePeriodDays).map((date) => {
    const dailyLogs = dailyMap.get(date) ?? [];
    const errors = dailyLogs.filter((log) => log.status_code >= 400).length;

    return {
      date,
      requests: dailyLogs.length,
      errors,
      averageLatencyMs: Math.round(average(dailyLogs.map((log) => log.duration_ms))),
    };
  });

  const recentRequests: RecentRequest[] = logs.slice(0, 50).map((log) => {
    const key = log.api_key_id ? keysById.get(log.api_key_id) : null;
    const developer = normalizeDeveloper(key?.fx_developer_accounts);

    return {
      id: log.id,
      requestId: log.request_id,
      method: log.method,
      path: log.path,
      statusCode: log.status_code,
      durationMs: log.duration_ms,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      createdAt: log.created_at,
      apiKeyName: key?.name ?? "Unauthenticated/public",
      keyPrefix: key?.key_prefix ?? null,
      developerName: developer?.name ?? "Unknown developer",
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: round(successRate),
      errorRate: round(errorRate),
      averageLatencyMs: Math.round(averageLatencyMs),
      p95LatencyMs,
      activeKeys: keys.filter((key) => key.status === "active").length,
      observedKeys,
      periodDays: safePeriodDays,
      status: getUsageStatus(errorRate, averageLatencyMs),
    },
    dailyUsage,
    topEndpoints,
    keyUsage,
    recentRequests,
  };
}
