import { createClient } from '@supabase/supabase-js';

let _service: ReturnType<typeof createClient> | null = null;

/** Server-side Supabase client using the Service Role key (never exposed to browser). */
export function getSupabaseService() {
  if (_service) return _service;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('SUPABASE_URL is required');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

  _service = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'savvy-rilla-fx/1.0' } },
  });
  return _service;
}
