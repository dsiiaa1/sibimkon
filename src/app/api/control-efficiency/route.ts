import { NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/ai-providers/orchestrator'


function extractJson(raw: string): any {
  const trimmed = raw.trim()
  try { return JSON.parse(trimmed) } catch { /* lanjut */ }

  const codeBlock = trimmed.match(/```(?:json|javascript|js)?\s*([\s\S]*?)\s*```/i)
  if (codeBlock) {
    let inner = codeBlock[1].trim()
    if (inner.startsWith('const data =')) inner = inner.replace(/^const data\s*=\s*/, '').replace(/;$/, '')
    try { return JSON.parse(inner) } catch { /* lanjut */ }
  }

  const firstBrace = trimmed.indexOf('[')
  const lastBrace  = trimmed.lastIndexOf(']')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1)) } catch { /* lanjut */ }
  }

  throw new Error(`Cannot extract JSON from: ${raw.substring(0, 200)}`)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { actionPlans } = body

    if (!actionPlans || !Array.isArray(actionPlans)) {
      return NextResponse.json({ error: 'Data action plans tidak valid' }, { status: 400 })
    }

    // Hanya ambil action plans yang ada "Target Efisiensi"-nya dari ai_analysis
    const targetTexts = actionPlans
      .map(ap => {
        let text = ''
        if (ap.ai_analysis && ap.ai_analysis.target_efisiensi) {
          text = ap.ai_analysis.target_efisiensi
        }
        return {
          id: ap.id,
          project_id: ap.project_id,
          raw_text: text,
        }
      })
      .filter(t => t.raw_text.trim().length > 0)

    console.log('[control-efficiency] received actionPlans length:', actionPlans.length);
    console.log('[control-efficiency] targetTexts:', targetTexts);

    if (targetTexts.length === 0) {
       return NextResponse.json({ targets: [] })
    }

    const prompt = `Anda adalah sistem ekstraksi data otomatis untuk aplikasi Smart Productive.
Anda diberikan sekumpulan "Target Efisiensi" (dalam bentuk kalimat natural) yang diambil dari tiap-tiap Action Plan dari tahap Improve.
Tugas Anda adalah mengekstrak data berikut dari masing-masing kalimat:
- metric_name (String): Nama metrik yang akan diukur (misal: "Efisiensi penggunaan bahan baku", "Waktu siklus produksi").
- target_value (Number): Angka target pencapaian (misal jika "sebesar 15%", maka 15).
- duration (Number): Lama waktu target harus dicapai.
- duration_unit (String): Satuan waktu (hanya boleh "minggu", "bulan", atau "tahun").

Jika Anda tidak dapat menemukan baseline_value di dalam teks, berikan nilai null (tidak apa-apa).
Jika Anda merasa teks target sangat tidak spesifik atau tidak menyebutkan target angka sama sekali, set "needs_manual_review": true.

Berikut adalah datanya:
${JSON.stringify(targetTexts, null, 2)}

KEMBALIKAN OUTPUT HARUS BERUPA ARRAY JSON DENGAN FORMAT BERIKUT. 
PENTING: DILARANG KERAS menambahkan teks seperti "Berikut adalah...", DILARANG membuat deklarasi variabel seperti "const data =". KEMBALIKAN HANYA VALID JSON ARRAY!

[
  {
    "action_plan_id": "<action_plan_id_dari_input>",
    "project_id": "<project_id_dari_input>",
    "raw_text": "<raw_text_dari_input>",
    "metric_name": "<nama metrik>",
    "baseline_value": null,
    "target_value": <number_persentase>,
    "duration": <number_durasi>,
    "duration_unit": "<minggu/bulan/tahun>",
    "needs_manual_review": <true/false>
  },
  ...
]
`

    const aiRes = await generateWithFallback(prompt, {
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      maxTokens: 2048
    })
    const rawResponse = aiRes.text
    let extracted = extractJson(rawResponse)
    
    console.log('[control-efficiency] extracted:', extracted);

    if (!Array.isArray(extracted)) {
       extracted = [extracted]
    }

    // Validate and sanitize data
    const finalTargets = extracted.map((item: any) => ({
      id: crypto.randomUUID(),
      action_plan_id: item.action_plan_id,
      project_id: item.project_id,
      raw_text: item.raw_text || '',
      metric_name: item.metric_name || 'Metrik belum ditentukan',
      baseline_value: item.baseline_value ?? null,
      target_value: Number(item.target_value) || 0,
      duration: Number(item.duration) || 1,
      duration_unit: (item.duration_unit || 'bulan').toLowerCase().includes('minggu') ? 'minggu' : (item.duration_unit || 'bulan').toLowerCase().includes('tahun') ? 'tahun' : 'bulan',
      needs_manual_review: Boolean(item.needs_manual_review)
    }))

    return NextResponse.json({ targets: finalTargets })

  } catch (err: any) {
    console.error('[control-efficiency] Error:', err)
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 })
  }
}
