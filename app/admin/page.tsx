// app/admin/page.tsx
import { supabaseServer } from "@/lib/supabase/server";
import { ManualRateForm } from "./ManualRateForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const availableQuotes = ["USD", "KES", "EUR", "GBP"];

  const { data: recent, error } = await supabaseServer
    .from("fx_daily_rates")
    .select(
      "as_of_date, base_currency, quote_currency, rate_mid, is_official, created_at"
    )
    .eq("base_currency", "SSP")
    .in("quote_currency", availableQuotes)
    .order("as_of_date", { ascending: false })
    .limit(10);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Savvy Rilla FX Admin
          </h1>
          <p className="text-sm text-zinc-400">
            Manual entry of SSP FX rates. Base currency is{" "}
            <span className="font-mono">SSP</span>. You record how many SSP you
            need for 1 unit of the selected quote currency.
          </p>
        </header>

        <ManualRateForm availableQuotes={availableQuotes} />

        <section className="mt-4">
          <h2 className="mb-2 text-sm font-medium text-zinc-200">
            Recent manual SSP FX rates
          </h2>

          {error && (
            <p className="text-xs text-red-400">
              Failed to load recent rates: {error.message}
            </p>
          )}

          {!error && (!recent || recent.length === 0) && (
            <p className="text-xs text-zinc-500">
              No manual FX rates found yet. Add one above to get started.
            </p>
          )}

          {recent && recent.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-900/60">
                  <tr>
                    <th className="px-3 py-2 font-medium text-zinc-300">
                      Date
                    </th>
                    <th className="px-3 py-2 font-medium text-zinc-300">
                      Pair
                    </th>
                    <th className="px-3 py-2 font-medium text-zinc-300">
                      Rate (SSP per 1 unit)
                    </th>
                    <th className="px-3 py-2 font-medium text-zinc-300">
                      Official?
                    </th>
                    <th className="px-3 py-2 font-medium text-zinc-300">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr
                      key={`${row.as_of_date}-${row.quote_currency}-${row.created_at}`}
                      className="border-b border-zinc-900/60 last:border-b-0"
                    >
                      <td className="px-3 py-2 text-zinc-200">
                        {row.as_of_date}
                      </td>
                      <td className="px-3 py-2 text-zinc-300">
                        {row.base_currency}/{row.quote_currency}
                      </td>
                      <td className="px-3 py-2 font-mono text-zinc-100">
                        {Number(row.rate_mid).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-zinc-300">
                        {row.is_official ? "Yes" : "No"}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
