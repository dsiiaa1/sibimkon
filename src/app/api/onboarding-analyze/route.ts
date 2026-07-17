import { NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/ai-providers/orchestrator'

function extractJson(raw: string): any {
  const trimmed = raw.trim()
  try { return JSON.parse(trimmed) } catch { /* lanjut */ }

  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1]) } catch { /* lanjut */ }
  }

  const firstBrace = trimmed.indexOf('[')
  const lastBrace  = trimmed.lastIndexOf(']')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1)) } catch { /* lanjut */ }
  }

  throw new Error(`Cannot extract JSON array from: ${raw.substring(0, 200)}`)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { user_role, company_name, business_field, total_employees, assessment_data } = body

    // DUAL UI: Validasi akses endpoint khusus konsultan
    if (user_role === 'perusahaan') {
      return NextResponse.json({ error: 'Akses Ditolak. Analisis AI hanya dapat dijalankan oleh Konsultan.' }, { status: 403 })
    }

    if (!assessment_data) {
      return NextResponse.json({ error: 'Data kuesioner tidak disertakan' }, { status: 400 })
    }

    const prompt = `Anda adalah konsultan ahli operasional Lean Six Sigma (Master Black Belt). Anda ditugaskan untuk melakukan "Baseline Assessment & Problem Identification" berdasarkan data kuesioner onboarding perusahaan.

Data Perusahaan: ${company_name || 'Tidak diketahui'}, Bidang: ${business_field || '-'}, Karyawan: ${total_employees || '-'}
Profil: ${JSON.stringify(assessment_data.profile_data)}
Struktur Staf: ${JSON.stringify(assessment_data.staff_data)}
Dimensi PQCDSM (Masalah-masalah terkait Kelancaran, Kualitas, Biaya, dll): ${JSON.stringify(assessment_data.pqcdsm_data)}
Ringkasan Manajemen: ${JSON.stringify(assessment_data.summary_data)}

Tugas Anda adalah menganalisis data kuesioner yang sangat detail di atas, mengidentifikasi akar-akar masalah utama (kandidat masalah), dan merumuskan daftar potensi proyek perbaikan produktivitas (Project Charters draft) untuk perusahaan ini.

KEMBALIKAN OUTPUT SEBAGAI JSON ARRAY OBJECT SAJA, TANPA TEKS LAIN.
Setiap object mewakili 1 masalah/proyek, dan harus memiliki atribut:
- "title": (string) Judul singkat proyek/masalah (maks 6 kata).
- "description": (string) Deskripsi masalah / draft problem statement yang jelas (mengandung angka persentase/data spesifik jika ada di dalam kuesioner).
- "pqcdsm_dimension": (string) Pilih salah satu dominan: "productivity", "quality", "cost", "delivery", "safety", "morale". Huruf kecil semua.
- "urgency": (string) Pilih salah satu: "Tinggi", "Sedang", atau "Rendah" berdasarkan dampaknya.

CONTOH FORMAT OUTPUT:
[
  { "title": "Reduksi Defek Proses Packaging", "description": "Tingkat defect packaging mencapai 8% melebihi toleransi...", "pqcdsm_dimension": "quality", "urgency": "Tinggi" },
  { "title": "Peningkatan Efisiensi Line Sewing", "description": "Sering terjadi bottleneck pada stasiun 4...", "pqcdsm_dimension": "productivity", "urgency": "Sedang" }
]`

    const aiRes = await generateWithFallback(prompt, {
      model: 'llama-3.1-8b-instant',
      temperature: 0.2,
      maxTokens: 2048
    })
    const rawResponse = aiRes.text
    const result = extractJson(rawResponse)

    if (!Array.isArray(result)) {
      throw new Error('Hasil AI bukan berupa array JSON.')
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('[API/onboarding-analyze] error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat men-generate analisis onboarding dari AI.' },
      { status: 500 }
    )
  }
}
