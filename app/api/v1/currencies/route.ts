import { getSupabaseService } from '@/lib/supabase';
import { json, internalError } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const s = getSupabaseService();
    const res = await s.from('currencies').select('code,name,decimals,active').eq('active', true).order('code', { ascending: true });
    if (res.error) throw res.error;
    return json({ success: true, data: res.data }, 200, 300);
  } catch (e: any) {
    return internalError(e?.message ?? 'failed to load currencies');
  }
}
