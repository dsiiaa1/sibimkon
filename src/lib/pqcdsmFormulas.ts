// Pure functions untuk kalkulasi PQCDSM — tidak ada side effect, mudah di-unit-test
// Sesuai Section 12.4 & 12.5 PRD v1.3
import { PQCDSM_BENCHMARKS } from './pqcdsmBenchmarks.config';

// ────────────────────────────────────────────────────────────────────────────
// TypeScript Interfaces (Section 12.5)
// ────────────────────────────────────────────────────────────────────────────

export interface PQCDSMCurrentInput {
  productivity: { oeePct: number; totalProductionLines: number };
  quality: { defectRatePct: number };
  cost: { monthlyOperationalCostRp: number };
  delivery: { onTimeRatePct: number };
  safety: { incidentsPerMonth: number };
  morale: { turnoverRatePct: number };
}

export interface PQCDSMTargetInput {
  monitoredLines: number;
  maturityLevel: number;       // integer 1–10
  durationMonths: 1 | 3 | 6 | 12;
}

export interface PQCDSMOutput {
  productivity: { gainPercentagePoints: number; projectedOEE: number };
  quality: { reductionPct: number; projectedDefectRatePct: number };
  cost: { reductionPct: number; monthlySavingsRp: number; cumulativeSavingsRp: number };
  delivery: { gainPercentagePoints: number; projectedOnTimeRatePct: number };
  safety: { reductionPct: number; projectedIncidentsPerMonth: number };
  morale: { reductionPct: number; projectedTurnoverRatePct: number };
  realizationFactor: number;        // 0–1, untuk debugging/analytics, tidak ditampilkan ke user
  combinedEfficiencyScore: number;  // 0–90
}

// ────────────────────────────────────────────────────────────────────────────
// Fungsi Utama (Section 12.4)
// ────────────────────────────────────────────────────────────────────────────

export function calculatePQCDSM(
  current: PQCDSMCurrentInput,
  target: PQCDSMTargetInput,
  benchmarks: typeof PQCDSM_BENCHMARKS = PQCDSM_BENCHMARKS
): PQCDSMOutput {
  // Langkah 1 — Realization Factor (RF)
  const maturityFactor = target.maturityLevel / 10;                               // 0.1–1.0
  const durationFactor = benchmarks.durationFactor[target.durationMonths];       // 0.25–1.0
  const coverageFactor = Math.min(
    current.productivity.totalProductionLines > 0
      ? target.monitoredLines / current.productivity.totalProductionLines
      : 0,
    1
  );                                                                               // 0–1
  const RF = maturityFactor * durationFactor * coverageFactor;                   // 0–1

  // Langkah 2 — Peningkatan per pilar

  // P — Productivity (OEE naik, dibatasi hard cap)
  const productivityGainPP = benchmarks.maxGain.productivity * RF;
  const projectedOEE = Math.min(
    current.productivity.oeePct + productivityGainPP,
    benchmarks.oeeHardCap
  );

  // Q — Quality (defect rate turun secara relatif)
  const qualityReductionPct = benchmarks.maxGain.quality * RF;
  const projectedDefectRatePct = current.quality.defectRatePct * (1 - qualityReductionPct / 100);

  // C — Cost (biaya operasional turun secara relatif)
  const costReductionPct = benchmarks.maxGain.cost * RF;
  const monthlySavingsRp = current.cost.monthlyOperationalCostRp * (costReductionPct / 100);
  const cumulativeSavingsRp = monthlySavingsRp * target.durationMonths;

  // D — Delivery (on-time rate naik, dibatasi hard cap)
  const deliveryGainPP = benchmarks.maxGain.delivery * RF;
  const projectedOnTimeRatePct = Math.min(
    current.delivery.onTimeRatePct + deliveryGainPP,
    benchmarks.onTimeRateHardCap
  );

  // S — Safety (insiden turun secara relatif)
  const safetyReductionPct = benchmarks.maxGain.safety * RF;
  const projectedIncidentsPerMonth = current.safety.incidentsPerMonth * (1 - safetyReductionPct / 100);

  // M — Morale (turnover turun secara relatif)
  const moraleReductionPct = benchmarks.maxGain.morale * RF;
  const projectedTurnoverRatePct = current.morale.turnoverRatePct * (1 - moraleReductionPct / 100);

  // Langkah 3 — Skor Efisiensi Gabungan (0–90, batas atas = klaim "hingga 90%" di hero)
  const combinedEfficiencyScore = Math.round(RF * benchmarks.combinedScoreCap);

  return {
    productivity: { gainPercentagePoints: Math.round(productivityGainPP * 10) / 10, projectedOEE: Math.round(projectedOEE * 10) / 10 },
    quality: { reductionPct: Math.round(qualityReductionPct * 10) / 10, projectedDefectRatePct: Math.round(projectedDefectRatePct * 100) / 100 },
    cost: { reductionPct: Math.round(costReductionPct * 10) / 10, monthlySavingsRp: Math.round(monthlySavingsRp), cumulativeSavingsRp: Math.round(cumulativeSavingsRp) },
    delivery: { gainPercentagePoints: Math.round(deliveryGainPP * 10) / 10, projectedOnTimeRatePct: Math.round(projectedOnTimeRatePct * 10) / 10 },
    safety: { reductionPct: Math.round(safetyReductionPct * 10) / 10, projectedIncidentsPerMonth: Math.round(projectedIncidentsPerMonth * 10) / 10 },
    morale: { reductionPct: Math.round(moraleReductionPct * 10) / 10, projectedTurnoverRatePct: Math.round(projectedTurnoverRatePct * 100) / 100 },
    realizationFactor: Math.round(RF * 1000) / 1000,
    combinedEfficiencyScore,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Widget Hero — Formula Sederhana (Section 12.10)
// ────────────────────────────────────────────────────────────────────────────

// PLACEHOLDER — validasi bersama Section 12.3
const ASSUMED_COST_PER_DOWNTIME_HOUR_RP = 850_000; // Rp per jam downtime per lini
const TYPICAL_DOWNTIME_REDUCTION_FACTOR = 0.45;    // 45% dari downtime bisa dieliminasi

export function estimateHeroSavings(
  numberOfLines: number,
  avgDowntimeHoursPerMonth: number
): number {
  return (
    numberOfLines *
    avgDowntimeHoursPerMonth *
    ASSUMED_COST_PER_DOWNTIME_HOUR_RP *
    TYPICAL_DOWNTIME_REDUCTION_FACTOR
  ); // estimasi penghematan Rp per bulan
}

// ────────────────────────────────────────────────────────────────────────────
// Utility — Format angka Rupiah
// ────────────────────────────────────────────────────────────────────────────

export function formatRupiah(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(1)} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(0)} jt`;
  }
  return `Rp ${value.toLocaleString('id-ID')}`;
}
