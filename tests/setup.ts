/**
 * tests/setup.ts
 * Setup global untuk semua test Supabase.
 * Dibaca otomatis oleh vitest via setupFiles.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { beforeAll, afterAll } from 'vitest'

// Load .env.local
const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
const env: Record<string, string> = {}
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=')
  if (k && v.length) env[k.trim()] = v.join('=').trim()
})

export const SUPABASE_URL  = env.NEXT_PUBLIC_SUPABASE_URL
export const ANON_KEY      = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const TEST_EMAIL    = env.TEST_USER_EMAIL
export const TEST_PASSWORD = env.TEST_USER_PASSWORD

// Project ID yang aman dipakai untuk test write (milik company test user)
export const TEST_PROJECT_ID = 'ab24090f-588c-43e2-9cb9-7f9b19a21a53'

let _sb: SupabaseClient | null = null

export function getTestClient(): SupabaseClient {
  if (!_sb) _sb = createClient(SUPABASE_URL, ANON_KEY)
  return _sb
}

export function getAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY)
}

beforeAll(async () => {
  const sb = getTestClient()
  const { error } = await sb.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (error) throw new Error(`Login test user gagal: ${error.message}`)
})

afterAll(async () => {
  const sb = getTestClient()
  await sb.auth.signOut()
})
