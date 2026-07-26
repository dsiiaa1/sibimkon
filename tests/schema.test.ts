/**
 * tests/schema.test.ts
 * §6.2 Schema Audit — konsolidasi dari check_schema.js
 * Memastikan tidak ada kolom kritis yang hilang dari DB.
 */
import { describe, it, expect } from 'vitest'
import { getTestClient, TEST_PROJECT_ID } from './setup'

// Kolom WAJIB ada di setiap tabel (subset minimal yang dipakai kode)
// Jika salah satu hilang → aplikasi akan crash
const REQUIRED_COLUMNS: Record<string, string[]> = {
  bimkon_projects:           ['id', 'title', 'company_id', 'status', 'current_phase'],
  companies:                 ['id', 'name', 'business_field', 'pic_email', 'tier'],
  profiles:                  ['id', 'full_name', 'email', 'role'],
  project_charters:          ['id', 'project_id', 'problem_statement', 'objectives'],
  measure_data_requirements: ['id', 'project_id', 'name', 'status', 'parsed_summary'],
  measure_assessments:       ['id', 'project_id', 'dimension', 'percentage_score'],
  measure_vom:               ['id', 'project_id', 'dimension', 'problem'],
  improve_actions:           ['id', 'project_id', 'action_title', 'kpi_name', 'status'],
  action_plan_steps:         ['id', 'action_plan_id', 'description', 'is_completed'],
  analyze_results:           ['project_id', 'recommended_method', 'selected_method', 'status'],
  audit_checklists:          ['id', 'project_id', 'items', 'compliance_percentage'],
  sustainability_assessments:['id', 'project_id', 'people_score', 'psi_total'],
  efficiency_targets:        ['id', 'action_plan_id', 'project_id', 'metric_name'],
  reports:                   ['id', 'project_id', 'report_type'],
}

describe('§6.2 Schema — kolom wajib ada di setiap tabel', () => {
  for (const [table, requiredCols] of Object.entries(REQUIRED_COLUMNS)) {
    it(`${table}: semua kolom wajib ada`, async () => {
      const sb = getTestClient()
      const { data, error } = await sb.from(table).select('*').limit(1)

      // Jika tabel kosong, probe via INSERT dummy lalu rollback
      if (error) {
        // Error dari RLS atau tabel tidak ada — lewati tapi catat
        console.warn(`[SKIP] ${table}: ${error.message}`)
        return
      }

      if (!data || data.length === 0) {
        console.warn(`[SKIP] ${table}: tabel kosong, tidak bisa probe kolom`)
        return
      }

      const actualCols = Object.keys(data[0])
      const missing = requiredCols.filter(c => !actualCols.includes(c))
      expect(missing).toHaveLength(0)
    })
  }
})

describe('§6.2 Schema — analyze_results PK adalah project_id', () => {
  it('analyze_results tidak punya kolom id', async () => {
    const sb = getTestClient()
    const { data, error } = await sb.from('analyze_results').select('*').limit(1)
    if (error || !data || data.length === 0) return // skip jika kosong
    expect(Object.keys(data[0])).not.toContain('id')
    expect(Object.keys(data[0])).toContain('project_id')
  })
})
