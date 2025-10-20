import { getSupabaseService } from '@/lib/supabase';
import { json, internalError } from '@/lib/util';

export const dynamic = 'force-dynamic';

type DateRow = { rate_date: string };

export async function GET() {
  try {
    const s = getSupabaseService();
    const res = await s.from('fx_rates').select('rate_date').order('rate_date', { ascending: false }).limit(1).maybeSingle();
    if (res.error) throw res.error;
    const row = (res.data ?? null) as DateRow | null;
    const lastDate = row?.rate_date ?? null;

    return json({ success: true, service: 'Savvy Rilla FX API', last_date: lastDate, now: new Date().toISOString() }, 200, 60);
  } catch (e: any) {
    return internalError(e?.message ?? 'status failed');
  }
}
