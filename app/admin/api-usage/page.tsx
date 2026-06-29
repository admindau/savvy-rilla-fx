import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getApiUsageAnalytics, type UsageStatus } from "@/lib/admin/api-usage-analytics";

const numberFormat = new Intl.NumberFormat("en");
const percentFormat = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
});

function formatNumber(value: number) {
  return numberFormat.format(value);
}

function formatPercent(value: number) {
  return `${percentFormat.format(value)}%`;
}

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: UsageStatus) {
  if (status === "attention") return "Attention";
  if (status === "watch") return "Watch";
  return "Healthy";
}

function statusClass(status: UsageStatus) {
  if (status === "attention") return "border-red-400/30 bg-red-400/10 text-red-100";
  if (status === "watch") return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
}

function barWidth(value: number, max: number) {
  if (max <= 0) return "0%";
  return `${Math.max(4, Math.round((value / max) * 100))}%`;
}

export default async function AdminApiUsagePage() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    redirect("/admin/login");
  }

  const analytics = await getApiUsageAnalytics(30);
  const maxDailyRequests = Math.max(...analytics.dailyUsage.map((item) => item.requests), 1);
  const maxEndpointRequests = Math.max(...analytics.topEndpoints.map((item) => item.requests), 1);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Savvy Rilla FX Admin
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">API Usage Monitoring</h1>
              <p className="mt-2 max-w-3xl text-sm text-white/60">
                Monitor developer API consumption, endpoint performance, latency, and request
                health across the Savvy Rilla FX API.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/api-keys"
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
              >
                API keys
              </Link>
              <span
                className={`rounded-full border px-4 py-2 text-sm ${statusClass(
                  analytics.summary.status,
                )}`}
              >
                {statusLabel(analytics.summary.status)}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Requests"
            value={formatNumber(analytics.summary.totalRequests)}
            helper={`Last ${analytics.summary.periodDays} days`}
          />
          <MetricCard
            label="Success rate"
            value={formatPercent(analytics.summary.successRate)}
            helper={`${formatNumber(analytics.summary.failedRequests)} failed requests`}
          />
          <MetricCard
            label="Average latency"
            value={`${formatNumber(analytics.summary.averageLatencyMs)}ms`}
            helper={`P95 ${formatNumber(analytics.summary.p95LatencyMs)}ms`}
          />
          <MetricCard
            label="Active keys"
            value={formatNumber(analytics.summary.activeKeys)}
            helper={`${formatNumber(analytics.summary.observedKeys)} keys used recently`}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Daily request trend</h2>
                <p className="mt-1 text-sm text-white/50">
                  Requests and errors recorded from API-key-authenticated traffic.
                </p>
              </div>
              <p className="text-xs text-white/40">
                Updated {formatDateTime(analytics.generatedAt)}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {analytics.dailyUsage.map((day) => (
                <div key={day.date} className="grid gap-2 sm:grid-cols-[110px_1fr_90px] sm:items-center">
                  <p className="text-xs text-white/45">{day.date.slice(5)}</p>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-white/80"
                      style={{ width: barWidth(day.requests, maxDailyRequests) }}
                    />
                  </div>
                  <p className="text-right text-xs text-white/55">
                    {formatNumber(day.requests)}
                    {day.errors > 0 && (
                      <span className="ml-2 text-red-200">({formatNumber(day.errors)} err)</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Top endpoints</h2>
            <p className="mt-1 text-sm text-white/50">
              Most-used endpoints over the current monitoring period.
            </p>

            <div className="mt-6 space-y-4">
              {analytics.topEndpoints.length === 0 ? (
                <p className="text-sm text-white/45">No endpoint usage recorded yet.</p>
              ) : (
                analytics.topEndpoints.map((endpoint) => (
                  <div key={`${endpoint.method}-${endpoint.path}`} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium">
                        <span className="mr-2 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
                          {endpoint.method}
                        </span>
                        {endpoint.path}
                      </p>
                      <p className="text-xs text-white/50">{formatNumber(endpoint.requests)}</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-white/75"
                        style={{ width: barWidth(endpoint.requests, maxEndpointRequests) }}
                      />
                    </div>
                    <p className="text-xs text-white/40">
                      Avg {formatNumber(endpoint.averageLatencyMs)}ms · Error{" "}
                      {formatPercent(endpoint.errorRate)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold">API key usage</h2>
            <p className="mt-1 text-sm text-white/50">
              Request volume by key, developer, plan, quota, and latency.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-white/35">
                <tr>
                  <th className="px-6 py-4 font-medium">Developer</th>
                  <th className="px-6 py-4 font-medium">Key</th>
                  <th className="px-6 py-4 font-medium">Requests</th>
                  <th className="px-6 py-4 font-medium">Success</th>
                  <th className="px-6 py-4 font-medium">Avg latency</th>
                  <th className="px-6 py-4 font-medium">Quota</th>
                  <th className="px-6 py-4 font-medium">Last used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {analytics.keyUsage.map((key) => (
                  <tr key={key.apiKeyId}>
                    <td className="px-6 py-4">
                      <p className="font-medium">{key.developerName}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {key.developerEmail ?? "No email"} · {key.plan}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p>{key.name}</p>
                      <p className="mt-1 font-mono text-xs text-white/40">
                        {key.keyPrefix}••••
                      </p>
                    </td>
                    <td className="px-6 py-4">{formatNumber(key.requests)}</td>
                    <td className="px-6 py-4">{formatPercent(key.successRate)}</td>
                    <td className="px-6 py-4">{formatNumber(key.averageLatencyMs)}ms</td>
                    <td className="px-6 py-4 text-xs text-white/50">
                      {formatNumber(key.dailyQuota ?? 0)}/day ·{" "}
                      {formatNumber(key.monthlyQuota ?? 0)}/month
                    </td>
                    <td className="px-6 py-4 text-xs text-white/50">
                      {formatDateTime(key.lastUsedAt)}
                    </td>
                  </tr>
                ))}

                {analytics.keyUsage.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-white/45">
                      No API keys found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold">Recent requests</h2>
            <p className="mt-1 text-sm text-white/50">
              Latest request logs captured by the API usage tracker.
            </p>
          </div>

          <div className="divide-y divide-white/10">
            {analytics.recentRequests.map((request) => (
              <article key={request.id} className="grid gap-3 px-6 py-4 lg:grid-cols-[1.2fr_0.9fr_0.7fr_0.7fr] lg:items-center">
                <div>
                  <p className="text-sm font-medium">
                    <span className="mr-2 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
                      {request.method}
                    </span>
                    {request.path}
                  </p>
                  <p className="mt-1 font-mono text-xs text-white/35">
                    {request.requestId}
                  </p>
                </div>
                <div className="text-sm text-white/55">
                  <p>{request.apiKeyName}</p>
                  <p className="mt-1 text-xs text-white/35">
                    {request.keyPrefix ? `${request.keyPrefix}••••` : "No key prefix"}
                  </p>
                </div>
                <div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      request.statusCode >= 400
                        ? "bg-red-400/10 text-red-200"
                        : "bg-emerald-400/10 text-emerald-200"
                    }`}
                  >
                    {request.statusCode}
                  </span>
                  <span className="ml-2 text-xs text-white/45">
                    {formatNumber(request.durationMs)}ms
                  </span>
                </div>
                <p className="text-xs text-white/45">{formatDateTime(request.createdAt)}</p>
              </article>
            ))}

            {analytics.recentRequests.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-white/45">
                No request logs recorded yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-white/35">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-white/45">{helper}</p>
    </div>
  );
}
