import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[Supabase] ENV VARS MISSING:\n' +
    '  NEXT_PUBLIC_SUPABASE_URL =', SUPABASE_URL, '\n' +
    '  NEXT_PUBLIC_SUPABASE_ANON_KEY =', SUPABASE_ANON_KEY ? 'ada' : 'KOSONG'
  )
}

export function createClient() {
  const url = SUPABASE_URL || ''
  const key = SUPABASE_ANON_KEY || ''
  return createBrowserClient(url, key)
}
