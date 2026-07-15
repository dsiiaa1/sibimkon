import { NextResponse } from 'next/server'

const GROQ_MODEL  = 'llama-3.1-8b-instant'
const MAX_RETRIES = 4

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callAI(prompt: string, apiKey: string): Promise<string> {
  const url = 'https://api.groq.com/openai/v1/chat/completions'

  const body = {
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 2048,
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const data = await res.json()
      const text: string | undefined = data.choices?.[0]?.message?.content
      if (!text) throw new Error('Groq returned empty content')
      return text
    }

    if (res.status === 429) {
      const retryAfterSec = parseInt(res.headers.get('Retry-After') ?? '0', 10)
      const backoffMs = retryAfterSec > 0
        ? retryAfterSec * 1000
        : Math.min(1000 * 2 ** attempt, 16000)

      if (backoffMs > 10000) {
        throw new Error(`Server AI sedang sibuk (Rate Limit). Silakan coba lagi nanti.`)
      }

      console.warn(`[control-efficiency] 429 rate limit, retry ${attempt + 1}/${MAX_RETRIES} in ${backoffMs}ms`)
      lastError = new Error(`Rate limit — retry ${attempt + 1}/${MAX_RETRIES}`)
      await sleep(backoffMs)
      continue
    }

    const errText = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(`Groq API error ${res.status}: ${errText.substring(0, 300)}`)
  }

  throw new Error(`Groq API gagal setelah ${MAX_RETRIES} percobaan: ${lastError?.message ?? 'rate limit'}`)
}

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

  throw new Error(`Cannot extract JSON from: ${raw.substring(0, 200)}`)
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY belum dikonfigurasi di server.' }, { status: 500 })
    }

    const body = await req.json()
    const { actionPlans } = body

    if (!actionPlans || !Array.isArray(actionPlans)) {
      return NextResponse.json({ error: 'Data action plans tidak valid' }, { status: 400 })
    }

    // Hanya ambil action plans yang ada "Target Efisiensi"-nya dari ai_analysis
    const targetTexts = actionPlans
      .map(ap => {
        let text = ''
        if (ap.ai_analysis && ap.ai_analysis.roi && ap.ai_analysis.roi.target_efisiensi) {
          text = ap.ai_analysis.roi.target_efisiensi
        }
        return {
          id: ap.id,
          project_id: ap.project_id,
          raw_text: text,
        }
      })
      .filter(t => t.raw_text.trim().length > 0)

    if (targetTexts.length === 0) {
       return NextResponse.json({ targets: [] })
    }

    const prompt = `Anda adalah sistem ekstraksi data otomatis untuk aplikasi SIBIMKON.
Anda diberikan sekumpulan "Target Efisiensi" (dalam bentuk kalimat natural) yang diambil dari tiap-tiap Action Plan dari tahap Improve.
Tugas Anda adalah mengekstrak data berikut dari masing-masing kalimat:
- metric_name (String): Nama metrik yang akan diukur (misal: "Efisiensi penggunaan bahan baku", "Waktu siklus produksi").
- target_value (Number): Angka target pencapaian (misal jika "sebesar 15%", maka 15).
- duration (Number): Lama waktu target harus dicapai.
- duration_unit (String): Satuan waktu (hanya boleh "minggu" atau "bulan").

Jika Anda tidak dapat menemukan baseline_value di dalam teks, berikan nilai null (tidak apa-apa).
Jika Anda merasa teks target sangat tidak spesifik atau tidak menyebutkan target angka sama sekali, set "needs_manual_review": true.

Berikut adalah datanya:
${JSON.stringify(targetTexts, null, 2)}

KEMBALIKAN OUTPUT HARUS BERUPA ARRAY JSON DENGAN FORMAT BERIKUT (jangan tambahkan teks lain selain JSON!):
[
  {
    "action_plan_id": "<action_plan_id_dari_input>",
    "project_id": "<project_id_dari_input>",
    "raw_text": "<raw_text_dari_input>",
    "metric_name": "<nama metrik>",
    "baseline_value": null,
    "target_value": <number_persentase>,
    "duration": <number_durasi>,
    "duration_unit": "<minggu/bulan>",
    "needs_manual_review": <true/false>
  },
  ...
]
`

    const rawResponse = await callAI(prompt, apiKey)
    let extracted = extractJson(rawResponse)

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
      duration_unit: (item.duration_unit || 'bulan').toLowerCase().includes('minggu') ? 'minggu' : 'bulan',
      needs_manual_review: Boolean(item.needs_manual_review)
    }))

    return NextResponse.json({ targets: finalTargets })

  } catch (err: any) {
    console.error('[control-efficiency] Error:', err)
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 })
  }
}
