"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  environment: string;
  status: string;
  daily_quota: number | null;
  monthly_quota: number | null;
  rate_limit_per_minute: number | null;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  fx_developer_accounts?: {
    name: string | null;
    email: string | null;
    company: string | null;
    plan: string | null;
    status: string | null;
  } | null;
};

type CreatedKey = {
  key: string;
  prefix: string;
  environment: string;
};

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);

  const [developerName, setDeveloperName] = useState("");
  const [developerEmail, setDeveloperEmail] = useState("");
  const [company, setCompany] = useState("");
  const [keyName, setKeyName] = useState("Default API key");
  const [environment, setEnvironment] = useState<"test" | "live">("live");
  const [plan, setPlan] = useState("free");
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState("120");
  const [dailyQuota, setDailyQuota] = useState("1000");
  const [monthlyQuota, setMonthlyQuota] = useState("30000");

  async function loadKeys() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/api-keys");
      const json = await res.json();

      if (!res.ok) {
        setMessage(json.error || "Failed to load API keys.");
        return;
      }

      setKeys(json.keys ?? []);
    } catch {
      setMessage("Unexpected error while loading API keys.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialize = async () => {
      await loadKeys();
    };

    void initialize();
  }, []);

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setCreatedKey(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          developerName,
          developerEmail,
          company,
          keyName,
          environment,
          plan,
          rateLimitPerMinute: Number(rateLimitPerMinute),
          dailyQuota: Number(dailyQuota),
          monthlyQuota: Number(monthlyQuota),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMessage(json.error || "Failed to create API key.");
        return;
      }

      setCreatedKey(json.apiKey);
      setMessage("API key created. Copy it now; it will not be shown again.");
      setDeveloperName("");
      setDeveloperEmail("");
      setCompany("");
      setKeyName("Default API key");
      await loadKeys();
    } catch {
      setMessage("Unexpected error while creating API key.");
    } finally {
      setSaving(false);
    }
  }

  async function revokeKey(id: string) {
    setMessage(null);

    const res = await fetch(`/api/admin/api-keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke" }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setMessage(json.error || "Failed to revoke API key.");
      return;
    }

    setMessage("API key revoked.");
    await loadKeys();
  }

  const activeCount = useMemo(
    () => keys.filter((key) => key.status === "active").length,
    [keys],
  );

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Savvy Rilla FX Admin
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">API Keys</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/60">
                Create, monitor, and revoke developer keys for the Savvy Rilla FX API.
                Keys are stored as hashes and the full secret is shown only once.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm">
              <p className="text-white/50">Active keys</p>
              <p className="mt-1 text-2xl font-semibold">{activeCount}</p>
            </div>
          </div>
        </header>

        {message && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75">
            {message}
          </div>
        )}

        {createdKey && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5">
            <p className="text-sm font-semibold text-emerald-100">New API key</p>
            <p className="mt-2 text-xs text-emerald-100/70">
              Copy this key now. It will not be shown again.
            </p>
            <code className="mt-4 block overflow-x-auto rounded-xl border border-emerald-400/20 bg-black/60 p-4 text-sm text-emerald-100">
              {createdKey.key}
            </code>
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          <form
            onSubmit={createKey}
            className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6"
          >
            <h2 className="text-lg font-semibold">Create developer key</h2>

            <label className="block text-sm">
              <span className="text-white/60">Developer name</span>
              <input
                value={developerName}
                onChange={(event) => setDeveloperName(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-white/40"
              />
            </label>

            <label className="block text-sm">
              <span className="text-white/60">Developer email</span>
              <input
                value={developerEmail}
                onChange={(event) => setDeveloperEmail(event.target.value)}
                type="email"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-white/40"
              />
            </label>

            <label className="block text-sm">
              <span className="text-white/60">Company</span>
              <input
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-white/40"
              />
            </label>

            <label className="block text-sm">
              <span className="text-white/60">Key name</span>
              <input
                value={keyName}
                onChange={(event) => setKeyName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-white/40"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-white/60">Environment</span>
                <select
                  value={environment}
                  onChange={(event) => setEnvironment(event.target.value as "test" | "live")}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-white/40"
                >
                  <option value="live">Live</option>
                  <option value="test">Test</option>
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-white/60">Plan</span>
                <select
                  value={plan}
                  onChange={(event) => setPlan(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-white/40"
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="text-white/60">Per minute</span>
                <input
                  value={rateLimitPerMinute}
                  onChange={(event) => setRateLimitPerMinute(event.target.value)}
                  type="number"
                  min="1"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-white/40"
                />
              </label>

              <label className="block text-sm">
                <span className="text-white/60">Daily</span>
                <input
                  value={dailyQuota}
                  onChange={(event) => setDailyQuota(event.target.value)}
                  type="number"
                  min="1"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-white/40"
                />
              </label>

              <label className="block text-sm">
                <span className="text-white/60">Monthly</span>
                <input
                  value={monthlyQuota}
                  onChange={(event) => setMonthlyQuota(event.target.value)}
                  type="number"
                  min="1"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-white/40"
                />
              </label>
            </div>

            <button
              disabled={saving}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create API key"}
            </button>
          </form>

          <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold">Developer keys</h2>
              <button
                onClick={() => void loadKeys()}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:border-white/30"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="p-6 text-sm text-white/50">Loading API keys…</p>
            ) : keys.length === 0 ? (
              <p className="p-6 text-sm text-white/50">No API keys yet.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {keys.map((key) => (
                  <article key={key.id} className="space-y-3 p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium">{key.name}</h3>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase text-white/50">
                            {key.environment}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] uppercase ${
                              key.status === "active"
                                ? "bg-emerald-400/10 text-emerald-200"
                                : "bg-red-400/10 text-red-200"
                            }`}
                          >
                            {key.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-white/50">
                          {key.fx_developer_accounts?.name ?? "Unknown developer"} ·{" "}
                          {key.fx_developer_accounts?.email ?? "No email"}
                        </p>
                        <code className="mt-3 block text-xs text-white/50">
                          {key.key_prefix}••••••••••••
                        </code>
                      </div>

                      {key.status === "active" && (
                        <button
                          onClick={() => void revokeKey(key.id)}
                          className="rounded-full border border-red-400/30 px-3 py-1 text-xs text-red-200 hover:bg-red-400/10"
                        >
                          Revoke
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 text-xs text-white/50 sm:grid-cols-4">
                      <p>Plan: {key.fx_developer_accounts?.plan ?? "free"}</p>
                      <p>Rate: {key.rate_limit_per_minute ?? 120}/min</p>
                      <p>Daily: {key.daily_quota ?? 1000}</p>
                      <p>Last used: {formatDate(key.last_used_at)}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
