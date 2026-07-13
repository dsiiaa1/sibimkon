import { NextResponse } from 'next/server'

function buildPrompt(charter: {
  problem_statement?: string
  objectives?: string
  productivity_target?: string
  scope?: string
  company_name?: string
  project_title?: string
}): string {
  return `Anda adalah Master Black Belt Lean Six Sigma.
Tugas Anda adalah menganalisis data apa saja yang perlu dikumpulkan di tahap MEASURE berdasarkan Project Charter berikut:

Project Title: ${charter.project_title || '-'}
Company: ${charter.company_name || '-'}
Problem Statement: ${charter.problem_statement || '-'}
Objectives: ${charter.objectives || '-'}
Productivity Target: ${charter.productivity_target || '-'}
Scope: ${charter.scope || '-'}
ATURAN:
Pikirkan baik-baik struktur perhitungannya nanti. Data harus diklasifikasikan ke dalam "group" berikut:
- "primary_defect": data jumlah cacat/defect/kesalahan (sebagai numerator perhitungan Sigma Level)
- "primary_volume": data total unit/volume produksi/transaksi (sebagai denominator perhitungan Sigma Level)
- "primary_ctq": data karakteristik kualitas / opportunity per unit
- "supporting": data KPI lain (biaya, lead time, kepuasan, dll) yang tidak masuk rumus Sigma Level
- "context": data proses lain untuk referensi di tahap Analyze

Kembalikan HANYA JSON berikut, tanpa teks lain, tanpa markdown, tanpa backtick:

{
  "data_needed": [
    {
      "name": "Nama Data (misal: Data Defect Harian Line 3)",
      "description": "Deskripsi data secara singkat",
      "reason": "Alasan mengapa data ini penting untuk mengukur masalah tersebut",
      "expected_format": "csv/excel",
      "example_columns": ["tanggal", "total_produksi", "jumlah_cacat", "jenis_cacat"],
      "group": "primary_defect | primary_volume | primary_ctq | supporting | context",
      "role_note": "Catatan singkat peran data ini (misal: 'Sebagai total peluang cacat')"
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

      console.warn(`[measure-data-needed] 429 rate limit, retry ${attempt + 1}/${MAX_RETRIES} dalam ${backoffMs}ms`)
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
  let charter: Parameters<typeof buildPrompt>[0] = {}

  try {
    charter = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!charter.problem_statement?.trim()) {
    return NextResponse.json(
      { error: 'problem_statement wajib diisi untuk analisis AI' },
      { status: 400 }
    )
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error('[measure-data-needed] GROQ_API_KEY tidak ditemukan di environment')
    return NextResponse.json(
      { error: 'Konfigurasi AI belum tersedia. Tambahkan GROQ_API_KEY di .env.local' },
      { status: 503 }
    )
  }

  const prompt = buildPrompt(charter)

  try {
    const rawText = await callAI(prompt, apiKey)
    const parsed = extractJson(rawText)

    if (!parsed.data_needed || !Array.isArray(parsed.data_needed) || parsed.data_needed.length === 0) {
      throw new Error('Response tidak memiliki field data_needed yang valid')
    }

    return NextResponse.json({ data_needed: parsed.data_needed })
  } catch (err: any) {
    console.error('[measure-data-needed] Error:', err.message)
    return NextResponse.json(
      { error: `Analisis AI gagal: ${err.message}` },
      { status: 502 }
    )
  }
}
