import { NextResponse } from 'next/server'

function buildPrompt(data: {
  problem_statement: string
  data_name: string
  parsed_summary: any
}): string {
  const summaryStr = JSON.stringify(data.parsed_summary, null, 2)

  return `Anda adalah konsultan produktivitas senior (Six Sigma / Lean Expert).

Berikut adalah ringkasan data yang baru saja di-upload oleh user untuk kebutuhan pengukuran '${data.data_name}':

${summaryStr}

Dan ini adalah Problem Statement dari proyek mereka:
"${data.problem_statement}"

---

TUGAS ANDA:
Berdasarkan struktur data di atas (kolom, tipe data, jumlah baris, min/max, missing values) dan problem statement, berikan rekomendasi 1-3 metode pengukuran/analisis yang paling tepat untuk data tersebut.
Contoh metode: Control Chart (Xbar-R, p-chart, dll), Pareto Chart, Histogram, Capability Analysis (Cp, Cpk), Scatter Plot, dsb.

Kembalikan HANYA JSON berikut:
{
  "recommended_methods": [
    {
      "method": "Nama Metode (misal: Pareto Chart)",
      "reason": "Alasan spesifik berdasarkan struktur data dan problem statement"
    }
  ]
}`
}

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
    max_tokens: 1024,
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

      console.warn(`[measure-analyze-data] 429 rate limit, retry ${attempt + 1}/${MAX_RETRIES} dalam ${backoffMs}ms`)
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

  const firstBrace = trimmed.indexOf('{')
  const lastBrace  = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1)) } catch { /* lanjut */ }
  }

  throw new Error(`Cannot extract JSON from: ${raw.substring(0, 200)}`)
}

export async function POST(req: Request) {
  let body: any = {}

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.problem_statement || !body.parsed_summary) {
    return NextResponse.json(
      { error: 'problem_statement dan parsed_summary wajib diisi' },
      { status: 400 }
    )
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Konfigurasi AI belum tersedia' },
      { status: 503 }
    )
  }

  const prompt = buildPrompt(body)

  try {
    const rawText = await callAI(prompt, apiKey)
    const parsed = extractJson(rawText)

    if (!parsed.recommended_methods || !Array.isArray(parsed.recommended_methods)) {
      throw new Error('Response tidak memiliki field recommended_methods yang valid')
    }

    return NextResponse.json({ recommended_methods: parsed.recommended_methods })
  } catch (err: any) {
    console.error('[measure-analyze-data] Error:', err.message)
    return NextResponse.json(
      { error: `Analisis AI gagal: ${err.message}` },
      { status: 502 }
    )
  }
}
