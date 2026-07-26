/**
 * tests/validation-engine.test.ts
 * Unit test untuk Automated Data Validation Engine — PRD §5.2
 *
 * Menguji semua aturan validasi:
 *  1. null_check        — field wajib
 *  2. range_check       — nilai numerik dalam batas
 *  3. cross_consistency — konsistensi kpi_target vs kpi_baseline
 *  4. anomaly_spike     — deteksi lonjakan progress
 */
import { describe, it, expect } from 'vitest'
import { validateRecord, toAuditLogEntries } from '@/lib/validation-engine'

const PROJECT_ID = 'test-project-uuid'

describe('§5.2 Validation Engine — null_check', () => {
  it('improve_actions: field wajib lengkap → valid', () => {
    const report = validateRecord('improve_actions', 'rec-001', PROJECT_ID, {
      project_id: PROJECT_ID,
      action_title: 'Training Operator',
      kpi_name: 'Defect Rate',
      kpi_baseline: 12,
      kpi_target: 2,
      kpi_unit: '%',
    })
    expect(report.isValid).toBe(true)
    const nullErrors = report.results.filter(r => r.rule === 'null_check')
    expect(nullErrors).toHaveLength(0)
  })

  it('improve_actions: kpi_name kosong → error', () => {
    const report = validateRecord('improve_actions', 'rec-002', PROJECT_ID, {
      project_id: PROJECT_ID,
      action_title: 'Training Operator',
      kpi_name: '',
      kpi_baseline: 12,
      kpi_target: 2,
      kpi_unit: '%',
    })
    expect(report.isValid).toBe(false)
    const nullErrors = report.results.filter(r => r.rule === 'null_check' && r.field === 'kpi_name')
    expect(nullErrors).toHaveLength(1)
    expect(nullErrors[0].severity).toBe('error')
  })

  it('measure_assessments: semua field wajib ada', () => {
    const report = validateRecord('measure_assessments', 'rec-003', PROJECT_ID, {
      project_id: PROJECT_ID,
      dimension: 'productivity',
      percentage_score: 65,
    })
    expect(report.isValid).toBe(true)
  })
})

describe('§5.2 Validation Engine — range_check (AC: OEE/FPY 0-100%)', () => {
  it('oee = 85 → valid', () => {
    const report = validateRecord('measure_assessments', 'rec-010', PROJECT_ID, {
      project_id: PROJECT_ID, dimension: 'productivity', percentage_score: 85,
      oee: 85,
    })
    const rangeErrors = report.results.filter(r => r.rule === 'range_check' && r.field === 'oee')
    expect(rangeErrors).toHaveLength(0)
  })

  it('oee = 150 → error (di atas 100%)', () => {
    const report = validateRecord('improve_actions', 'rec-011', PROJECT_ID, {
      project_id: PROJECT_ID, action_title: 'x', kpi_name: 'OEE',
      kpi_baseline: 50, kpi_target: 80, kpi_unit: '%',
      oee: 150,
    })
    const rangeErrors = report.results.filter(r => r.rule === 'range_check' && r.field === 'oee')
    expect(rangeErrors).toHaveLength(1)
    expect(rangeErrors[0].severity).toBe('error')
  })

  it('oee = -5 → error (negatif)', () => {
    const report = validateRecord('improve_actions', 'rec-012', PROJECT_ID, {
      project_id: PROJECT_ID, action_title: 'x', kpi_name: 'OEE',
      kpi_baseline: 50, kpi_target: 80, kpi_unit: '%',
      oee: -5,
    })
    const rangeErrors = report.results.filter(r => r.rule === 'range_check' && r.field === 'oee')
    expect(rangeErrors).toHaveLength(1)
  })

  it('progress_percentage = 105 → error', () => {
    const report = validateRecord('improve_actions', 'rec-013', PROJECT_ID, {
      project_id: PROJECT_ID, action_title: 'x', kpi_name: 'x',
      kpi_baseline: 0, kpi_target: 10, kpi_unit: 'unit',
      progress_percentage: 105,
    })
    const rangeErrors = report.results.filter(r => r.rule === 'range_check' && r.field === 'progress_percentage')
    expect(rangeErrors).toHaveLength(1)
  })

  it('fpy = 99.5 → valid (edge case)', () => {
    const report = validateRecord('improve_actions', 'rec-014', PROJECT_ID, {
      project_id: PROJECT_ID, action_title: 'x', kpi_name: 'FPY',
      kpi_baseline: 80, kpi_target: 95, kpi_unit: '%',
      fpy: 99.5,
    })
    const rangeErrors = report.results.filter(r => r.rule === 'range_check' && r.field === 'fpy')
    expect(rangeErrors).toHaveLength(0)
  })
})

describe('§5.2 Validation Engine — cross_consistency', () => {
  it('kpi_target = kpi_baseline → warning', () => {
    const report = validateRecord('improve_actions', 'rec-020', PROJECT_ID, {
      project_id: PROJECT_ID, action_title: 'x', kpi_name: 'Defect',
      kpi_baseline: 10, kpi_target: 10, kpi_unit: '%',
    })
    const warnings = report.results.filter(r => r.rule === 'cross_consistency' && r.severity === 'warning')
    expect(warnings).toHaveLength(1)
    // Warning tidak memblokir isValid
    expect(report.isValid).toBe(true)
    expect(report.hasWarnings).toBe(true)
  })

  it('kpi_target !== kpi_baseline → tidak ada consistency warning', () => {
    const report = validateRecord('improve_actions', 'rec-021', PROJECT_ID, {
      project_id: PROJECT_ID, action_title: 'x', kpi_name: 'Defect',
      kpi_baseline: 12, kpi_target: 2, kpi_unit: '%',
    })
    const warnings = report.results.filter(r => r.rule === 'cross_consistency')
    expect(warnings).toHaveLength(0)
  })

  it('kpi_actual negatif dengan target positif → error', () => {
    const report = validateRecord('improve_actions', 'rec-022', PROJECT_ID, {
      project_id: PROJECT_ID, action_title: 'x', kpi_name: 'Defect',
      kpi_baseline: 12, kpi_target: 2, kpi_unit: '%',
      kpi_actual: -3,
    })
    const errors = report.results.filter(r => r.rule === 'cross_consistency' && r.field === 'kpi_actual')
    expect(errors).toHaveLength(1)
    expect(errors[0].severity).toBe('error')
  })
})

describe('§5.2 Validation Engine — anomaly_spike', () => {
  it('progress turun 25 poin → warning', () => {
    const report = validateRecord('improve_actions', 'rec-030', PROJECT_ID, {
      project_id: PROJECT_ID, action_title: 'x', kpi_name: 'x',
      kpi_baseline: 0, kpi_target: 10, kpi_unit: 'unit',
      progress_percentage: 40,
      _previous_progress: 65, // 65 → 40 = drop 25 poin
    })
    const spikes = report.results.filter(r => r.rule === 'anomaly_spike')
    expect(spikes).toHaveLength(1)
    expect(spikes[0].severity).toBe('warning')
    // Spike adalah warning, tidak memblokir isValid
    expect(report.isValid).toBe(true)
    expect(report.hasWarnings).toBe(true)
  })

  it('progress turun 5 poin → tidak ada anomali', () => {
    const report = validateRecord('improve_actions', 'rec-031', PROJECT_ID, {
      project_id: PROJECT_ID, action_title: 'x', kpi_name: 'x',
      kpi_baseline: 0, kpi_target: 10, kpi_unit: 'unit',
      progress_percentage: 60,
      _previous_progress: 65,
    })
    const spikes = report.results.filter(r => r.rule === 'anomaly_spike')
    expect(spikes).toHaveLength(0)
  })
})

describe('§5.2 Validation Engine — toAuditLogEntries', () => {
  it('gagal validasi → entries untuk data_audit_log', () => {
    const report = validateRecord('improve_actions', 'rec-040', PROJECT_ID, {
      project_id: PROJECT_ID,
      action_title: '',   // null check fail
      kpi_name: '',       // null check fail
      kpi_baseline: 0, kpi_target: 0, kpi_unit: '',
      oee: 150,           // range check fail
    })

    const entries = toAuditLogEntries(report)
    expect(entries.length).toBeGreaterThan(0)
    entries.forEach(e => {
      expect(e.source_table).toBe('improve_actions')
      expect(e.record_id).toBe('rec-040')
      expect(e.project_id).toBe(PROJECT_ID)
      expect(e.status).toBe('pending_review')
      expect(e.validation_rule_failed).toBeTruthy()
    })
  })

  it('data valid → tidak ada entries', () => {
    const report = validateRecord('improve_actions', 'rec-041', PROJECT_ID, {
      project_id: PROJECT_ID,
      action_title: 'Training',
      kpi_name: 'Defect Rate',
      kpi_baseline: 12, kpi_target: 2, kpi_unit: '%',
    })
    const entries = toAuditLogEntries(report)
    expect(entries).toHaveLength(0)
  })
})
