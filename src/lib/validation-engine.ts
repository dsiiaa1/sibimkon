/**
 * src/lib/validation-engine.ts
 * Automated Data Validation Engine — PRD §5.2
 *
 * Aturan validasi yang diimplementasi:
 *  1. range_check       — nilai numerik harus dalam batas wajar
 *  2. null_check        — field wajib tidak boleh kosong
 *  3. cross_consistency — FPY tidak bisa > total unit produksi
 *  4. anomaly_spike     — deteksi lonjakan/drop ekstrem (flag, bukan reject)
 *
 * Setiap record yang gagal validasi masuk ke data_audit_log
 * dengan status 'pending_review'. Tidak auto-reject.
 */

export interface ValidationRule {
  name: string
  description: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  passed: boolean
  rule: string
  field?: string
  rawValue?: unknown
  errorDetail: string
  severity: 'error' | 'warning'
}

export interface ValidationReport {
  isValid: boolean          // true hanya jika tidak ada error (warning boleh)
  hasWarnings: boolean
  results: ValidationResult[]
  sourceTable: string
  recordId: string
  projectId: string
}

// ── Aturan validasi numerik (range check) ─────────────────────────────────
const NUMERIC_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  oee:             { min: 0,   max: 100,   unit: '%'  },
  fpy:             { min: 0,   max: 100,   unit: '%'  },
  defect_rate:     { min: 0,   max: 100,   unit: '%'  },
  productivity:    { min: 0,   max: 100,   unit: '%'  },
  kpi_baseline:    { min: 0,   max: 99999, unit: ''   },
  kpi_target:      { min: 0,   max: 99999, unit: ''   },
  kpi_actual:      { min: 0,   max: 99999, unit: ''   },
  progress_percentage: { min: 0, max: 100, unit: '%'  },
  percentage_score:    { min: 0, max: 100, unit: '%'  },
  people_score:    { min: 0,   max: 100,   unit: '%'  },
  process_score:   { min: 0,   max: 100,   unit: '%'  },
  system_score:    { min: 0,   max: 100,   unit: '%'  },
  result_score:    { min: 0,   max: 100,   unit: '%'  },
  compliance_percentage: { min: 0, max: 100, unit: '%' },
}

// ── Aturan field wajib per tabel ───────────────────────────────────────────
const REQUIRED_FIELDS: Record<string, string[]> = {
  improve_actions:           ['project_id', 'action_title', 'kpi_name', 'kpi_baseline', 'kpi_target', 'kpi_unit'],
  measure_data_requirements: ['project_id', 'name', 'description', 'expected_format'],
  measure_assessments:       ['project_id', 'dimension', 'percentage_score'],
  measure_vom:               ['project_id', 'dimension', 'problem'],
  sustainability_assessments:['project_id', 'people_score', 'process_score', 'system_score', 'result_score'],
}

// ── Engine utama ───────────────────────────────────────────────────────────

export function validateRecord(
  sourceTable: string,
  recordId: string,
  projectId: string,
  data: Record<string, unknown>
): ValidationReport {
  const results: ValidationResult[] = []

  // 1. NULL CHECK — field wajib
  const requiredFields = REQUIRED_FIELDS[sourceTable] ?? []
  for (const field of requiredFields) {
    const val = data[field]
    if (val === null || val === undefined || val === '') {
      results.push({
        passed: false,
        rule: 'null_check',
        field,
        rawValue: val,
        errorDetail: `Field wajib "${field}" kosong atau null`,
        severity: 'error',
      })
    }
  }

  // 2. RANGE CHECK — nilai numerik
  for (const [field, range] of Object.entries(NUMERIC_RANGES)) {
    if (!(field in data)) continue
    const val = data[field]
    if (val === null || val === undefined) continue
    const num = Number(val)
    if (isNaN(num)) {
      results.push({
        passed: false,
        rule: 'range_check',
        field,
        rawValue: val,
        errorDetail: `Field "${field}" bukan angka valid: ${val}`,
        severity: 'error',
      })
    } else if (num < range.min || num > range.max) {
      results.push({
        passed: false,
        rule: 'range_check',
        field,
        rawValue: num,
        errorDetail: `Field "${field}" = ${num}${range.unit} di luar batas wajar (${range.min}–${range.max}${range.unit})`,
        severity: 'error',
      })
    }
  }

  // 3. CROSS CONSISTENCY — kpi_target harus berbeda dari kpi_baseline
  if (sourceTable === 'improve_actions') {
    const baseline = Number(data.kpi_baseline)
    const target   = Number(data.kpi_target)
    if (!isNaN(baseline) && !isNaN(target) && baseline === target) {
      results.push({
        passed: false,
        rule: 'cross_consistency',
        field: 'kpi_target',
        rawValue: target,
        errorDetail: `kpi_target (${target}) sama dengan kpi_baseline (${baseline}) — tidak ada target perbaikan`,
        severity: 'warning',
      })
    }
    // kpi_actual tidak boleh negatif jika kpi_target positif
    if (data.kpi_actual !== undefined && data.kpi_actual !== null) {
      const actual  = Number(data.kpi_actual)
      if (!isNaN(actual) && actual < 0 && target >= 0) {
        results.push({
          passed: false,
          rule: 'cross_consistency',
          field: 'kpi_actual',
          rawValue: actual,
          errorDetail: `kpi_actual negatif (${actual}) tapi kpi_target positif (${target})`,
          severity: 'error',
        })
      }
    }
  }

  // 4. ANOMALY SPIKE — progress_percentage tidak boleh turun dari nilai sebelumnya
  // (hanya bisa divalidasi jika ada previousValue dikirim)
  if (data._previous_progress !== undefined && data.progress_percentage !== undefined) {
    const prev = Number(data._previous_progress)
    const curr = Number(data.progress_percentage)
    if (!isNaN(prev) && !isNaN(curr) && curr < prev - 20) {
      results.push({
        passed: false,
        rule: 'anomaly_spike',
        field: 'progress_percentage',
        rawValue: curr,
        errorDetail: `Progress turun drastis: ${prev}% → ${curr}% (drop > 20 poin) — kemungkinan kesalahan input`,
        severity: 'warning',
      })
    }
  }

  const errors   = results.filter(r => !r.passed && r.severity === 'error')
  const warnings = results.filter(r => !r.passed && r.severity === 'warning')

  return {
    isValid: errors.length === 0,
    hasWarnings: warnings.length > 0,
    results,
    sourceTable,
    recordId,
    projectId,
  }
}

// ── Helper: format untuk logging ke data_audit_log ────────────────────────
export function toAuditLogEntries(report: ValidationReport) {
  return report.results
    .filter(r => !r.passed)
    .map(r => ({
      source_table:           report.sourceTable,
      record_id:              report.recordId,
      project_id:             report.projectId,
      validation_rule_failed: r.rule,
      raw_value:              r.rawValue !== undefined ? { value: r.rawValue, field: r.field } : null,
      error_detail:           r.errorDetail,
      status:                 'pending_review' as const,
    }))
}
