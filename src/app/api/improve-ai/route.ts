import { NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/ai-providers/orchestrator'


function extractJson(raw: string): any {
  const trimmed = raw.trim()
  try { return JSON.parse(trimmed) } catch { /* lanjut */ }

  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1]) } catch { /* lanjut */ }
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace  = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1)) } catch { /* lanjut */ }
  }

  throw new Error(`Cannot extract JSON from: ${raw.substring(0, 200)}`)
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY belum dikonfigurasi di server.' }, { status: 500 })
    }

    const body = await req.json()
    const { action, problem, pic, timeline, context_data } = body

    if (!action) {
      return NextResponse.json({ error: 'Data action plan tidak lengkap' }, { status: 400 })
    }

    const prompt = `Anda adalah konsultan Lean Six Sigma (Black Belt). Anda sedang berada di tahap Improve (DMAIC).

Berdasarkan rencana tindakan berikut: '${action}'
(menjawab masalah: '${problem || "Tidak ditentukan"}', PIC: '${pic || "Belum ditentukan"}', timeline: '${timeline || "Belum ditentukan"}'),
dengan konteks:
- Sigma Level: ${context_data?.sigma_level ?? "Tidak ada data"}
- DPMO: ${context_data?.dpmo ?? "Tidak ada data"}
- Total Biaya Rework: ${context_data?.kpi_pendukung?.total_biaya_rework ?? "Tidak ada data"}

Lengkapi analisis Lean Six Sigma berikut dalam format JSON:
1) Persiapan apa yang dibutuhkan sebelum tindakan ini dijalankan.
2) Sumber daya (SDM, alat, anggaran) yang diperlukan.
3) Estimasi biaya implementasi (dalam Rupiah).
4) Manfaat yang diperoleh (kualitatif dan/atau kuantitatif).
5) Target efisiensi yang diharapkan (dalam % atau satuan terukur).
6) Estimasi ROI (Return on Improvement). Hitung sebagai: ((estimasi penghematan tahunan - biaya implementasi) / biaya implementasi) * 100, dinyatakan dalam persen (%).

Jika Anda tidak punya data persis, gunakan estimasi kasar dan tulis asumsinya, jangan mengosongkannya.

KEMBALIKAN OUTPUT SEBAGAI OBJEK JSON SAJA, TANPA TEKS LAIN.
CONTOH FORMAT OUTPUT:
{
  "persiapan": "...",
  "sumber_daya": {
    "sdm": "...",
    "alat": "...",
    "anggaran_terkait": "..."
  },
  "biaya": {
    "estimasi": 5000000,
    "rincian": "..."
  },
  "manfaat": {
    "kualitatif": "...",
    "kuantitatif": "..."
  },
  "target_efisiensi": "...",
  "roi": {
    "estimasi_penghematan_tahunan": 10000000,
    "biaya_implementasi": 5000000,
    "roi_persen": 100,
    "catatan": "..."
  }
}`

    const aiRes = await generateWithFallback(prompt, {
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      maxTokens: 1536
    })
    const rawResponse = aiRes.text
    const result = extractJson(rawResponse)

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('[API/improve-ai] error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat memproses data ke AI.' },
      { status: 500 }
    )
  }
}
