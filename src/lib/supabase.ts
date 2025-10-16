import { createClient } from '@supabase/supabase-js'

function req(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} is not set`)
  return v
}

export function getSupabaseAnon() {
  return createClient(req('SUPABASE_URL'), req('SUPABASE_ANON_KEY'))
}

export function getSupabaseService() {
  return createClient(req('SUPABASE_URL'), req('SUPABASE_SERVICE_ROLE'), {
    auth: { persistSession: false },
  })
}
