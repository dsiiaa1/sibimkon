/**
 * src/lib/roi.ts
 *
 * Shared ROI calculation logic — diekstrak dari projects/[id]/reports/page.tsx.
 * Dipakai oleh: reports/page.tsx, companies/[id]/page.tsx, awards/page.tsx, dashboard/page.tsx.
 *
 * Jangan ubah rumus tanpa mempertimbangkan dampak ke semua halaman yang memakai fungsi ini.
 */

import { ActionPlan } from './mockData'

export interface ProjectRoiResult {
  costSaving: number
  investment: number
  roi: number
  isManual: boolean
}

/**
 * calculateProjectRoi
 *
 * Diekstrak dari logika `roiData` di projects/[id]/reports/page.tsx (perilaku identik).
 * Prioritas: nilai manual konsultan (cost_saving_manual / investment_manual).
 * Fallback: estimasi otomatis dari KPI aktual vs baseline.
 *
 * Rumus estimasi (ASUMSI — jangan ubah tanpa konfirmasi stakeholder):
 *   - costSaving = Σ (perbaikan KPI aktual vs baseline) × Rp 500.000/unit
 *   - investment = jumlah action plan berstatus selain 'belum_mulai' × Rp 2.500.000
 */
export function calculateProjectRoi(actionPlans: ActionPlan[]): ProjectRoiResult {
  if (actionPlans.length === 0) {
    return { costSaving: 0, investment: 0, roi: 0, isManual: false }
  }

  const totalManualSaving = actionPlans.reduce((acc, a) => acc + (a.cost_saving_manual ?? 0), 0)
  const totalManualInvestment = actionPlans.reduce((acc, a) => acc + (a.investment_manual ?? 0), 0)
  const hasManualData = totalManualSaving > 0 || totalManualInvestment > 0

  if (hasManualData) {
    // Gunakan nilai yang diinput langsung oleh konsultan
    const roi = totalManualInvestment > 0 ? totalManualSaving / totalManualInvestment : 0
    return { costSaving: totalManualSaving, investment: totalManualInvestment, roi, isManual: true }
  }

  // Fallback: estimasi otomatis dari perbaikan KPI
  const costSaving = actionPlans.reduce((acc, act) => {
    const kpiActual = act.verified_kpi_actual ?? act.kpi_actual
    if (kpiActual === undefined) return acc
    const achieved = act.kpi_target > act.kpi_baseline
      ? Math.max(0, (kpiActual as number) - act.kpi_baseline)   // higher is better
      : Math.max(0, act.kpi_baseline - (kpiActual as number))   // lower is better
    const unitValue = 500000 // Rp 500rb per unit perbaikan KPI (estimasi default)
    return acc + achieved * unitValue
  }, 0)

  const investment = actionPlans.filter(a => a.status !== 'belum_mulai').length * 2500000
  const roi = investment > 0 ? costSaving / investment : 0
  return { costSaving, investment, roi, isManual: false }
}
