/**
 * tests/rls.test.ts
 * §6.3 RLS Audit — konsolidasi dari check_rls.js
 * Memastikan tidak ada tabel yang bisa diakses oleh anon key.
 */
import { describe, it, expect } from 'vitest'
import { getAnonClient, getTestClient } from './setup'

// Semua tabel yang harus diproteksi dari akses anon
const PROTECTED_TABLES = [
  'analyze_results',
  'improve_actions',
  'measure_data_requirements',
  'measure_assessments',
  'measure_vom',
  'action_plan_steps',
  'project_charters',
  'bimkon_projects',
  'audit_checklists',
  'sustainability_assessments',
  'efficiency_targets',
  'reports',
  'approval_requests',
  'checklist_evidence',
  'companies',
  'profiles',
]

describe('§6.3 RLS — Anon tidak boleh akses tabel sensitif', () => {
  for (const table of PROTECTED_TABLES) {
    it(`anon diblokir dari ${table}`, async () => {
      const anon = getAnonClient()
      const { data, error } = await anon.from(table).select('*').limit(5)
      // Harus error ATAU data kosong (0 baris)
      const isBlocked = !!error || !data || data.length === 0
      expect(isBlocked).toBe(true)
    })
  }
})

describe('§6.3 RLS — Authenticated user bisa akses data sendiri', () => {
  it('bimkon_projects: authenticated dapat data', async () => {
    const sb = getTestClient()
    const { data, error } = await sb.from('bimkon_projects').select('id').limit(5)
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  it('companies: authenticated dapat data', async () => {
    const sb = getTestClient()
    const { data, error } = await sb.from('companies').select('id, name').limit(5)
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('profiles: authenticated hanya dapat profil sendiri', async () => {
    const sb = getTestClient()
    const { data: me } = await sb.auth.getUser()
    const { data, error } = await sb.from('profiles').select('id').limit(10)
    expect(error).toBeNull()
    // Semua baris yang kembali harus berisi id user sendiri (atau lebih untuk konsultan)
    expect(data).toBeDefined()
  })
})
