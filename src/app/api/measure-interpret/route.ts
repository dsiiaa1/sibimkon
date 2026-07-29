import { NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/ai-providers/orchestrator'

/**
 * /api/measure-interpret
 *
 * Menerima ANGKA HASIL HITUNGAN (bukan data mentah) dan meminta AI
 * memberikan INTERPRETASI NARATIF saja. AI dilarang menghitung ulang.
 *
 * Guardrail:
 * - AI dilarang menyebutkan angka yang tidak dikirimkan oleh sistem
 * - Output harus JSON terstruktur
 * - Fallback message jika parse gagal
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Konfigurasi interpretasi per kategori masalah
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_INTERPRET_CONFIG: Record<string, {
  metricName: string
  standardUsed: string
  levelExampleGood: string
  levelExampleBad: string
}> = {
  quality: {
    metricName: 'Sigma Level / DPMO',
    standardUsed: 'Konversi DPMO ke Sigma Level — standar Six Sigma dengan 1.5σ shift (ASQ)',
    levelExampleGood: 'Sigma Level 4.2 — Baik, di atas rata-rata industri manufaktur',
    levelExampleBad: 'Sigma Level 2.8 — Di bawah rata-rata, perlu perbaikan segera',
  },
  delivery: {
    metricName: 'On-Time Delivery Rate / Rata-rata Keterlambatan',
    standardUsed: 'On-Time Delivery Rate (OTD) — standar logistik & supply chain',
    levelExampleGood: 'OTD 96% — Sangat Baik, memenuhi standar industri ≥95%',
    levelExampleBad: 'OTD 72% — Buruk, jauh di bawah standar industri, 28% pengiriman terlambat',
  },
  cost: {
    metricName: '% Pemborosan / Cost Variance',
    standardUsed: 'Cost Variance (%) — standar manajemen biaya & lean manufacturing',
    levelExampleGood: 'Cost Variance 1.5% — Terkendali, masih dalam batas toleransi ≤5%',
    levelExampleBad: 'Cost Variance 18% — Kritis, pemborosan jauh melampaui batas wajar',
  },
  production: {
    metricName: 'Downtime Rate / OEE',
    standardUsed: 'Downtime Rate (%) & OEE — standar TPM/manufaktur',
    levelExampleGood: 'Downtime Rate 3% — Sangat Baik, di bawah benchmark industri 5%',
    levelExampleBad: 'Downtime Rate 22% — Kritis, produksi terganggu signifikan',
  },
  safety: {
    metricName: 'Incident Rate',
    standardUsed: 'Incident Rate (%) — standar K3 / OHSAS 18001',
    levelExampleGood: 'Incident Rate 0% — Zero Accident, kondisi ideal K3',
    levelExampleBad: 'Incident Rate 2.4% — Mengkhawatirkan, perlu audit K3 menyeluruh',
  },
  morale: {
    metricName: 'Turnover Rate / Skor Kepuasan Karyawan',
    standardUsed: 'Turnover Rate (%) — standar HR & manajemen SDM',
    levelExampleGood: 'Turnover Rate 3% — Rendah, karyawan cukup loyal',
    levelExampleBad: 'Turnover Rate 28% — Tinggi, mengindikasikan masalah serius pada employee engagement',
  },
}

function buildPrompt(body: {
  problem_statement: string
  method: string
  calculation_results: any
  data_name: string
  is_simple?: boolean
  problem_category?: string
}): string {
  const resultsStr = JSON.stringify(body.calculation_results, null, 2)
  const category = body.problem_category || 'quality'
  const cfg = CATEGORY_INTERPRET_CONFIG[category] || CATEGORY_INTERPRET_CONFIG['quality']

  let levelInstruction: string
  let extraRule = ''

  if (body.is_simple) {
    levelInstruction = `  "level_assessment": "",`
    extraRule = `\n4. KARENA INI PROYEK SIMPLE, tidak ada data kuantitatif volume, kosongkan level_assessment. Fokus interpretasi kualitatif pada problem statement.`
  } else {
    levelInstruction = `  "level_assessment": "Ringkasan singkat level permasalahan menggunakan metrik ${cfg.metricName} (contoh: '${cfg.levelExampleGood}' atau '${cfg.levelExampleBad}')",`
  }

  return `Anda adalah konsultan produktivitas senior dari firma konsultan Link Productive Indonesia.

KONTEKS:
- Problem Statement: "${body.problem_statement}"
- Kategori Masalah: ${category.toUpperCase()}
- Metrik yang Diukur: ${cfg.metricName}
- Data yang diukur: "${body.data_name}"
- Metode pengukuran: ${body.method}
- Standar yang dipakai: ${cfg.standardUsed}

HASIL PERHITUNGAN (sudah dihitung oleh sistem, BUKAN untuk dihitung ulang oleh Anda):
${resultsStr}

ATURAN KETAT:
1. ANDA DILARANG menghitung ulang angka apapun. Semua angka di atas sudah final.
2. ANDA DILARANG menyebutkan angka/rumus yang TIDAK ada di data di atas.
3. Tugas Anda HANYA menjelaskan dan menginterpretasikan angka yang sudah diberikan.
4. Interpretasi harus menggunakan bahasa metrik ${cfg.metricName}, BUKAN mengkonversi ke metrik lain.${extraRule}

TUGAS ANDA:
Berdasarkan angka hasil perhitungan di atas, berikan interpretasi dalam format JSON berikut:

{
${levelInstruction}
  "standard_used": "${cfg.standardUsed}",
  "interpretation": "Penjelasan detail dalam 2-4 kalimat yang mudah dipahami oleh manajer non-teknis tentang apa arti angka/kondisi tersebut bagi perusahaan",
  "analyze_recommendation": "Rekomendasi arah untuk tahap Analyze berikutnya (1-2 kalimat)"
}

Kembalikan HANYA JSON di atas tanpa teks lain, tanpa markdown, tanpa backtick.`
}

function extractJson(raw: string): any {
  const trimmed = raw.trim()
  try { return JSON.parse(trimmed) } catch { /* lanjut */ }

  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1]) } catch { /* lanjut */ }
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1)) } catch { /* lanjut */ }
  }

  throw new Error(`Cannot extract JSON from AI response`)
}

/** Fallback message jika AI gagal — sesuai guardrail */
function buildFallback(category: string): object {
  const cfg = CATEGORY_INTERPRET_CONFIG[category] || CATEGORY_INTERPRET_CONFIG['quality']
  return {
    level_assessment: 'Interpretasi AI tidak tersedia — silakan lihat angka perhitungan di atas.',
    standard_used: cfg.standardUsed,
    interpretation: 'Sistem telah menghitung metrik berdasarkan data yang diberikan. Silakan konsultasikan hasil angka di atas dengan konsultan untuk interpretasi lebih lanjut.',
    analyze_recommendation: 'Lanjutkan ke tahap Analyze untuk mendalami akar penyebab berdasarkan hasil pengukuran.',
  }
}

export async function POST(req: Request) {
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.calculation_results || !body.method) {
    return NextResponse.json({ error: 'calculation_results dan method wajib diisi' }, { status: 400 })
  }

  const category = body.problem_category || 'quality'

  const prompt = buildPrompt({
    problem_statement: body.problem_statement || '',
    method: body.method,
    calculation_results: body.calculation_results,
    data_name: body.data_name || 'Data Measure',
    is_simple: body.is_simple || false,
    problem_category: category,
  })

  try {
    const aiRes = await generateWithFallback(prompt, {
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      maxTokens: 1536
    })
    const rawText = aiRes.text
    const parsed = extractJson(rawText)

    // Guardrail: validasi field output
    if (typeof parsed.level_assessment !== 'string' || typeof parsed.interpretation !== 'string') {
      console.warn('[measure-interpret] AI output gagal validasi, gunakan fallback')
      return NextResponse.json({ interpretation: buildFallback(category) })
    }

    return NextResponse.json({ interpretation: parsed })
  } catch (err: any) {
    console.error('[measure-interpret] Error:', err.message)
    return NextResponse.json({ interpretation: buildFallback(category) })
  }
}
