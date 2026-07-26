/**
 * tests/db-integration.test.ts
 * §6.1 Audit Integrasi DB — konsolidasi dari check_db.js
 * Menguji read/write semua tabel utama.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { getTestClient, TEST_PROJECT_ID } from './setup'

// Track rows yang perlu dihapus setelah test
const cleanup: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const fn of cleanup.splice(0)) await fn()
})

describe('§6.1 READ — semua tabel utama bisa dibaca authenticated', () => {
  const readTables = [
    'bimkon_projects', 'companies', 'profiles', 'project_charters',
    'measure_data_requirements', 'measure_assessments', 'measure_vom',
    'improve_actions', 'action_plan_steps', 'audit_checklists',
    'sustainability_assessments', 'efficiency_targets', 'reports',
    'checklist_evidence', 'analyze_results',
  ]

  for (const table of readTables) {
    it(`READ ${table}`, async () => {
      const sb = getTestClient()
      const { data, error } = await sb.from(table).select('*').limit(5)
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })
  }
})

describe('§6.1 WRITE — insert & cleanup', () => {
  it('INSERT + DELETE measure_data_requirements', async () => {
    const sb = getTestClient()
    const testName = `_VITEST_${Date.now()}`

    const { data, error } = await sb.from('measure_data_requirements').insert({
      project_id: TEST_PROJECT_ID,
      name: testName,
      description: 'vitest write test',
      reason: 'automated test §6.1',
      expected_format: 'csv',
      example_columns: ['col1'],
      status: 'Belum diupload',
      source: 'manual',
    }).select()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data![0].name).toBe(testName)

    cleanup.push(async () => {
      await sb.from('measure_data_requirements').delete().eq('name', testName)
    })
  })

  it('UPSERT analyze_results (PK = project_id)', async () => {
    const sb = getTestClient()
    const { data, error } = await sb.from('analyze_results').upsert({
      project_id: TEST_PROJECT_ID,
      recommended_method: '_VITEST_TEST',
      selected_method: '_VITEST_TEST',
      reasoning: 'automated test',
      summary: 'automated test',
      key_findings: ['test'],
      suggested_root_causes: ['test'],
      status: 'draft',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id' }).select()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    // Konfirmasi PK adalah project_id, bukan id
    expect(Object.keys(data![0])).toContain('project_id')
    expect(Object.keys(data![0])).not.toContain('id')
  })
})

describe('§6.1 LATENCY — query harus cepat', () => {
  it('bimkon_projects latency < 2000ms', async () => {
    const sb = getTestClient()
    const t0 = Date.now()
    const { error } = await sb.from('bimkon_projects').select('id').limit(10)
    const ms = Date.now() - t0
    expect(error).toBeNull()
    expect(ms).toBeLessThan(2000)
  })
})

describe('§6.1 DATA CONSISTENCY', () => {
  it('projects dengan status lanjut harus punya project_charter', async () => {
    const sb = getTestClient()
    const { data: projects } = await sb.from('bimkon_projects')
      .select('id, title, status')
      .in('status', ['measure', 'analyze', 'improve', 'control', 'completed'])

    const { data: charters } = await sb.from('project_charters').select('project_id')

    if (!projects || projects.length === 0) return // skip jika tidak ada data

    const charterIds = new Set(charters?.map(c => c.project_id) ?? [])
    const noCharter = projects.filter(p => !charterIds.has(p.id))
    expect(noCharter).toHaveLength(0)
  })
})
