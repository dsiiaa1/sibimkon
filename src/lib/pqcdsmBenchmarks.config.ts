// PLACEHOLDER — wajib divalidasi tim data/analytics sebelum go-live (Section 10.1 PRD v1.3)
// Konstanta ini TERPISAH dari komponen UI — tim data bisa update nilai tanpa menyentuh kode tampilan.

export const PQCDSM_BENCHMARKS = {
  maxGain: {
    productivity: 35,   // poin persentase kenaikan OEE, maksimum
    quality: 70,        // % pengurangan relatif defect rate, maksimum
    cost: 30,           // % pengurangan relatif biaya operasional, maksimum
    delivery: 40,       // poin persentase kenaikan on-time rate, maksimum
    safety: 80,         // % pengurangan relatif insiden, maksimum
    morale: 50,         // % pengurangan relatif turnover, maksimum
  },
  // Faktor ramp-up berdasarkan durasi implementasi
  // Makin pendek durasi, makin kecil hasil yang realistis tercapai
  durationFactor: {
    1: 0.25,
    3: 0.55,
    6: 0.80,
    12: 1.0,
  } as Record<1 | 3 | 6 | 12, number>,
  oeeHardCap: 95,        // OEE dunia nyata jarang tembus 95%
  onTimeRateHardCap: 99, // on-time rate jarang tembus 99%
  combinedScoreCap: 90,  // <- ini yang menghubungkan ke klaim "hingga 90%" di hero
} as const;
