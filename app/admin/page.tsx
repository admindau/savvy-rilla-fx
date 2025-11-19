// app/admin/page.tsx
"use client";

import { useState } from "react";

type SaveState = "idle" | "saving" | "success" | "error";

export default function AdminPage() {
  const [asOfDate, setAsOfDate] = useState<string>(() => {
    // default to today in YYYY-MM-DD
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  });
  const [quoteCurrency, setQuoteCurrency] = useState<string>("USD");
  const [rateMid, setRateMid] = useState<string>("");
  const [isOfficial, setIsOfficial] = useState<boolean>(true);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveState("saving");
    setMessage(null);

    try {
      const parsedRate = Number(rateMid);
      if (!asOfDate || !quoteCurrency || !parsedRate || Number.isNaN(parsedRate)) {
        setSaveState("error");
        setMessage("Please fill in date, currency, and a valid numeric rate.");
        return;
      }

      const res = await fetch("/api/admin/manual-rate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asOfDate,
          quoteCurrency,
          rateMid: parsedRate,
          isOfficial,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.error) {
        setSaveState("error");
        setMessage(json?.error || json?.message || "Failed to save FX rate.");
        return;
      }

      setSaveState("success");
      setMessage(json?.message || "FX rate saved successfully.");

      // Optionally clear rate only, keep date & currency
      setRateMid("");
    } catch (err: any) {
      setSaveState("error");
      setMessage(
        err?.message ? `Unexpected error: ${err.message}` : "Unexpected error while saving FX rate.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl bg-white/5">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-center">
            Savvy Rilla FX – Admin
          </h1>
          <p className="mt-2 text-sm text-center text-white/70">
            Manual mid-rate entry for SSP vs global currencies.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">
              As of date
            </label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full rounded-lg bg-black border border-white/20 px-3 py-2 text-sm outline-none focus:border-white focus:ring-1 focus:ring-white"
              required
            />
            <p className="text-xs text-white/60">
              Trading date the rate applies to.
            </p>
          </div>

          {/* Quote currency */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">
              Quote currency
            </label>
            <input
              type="text"
              value={quoteCurrency}
              onChange={(e) => setQuoteCurrency(e.target.value.toUpperCase())}
              className="w-full rounded-lg bg-black border border-white/20 px-3 py-2 text-sm uppercase tracking-wide outline-none focus:border-white focus:ring-1 focus:ring-white"
              placeholder="USD"
              maxLength={10}
              required
            />
            <p className="text-xs text-white/60">
              Example: <span className="font-mono">USD</span>,{" "}
              <span className="font-mono">EUR</span>,{" "}
              <span className="font-mono">KES</span>. Base is assumed to be SSP.
            </p>
          </div>

          {/* Mid rate */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">
              Mid rate
            </label>
            <input
              type="number"
              step="0.0001"
              value={rateMid}
              onChange={(e) => setRateMid(e.target.value)}
              className="w-full rounded-lg bg-black border border-white/20 px-3 py-2 text-sm outline-none focus:border-white focus:ring-1 focus:ring-wh
