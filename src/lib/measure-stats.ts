/**
 * measure-stats.ts — Library Statistik Hardcoded untuk Fase Measure
 *
 * Semua rumus/tabel konversi di file ini di-hardcode berdasarkan standar Six Sigma.
 * AI TIDAK pernah menghitung angka — file ini yang menghitung.
 *
 * Referensi:
 * - Tabel DPMO → Sigma Level: berdasarkan tabel konversi standar Six Sigma (dengan 1.5σ shift)
 * - Cp/Cpk: Montgomery, D.C. "Introduction to Statistical Quality Control"
 * - Control Chart (Xbar): Shewhart control chart, UCL/LCL = x̄ ± 3σ
 */

// ═══════════════════════════════════════════════════════════════════════════════
// WHITELIST METODE YANG DIDUKUNG SISTEM
// ═══════════════════════════════════════════════════════════════════════════════

export const SUPPORTED_METHODS: Record<string, {
  key: string
  label: string
  description: string
  requiresNumeric: boolean
  minSamples: number
  requiresSpecLimits: boolean
}> = {
  defect_counting: {
    key: 'defect_counting',
    label: 'Defect Counting (DPMO → Sigma Level)',
    description: 'Menghitung DPMO dan konversi ke Sigma Level',
    requiresNumeric: true,
    minSamples: 1,
    requiresSpecLimits: false,
  },
  capability_analysis: {
    key: 'capability_analysis',
    label: 'Capability Analysis (Cp/Cpk)',
    description: 'Mengukur kemampuan proses terhadap batas spesifikasi',
    requiresNumeric: true,
    minSamples: 30,
    requiresSpecLimits: true,
  },
  control_chart: {
    key: 'control_chart',
    label: 'Control Chart (Xbar)',
    description: 'Deteksi out-of-control points menggunakan UCL/LCL',
    requiresNumeric: true,
    minSamples: 10,
    requiresSpecLimits: false,
  },
  pareto_analysis: {
    key: 'pareto_analysis',
    label: 'Pareto Analysis',
    description: 'Identifikasi kategori kontributor utama (80/20)',
    requiresNumeric: false,
    minSamples: 1,
    requiresSpecLimits: false,
  },
  histogram: {
    key: 'histogram',
    label: 'Histogram',
    description: 'Distribusi frekuensi data numerik',
    requiresNumeric: true,
    minSamples: 10,
    requiresSpecLimits: false,
  },
}

/**
 * Cocokkan nama metode dari AI ke whitelist.
 * AI bisa mengembalikan "Pareto Chart", "p-chart", dsb — kita map ke key whitelist.
 */
export function matchMethodToWhitelist(aiMethodName: string): string | null {
  const lower = aiMethodName.toLowerCase()

  if (lower.includes('dpmo') || lower.includes('sigma level') || lower.includes('defect')) {
    return 'defect_counting'
  }
  if (lower.includes('capability') || lower.includes('cpk') || lower.includes('cp,')) {
    return 'capability_analysis'
  }
  if (lower.includes('control chart') || lower.includes('xbar') || lower.includes('x-bar') ||
      lower.includes('p-chart') || lower.includes('c-chart') || lower.includes('shewhart')) {
    return 'control_chart'
  }
  if (lower.includes('pareto')) {
    return 'pareto_analysis'
  }
  if (lower.includes('histogram') || lower.includes('distribusi') || lower.includes('frequency')) {
    return 'histogram'
  }

  return null // metode tidak didukung
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABEL KONVERSI DPMO → SIGMA LEVEL (standar Six Sigma, dengan 1.5σ shift)
// Referensi: ASQ Six Sigma Body of Knowledge
// ═══════════════════════════════════════════════════════════════════════════════

const DPMO_TO_SIGMA_TABLE: [number, number][] = [
  [933200, 0.0],
  [915400, 0.1],
  [894400, 0.2],
  [869700, 0.3],
  [841300, 0.4],
  [808800, 0.5],
  [773400, 0.6],
  [734100, 0.7],
  [691500, 0.8],
  [655400, 0.9],
  [617900, 1.0],
  [579300, 1.1],
  [539800, 1.2],
  [500000, 1.3],
  [460200, 1.4],
  [420700, 1.5],
  [382100, 1.6],
  [344600, 1.7],
  [308500, 1.8],
  [274300, 1.9],
  [241900, 2.0],
  [211900, 2.1],
  [184100, 2.2],
  [158700, 2.3],
  [135700, 2.4],
  [115100, 2.5],
  [96800, 2.6],
  [80700, 2.7],
  [66800, 2.8],
  [54800, 2.9],
  [44565, 3.0],
  [35930, 3.1],
  [28717, 3.2],
  [22750, 3.3],
  [17864, 3.4],
  [13903, 3.5],
  [10724, 3.6],
  [8198, 3.7],
  [6210, 3.8],
  [4661, 3.9],
  [3467, 4.0],
  [2555, 4.1],
  [1866, 4.2],
  [1350, 4.3],
  [968, 4.4],
  [687, 4.5],
  [483, 4.6],
  [337, 4.7],
  [233, 4.8],
  [159, 4.9],
  [108, 5.0],
  [72, 5.1],
  [48, 5.2],
  [32, 5.3],
  [21, 5.4],
  [13, 5.5],
  [8.5, 5.6],
  [5.4, 5.7],
  [3.4, 5.8],
  [2.1, 5.9],
  [1.3, 6.0],
]

export function dpmoToSigmaLevel(dpmo: number): number {
  if (dpmo <= 0) return 6.0
  if (dpmo >= 1000000) return 0.0

  // Interpolasi linier dari tabel
  for (let i = 0; i < DPMO_TO_SIGMA_TABLE.length - 1; i++) {
    const [dpmoHigh, sigmaLow] = DPMO_TO_SIGMA_TABLE[i]
    const [dpmoLow, sigmaHigh] = DPMO_TO_SIGMA_TABLE[i + 1]
    if (dpmo <= dpmoHigh && dpmo >= dpmoLow) {
      const ratio = (dpmoHigh - dpmo) / (dpmoHigh - dpmoLow)
      return Math.round((sigmaLow + ratio * (sigmaHigh - sigmaLow)) * 100) / 100
    }
  }

  // Fallback: jika di luar range tabel
  if (dpmo > DPMO_TO_SIGMA_TABLE[0][0]) return 0.0
  return 6.0
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERHITUNGAN STATISTIK DASAR
// ═══════════════════════════════════════════════════════════════════════════════

export function calcMean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function calcStdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = calcMean(values)
  const sumSqDiff = values.reduce((sum, v) => sum + (v - mean) ** 2, 0)
  return Math.sqrt(sumSqDiff / (values.length - 1)) // sample std dev
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFECT COUNTING → DPMO → SIGMA LEVEL
// Referensi: DPMO = (Jumlah Defect / (Jumlah Unit × Jumlah Peluang)) × 1.000.000
// ═══════════════════════════════════════════════════════════════════════════════

export interface DefectCountResult {
  method: 'defect_counting'
  total_units: number
  total_defects: number
  opportunities_per_unit: number
  defect_rate: number
  dpmo: number
  sigma_level: number
  warnings: string[]
}

export function calcDefectCounting(
  values: number[],
  totalColumn: number[] | null,
  opportunitiesPerUnit: number = 1,
): DefectCountResult {
  const warnings: string[] = []

  // values = kolom defect, totalColumn = kolom total produksi (opsional)
  const totalDefects = values.reduce((a, b) => a + b, 0)
  const totalUnits = totalColumn
    ? totalColumn.reduce((a, b) => a + b, 0)
    : values.length // fallback: 1 unit per baris

  if (totalUnits === 0) {
    warnings.push('Total unit = 0, perhitungan DPMO tidak valid')
    return { method: 'defect_counting', total_units: 0, total_defects: totalDefects, opportunities_per_unit: opportunitiesPerUnit, defect_rate: 0, dpmo: 0, sigma_level: 0, warnings }
  }

  const defectRate = totalDefects / totalUnits
  const dpmo = Math.round((totalDefects / (totalUnits * opportunitiesPerUnit)) * 1_000_000)
  const sigma_level = dpmoToSigmaLevel(dpmo)

  if (values.length < 10) warnings.push('Jumlah data < 10 baris, hasil mungkin kurang representatif')

  return {
    method: 'defect_counting',
    total_units: totalUnits,
    total_defects: totalDefects,
    opportunities_per_unit: opportunitiesPerUnit,
    defect_rate: Math.round(defectRate * 10000) / 10000,
    dpmo,
    sigma_level,
    warnings,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAPABILITY ANALYSIS — Cp, Cpk
// Referensi: Montgomery, "Introduction to Statistical Quality Control"
// Cp  = (USL - LSL) / (6σ)
// Cpk = min((USL - x̄) / (3σ), (x̄ - LSL) / (3σ))
// ═══════════════════════════════════════════════════════════════════════════════

export interface CapabilityResult {
  method: 'capability_analysis'
  mean: number
  std_dev: number
  usl: number
  lsl: number
  cp: number
  cpk: number
  n: number
  warnings: string[]
}

export function calcCapability(
  values: number[],
  usl: number,
  lsl: number,
): CapabilityResult {
  const warnings: string[] = []
  const n = values.length
  const mean = calcMean(values)
  const stdDev = calcStdDev(values)

  if (n < 30) warnings.push(`Jumlah sampel (${n}) < 30. Cpk mungkin tidak valid secara statistik.`)
  if (usl <= lsl) warnings.push('USL harus lebih besar dari LSL')
  if (stdDev === 0) {
    warnings.push('Standard deviasi = 0, data seragam — Cp/Cpk tidak terdefinisi')
    return { method: 'capability_analysis', mean, std_dev: 0, usl, lsl, cp: Infinity, cpk: Infinity, n, warnings }
  }

  const cp = Math.round(((usl - lsl) / (6 * stdDev)) * 1000) / 1000
  const cpk = Math.round((Math.min((usl - mean) / (3 * stdDev), (mean - lsl) / (3 * stdDev))) * 1000) / 1000

  if (cpk < 0) warnings.push('Cpk negatif: rata-rata proses di luar batas spesifikasi')
  if (cpk < 1.0) warnings.push('Cpk < 1.0: proses TIDAK capable — perlu perbaikan segera')
  else if (cpk < 1.33) warnings.push('Cpk antara 1.0–1.33: proses marginal — sebaiknya ditingkatkan')

  return { method: 'capability_analysis', mean: Math.round(mean * 1000) / 1000, std_dev: Math.round(stdDev * 1000) / 1000, usl, lsl, cp, cpk, n, warnings }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROL CHART — UCL, LCL, Out-of-Control Points
// Referensi: Shewhart control chart, UCL = x̄ + 3σ, LCL = x̄ - 3σ
// ═══════════════════════════════════════════════════════════════════════════════

export interface ControlChartResult {
  method: 'control_chart'
  mean: number
  std_dev: number
  ucl: number
  lcl: number
  n: number
  out_of_control_count: number
  out_of_control_indices: number[]
  percent_out_of_control: number
  warnings: string[]
}

export function calcControlChart(values: number[]): ControlChartResult {
  const warnings: string[] = []
  const n = values.length
  const mean = calcMean(values)
  const stdDev = calcStdDev(values)

  if (n < 10) warnings.push(`Jumlah data (${n}) < 10. Control chart kurang reliable.`)

  const ucl = mean + 3 * stdDev
  const lcl = mean - 3 * stdDev

  const outOfControl: number[] = []
  values.forEach((v, i) => {
    if (v > ucl || v < lcl) outOfControl.push(i)
  })

  const pct = n > 0 ? Math.round((outOfControl.length / n) * 10000) / 100 : 0

  if (outOfControl.length > 0) {
    warnings.push(`Ditemukan ${outOfControl.length} data point di luar batas kendali (${pct}%)`)
  }

  return {
    method: 'control_chart',
    mean: Math.round(mean * 1000) / 1000,
    std_dev: Math.round(stdDev * 1000) / 1000,
    ucl: Math.round(ucl * 1000) / 1000,
    lcl: Math.round(lcl * 1000) / 1000,
    n,
    out_of_control_count: outOfControl.length,
    out_of_control_indices: outOfControl.slice(0, 20), // limit for display
    percent_out_of_control: pct,
    warnings,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARETO ANALYSIS — % kontribusi per kategori
// Referensi: Prinsip Pareto 80/20
// ═══════════════════════════════════════════════════════════════════════════════

export interface ParetoCategory {
  category: string
  count: number
  percentage: number
  cumulative_percentage: number
}

export interface ParetoResult {
  method: 'pareto_analysis'
  categories: ParetoCategory[]
  total_count: number
  vital_few_cutoff: number // jumlah kategori yang mencakup 80%
  warnings: string[]
}

export function calcPareto(categoryValues: string[]): ParetoResult {
  const warnings: string[] = []

  // Hitung frekuensi tiap kategori
  const freq: Record<string, number> = {}
  categoryValues.forEach(v => {
    const key = String(v || '(kosong)').trim()
    freq[key] = (freq[key] || 0) + 1
  })

  const totalCount = categoryValues.length
  const sorted = Object.entries(freq)
    .sort(([, a], [, b]) => b - a)

  let cumulative = 0
  let vitalFew = 0
  const categories: ParetoCategory[] = sorted.map(([cat, count]) => {
    const pct = Math.round((count / totalCount) * 10000) / 100
    cumulative += pct
    if (cumulative <= 80 || vitalFew === 0) vitalFew++
    return {
      category: cat,
      count,
      percentage: pct,
      cumulative_percentage: Math.round(cumulative * 100) / 100,
    }
  })

  if (sorted.length <= 1) warnings.push('Hanya 1 kategori ditemukan — Pareto tidak informatif')
  if (sorted.length > 50) warnings.push('Terlalu banyak kategori (>50) — pertimbangkan pengelompokan')

  return {
    method: 'pareto_analysis',
    categories: categories.slice(0, 20), // limit display
    total_count: totalCount,
    vital_few_cutoff: vitalFew,
    warnings,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTOGRAM — Distribusi Frekuensi
// ═══════════════════════════════════════════════════════════════════════════════

export interface HistogramBin {
  range_start: number
  range_end: number
  label: string
  count: number
  percentage: number
}

export interface HistogramResult {
  method: 'histogram'
  bins: HistogramBin[]
  n: number
  min: number
  max: number
  mean: number
  std_dev: number
  warnings: string[]
}

export function calcHistogram(values: number[], numBins: number = 10): HistogramResult {
  const warnings: string[] = []
  const n = values.length

  if (n < 10) warnings.push(`Jumlah data (${n}) < 10. Histogram kurang representatif.`)

  const min = Math.min(...values)
  const max = Math.max(...values)
  const mean = calcMean(values)
  const stdDev = calcStdDev(values)

  const range = max - min
  if (range === 0) {
    warnings.push('Semua nilai identik — histogram tidak informatif')
    return {
      method: 'histogram',
      bins: [{ range_start: min, range_end: max, label: `${min}`, count: n, percentage: 100 }],
      n, min, max, mean, std_dev: stdDev, warnings,
    }
  }

  const binWidth = range / numBins
  const bins: HistogramBin[] = []
  for (let i = 0; i < numBins; i++) {
    const start = min + i * binWidth
    const end = i === numBins - 1 ? max + 0.001 : min + (i + 1) * binWidth
    const count = values.filter(v => v >= start && v < end).length
    bins.push({
      range_start: Math.round(start * 100) / 100,
      range_end: Math.round(end * 100) / 100,
      label: `${(Math.round(start * 100) / 100)}–${(Math.round(end * 100) / 100)}`,
      count,
      percentage: Math.round((count / n) * 10000) / 100,
    })
  }

  return {
    method: 'histogram',
    bins,
    n,
    min: Math.round(min * 1000) / 1000,
    max: Math.round(max * 1000) / 1000,
    mean: Math.round(mean * 1000) / 1000,
    std_dev: Math.round(stdDev * 1000) / 1000,
    warnings,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDASI DATA INPUT (GUARDRAIL)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DataValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
  numericColumns: string[]
  categoricalColumns: string[]
  totalRows: number
  missingValuePct: Record<string, number>
}

export function validateDataForMethod(
  data: Record<string, any>[],
  methodKey: string,
  targetColumn?: string,
): DataValidation {
  const method = SUPPORTED_METHODS[methodKey]
  const errors: string[] = []
  const warnings: string[] = []

  if (!method) {
    errors.push(`Metode '${methodKey}' tidak didukung oleh sistem`)
    return { valid: false, errors, warnings, numericColumns: [], categoricalColumns: [], totalRows: 0, missingValuePct: {} }
  }

  if (data.length === 0) {
    errors.push('Data kosong')
    return { valid: false, errors, warnings, numericColumns: [], categoricalColumns: [], totalRows: 0, missingValuePct: {} }
  }

  const columns = Object.keys(data[0])
  const numericCols: string[] = []
  const catCols: string[] = []
  const missingPct: Record<string, number> = {}

  columns.forEach(col => {
    let numericCount = 0
    let missing = 0
    data.forEach(row => {
      const val = row[col]
      if (val === null || val === undefined || val === '') {
        missing++
      } else if (!isNaN(Number(val))) {
        numericCount++
      }
    })
    missingPct[col] = Math.round((missing / data.length) * 10000) / 100

    const nonMissing = data.length - missing
    if (nonMissing > 0 && numericCount / nonMissing > 0.8) {
      numericCols.push(col)
    } else {
      catCols.push(col)
    }

    if (missingPct[col] > 30) {
      warnings.push(`Kolom '${col}' memiliki ${missingPct[col]}% missing value`)
    }
  })

  // Cek jumlah data minimum
  if (data.length < method.minSamples) {
    const msg = `Metode ${method.label} membutuhkan minimal ${method.minSamples} sampel, data hanya ${data.length} baris`
    if (data.length < method.minSamples / 2) errors.push(msg)
    else warnings.push(msg)
  }

  // Cek apakah perlu data numerik
  if (method.requiresNumeric) {
    if (numericCols.length === 0) {
      errors.push(`Metode ${method.label} membutuhkan minimal 1 kolom numerik, tetapi tidak ditemukan`)
    }
    if (targetColumn && !numericCols.includes(targetColumn)) {
      errors.push(`Kolom target '${targetColumn}' bukan kolom numerik`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    numericColumns: numericCols,
    categoricalColumns: catCols,
    totalRows: data.length,
    missingValuePct: missingPct,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Ekstrak kolom numerik dari parsed data
// ═══════════════════════════════════════════════════════════════════════════════

export function extractNumericValues(data: Record<string, any>[], column: string): number[] {
  return data
    .map(row => Number(row[column]))
    .filter(v => !isNaN(v))
}

export function extractCategoryValues(data: Record<string, any>[], column: string): string[] {
  return data
    .map(row => String(row[column] ?? ''))
    .filter(v => v !== '')
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE UNION untuk semua calculation results
// ═══════════════════════════════════════════════════════════════════════════════

export type CalculationResult =
  | DefectCountResult
  | CapabilityResult
  | ControlChartResult
  | ParetoResult
  | HistogramResult

/** Helper: mendapat label level untuk ditampilkan di badge */
export function getLevelBadge(result: CalculationResult): { label: string; color: 'red' | 'orange' | 'yellow' | 'green' | 'emerald' } {
  if (result.method === 'defect_counting') {
    const sl = result.sigma_level
    if (sl >= 5.0) return { label: `${sl}σ — World Class`, color: 'emerald' }
    if (sl >= 4.0) return { label: `${sl}σ — Baik`, color: 'green' }
    if (sl >= 3.0) return { label: `${sl}σ — Rata-rata Industri`, color: 'yellow' }
    if (sl >= 2.0) return { label: `${sl}σ — Di Bawah Rata-rata`, color: 'orange' }
    return { label: `${sl}σ — Kritis`, color: 'red' }
  }
  if (result.method === 'capability_analysis') {
    const cpk = result.cpk
    if (cpk >= 2.0) return { label: `Cpk ${cpk} — Excellent`, color: 'emerald' }
    if (cpk >= 1.33) return { label: `Cpk ${cpk} — Capable`, color: 'green' }
    if (cpk >= 1.0) return { label: `Cpk ${cpk} — Marginal`, color: 'yellow' }
    if (cpk >= 0.5) return { label: `Cpk ${cpk} — Not Capable`, color: 'orange' }
    return { label: `Cpk ${cpk} — Kritis`, color: 'red' }
  }
  if (result.method === 'control_chart') {
    const pct = result.percent_out_of_control
    if (pct === 0) return { label: 'In Control', color: 'emerald' }
    if (pct <= 5) return { label: `${pct}% Out of Control`, color: 'yellow' }
    return { label: `${pct}% Out of Control`, color: 'red' }
  }
  if (result.method === 'pareto_analysis') {
    const vf = result.vital_few_cutoff
    return { label: `Top ${vf} kategori = 80%`, color: vf <= 3 ? 'yellow' : 'orange' }
  }
  if (result.method === 'histogram') {
    return { label: `${result.n} data points`, color: 'green' }
  }
  return { label: 'Unknown', color: 'yellow' }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGREGASI LINTAS FILE (GABUNGAN)
// ═══════════════════════════════════════════════════════════════════════════════

export interface AggregatedResult {
  type: 'sigma' | 'dynamic'
  primary_metric?: {
    name: string
    value: number | string
    unit: string
    method_used: string
    interpretation?: any
    metrics?: Record<string, any>
  }
  overall_sigma_level?: number
  overall_dpmo?: number
  total_defects?: number
  total_volume?: number
  opportunities_per_unit?: number
  supporting_kpis: { name: string; value: number; label: string }[]
  warnings: string[]
}

/**
 * Menghitung satu angka Sigma Level gabungan dari seluruh file yang diunggah.
 * - primary_defect: Dijumlahkan totalnya (Sum)
 * - primary_volume: Dijumlahkan totalnya (Sum)
 * - primary_ctq: Menentukan jumlah opportunity per unit
 * - supporting: Dihitung terpisah sebagai KPI
 */
export function calcAggregatedSigmaLevel(
  dataReqs: { id: string; name: string; group?: string; raw_data?: Record<string, any>[] }[],
  aggregationConfig: {
    targetCols: Record<string, string> // mapping reqId -> nama kolom target yang dipilih user
  },
  dynamicMetricResult?: { name: string; result: any }
): AggregatedResult {
  let totalDefects = 0
  let totalVolume = 0
  let ctqOpportunities = 1
  const warnings: string[] = []
  const supportingKpis: { name: string; value: number; label: string }[] = []

  const firstValidDynamic: any = dynamicMetricResult || null

  dataReqs.forEach(req => {

    if (!req.raw_data || req.raw_data.length === 0) return
    const colName = aggregationConfig.targetCols[req.id]
    if (!colName) return

    const values = extractNumericValues(req.raw_data, colName)
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = values.length > 0 ? sum / values.length : 0

    if (req.group === 'primary_defect') {
      totalDefects += sum
    } else if (req.group === 'primary_volume') {
      totalVolume += sum
    } else if (req.group === 'primary_ctq') {
      const uniqueVals = new Set(req.raw_data.map(r => r[colName])).size
      ctqOpportunities = Math.max(ctqOpportunities, uniqueVals)
    } else if (req.group === 'supporting') {
      const nameLower = req.name.toLowerCase()
      const isAverage = nameLower.includes('kepuasan') || nameLower.includes('satisfaction') || nameLower.includes('waktu') || nameLower.includes('lead time') || nameLower.includes('skor') || nameLower.includes('score') || nameLower.includes('rata')
      
      const finalValue = isAverage ? avg : sum
      
      supportingKpis.push({
        name: req.name,
        value: Math.round(finalValue * 100) / 100,
        label: isAverage ? `Rata-rata ${req.name}` : `Total ${req.name}`,
      })
    }
  })

  // Jika tidak ada data volume, gunakan metrik dinamis jika ada
  if (totalVolume === 0) {
    if (firstValidDynamic) {
      const metrics = firstValidDynamic.result.metrics
      let primaryVal = 0
      let primaryUnit = ''
      
      if (metrics.cpk !== undefined) {
        primaryVal = metrics.cpk
        primaryUnit = 'Cpk'
      } else if (metrics.dpmo !== undefined) {
        primaryVal = metrics.sigma_level
        primaryUnit = 'σ'
      } else if (firstValidDynamic.result.method === 'pareto_analysis') {
        primaryVal = metrics.categories ? metrics.categories.length : 0
        primaryUnit = 'Kategori Masalah'
      } else {
        primaryVal = metrics.mean || metrics.average || metrics.total || 0
        primaryUnit = 'Unit'
      }

      return {
        type: 'dynamic',
        primary_metric: {
          name: firstValidDynamic.name,
          value: primaryVal,
          unit: primaryUnit,
          method_used: firstValidDynamic.result.method,
          interpretation: firstValidDynamic.result.ai_interpretation,
          metrics: metrics
        },
        supporting_kpis: supportingKpis,
        warnings
      }
    } else {
      warnings.push('Total unit/volume produksi (Data Utama - Volume) adalah 0, dan sistem tidak dapat menemukan Data Utama lain untuk dianalisis secara dinamis. Pastikan minimal satu file "Data Utama - Volume" atau "Data Utama" lainnya sudah diupload.')
      return { type: 'sigma', overall_sigma_level: 0, overall_dpmo: 0, total_defects: totalDefects, total_volume: 0, opportunities_per_unit: ctqOpportunities, supporting_kpis: supportingKpis, warnings }
    }
  }

  const dpmo = Math.round((totalDefects / (totalVolume * ctqOpportunities)) * 1_000_000)
  const sigmaLevel = dpmoToSigmaLevel(dpmo)

  return {
    type: 'sigma',
    overall_sigma_level: sigmaLevel,
    overall_dpmo: dpmo,
    total_defects: totalDefects,
    total_volume: totalVolume,
    opportunities_per_unit: ctqOpportunities,
    supporting_kpis: supportingKpis,
    warnings,
  }
}

