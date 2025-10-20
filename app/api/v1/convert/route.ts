import { getSupabaseService } from '@/lib/supabase';
import { badRequest, internalError, ok } from '@/lib/util';

export const dynamic = 'force-dynamic';

type RateRow = { rate_date: string; rate: number };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = (url.searchParams.get('from') || '').toUpperCase();
  const to = (url.searchParams.get('to') || '').toUpperCase();
  const amountRaw = url.searchParams.get('amount') || '1';

  if (!from || !to) return badRequest('from and to are required');
  const amount = Number(amountRaw);
  if (!isFinite(amount) || amount < 0) return badRequest('amount must be a non-negative number');
  if (from === to) return ok({ success: true, from, to, amount, rate: 1, result: amount }, 60);

  try {
    const s = getSupabaseService();

    // Direct: FROM -> TO
    {
      const res = await s.from('fx_rates').select('rate_date, rate').eq('base', from).eq('quote', to).order('rate_date', { ascending: false }).limit(1).maybeSingle();
      const direct = (res?.data ?? null) as RateRow | null;
      if (direct?.rate) {
        const rate = Number(direct.rate);
        return ok({ success: true, from, to, amount, rate, result: amount * rate, date: direct.rate_date }, 120);
      }
    }

    // Reverse: TO -> FROM (invert)
    {
      const res = await s.from('fx_rates').select('rate_date, rate').eq('base', to).eq('quote', from).order('rate_date', { ascending: false }).limit(1).maybeSingle();
      const reverse = (res?.data ?? null) as RateRow | null;
      if (reverse?.rate) {
        const r = Number(reverse.rate);
        const rate = r > 0 ? 1 / r : NaN;
        if (!isFinite(rate)) return internalError('invalid reverse rate');
        return ok({ success: true, from, to, amount, rate, result: amount * rate, date: reverse.rate_date }, 120);
      }
    }

    // Cross via USD if both base->USD exist
    {
      const bases = [from, to];
      const res = await s.from('fx_rates').select('base, quote, rate, rate_date').in('base', bases).eq('quote', 'USD').order('rate_date', { ascending: false });
      const via = (res?.data ?? []) as Array<{ base: string; quote: string; rate: number; rate_date: string }>;
      const byBase = new Map<string, { rate: number; date: string }>();
      for (const r of via) if (!byBase.has(r.base)) byBase.set(r.base, { rate: Number(r.rate), date: r.rate_date });
      const a = byBase.get(from), b = byBase.get(to);
      if (a?.rate && b?.rate) {
        const rate = a.rate / b.rate;
        const date = a.date <= b.date ? a.date : b.date;
        return ok({ success: true, from, to, amount, rate, result: amount * rate, date }, 120);
      }
    }

    return badRequest(`No rate path found for ${from} -> ${to}. Ensure direct/reverse pairs, or both base->USD exist.`);
  } catch (e: any) {
    return internalError(e?.message ?? 'convert failed');
  }
}
