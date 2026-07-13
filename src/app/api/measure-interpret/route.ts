import { NextResponse } from 'next/server'

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

function buildPrompt(body: {
  problem_statement: string
  method: string
  calculation_results: any
  data_name: string
}): string {
  const resultsStr = JSON.stringify(body.calculation_results, null, 2)

  return `Anda adalah konsultan produktivitas senior (Six Sigma / Lean Expert) dari firma konsultan Link Productive Indonesia.

KONTEKS:
- Problem Statement: "${body.problem_statement}"
- Data yang diukur: "${body.data_name}"
- Metode pengukuran: ${body.method}

HASIL PERHITUNGAN (sudah dihitung oleh sistem, BUKAN untuk dihitung ulang oleh Anda):
${resultsStr}

ATURAN KETAT:
1. ANDA DILARANG menghitung ulang angka apapun. Semua angka di atas sudah final.
2. ANDA DILARANG menyebutkan angka/rumus yang TIDAK ada di data di atas.
3. Tugas Anda HANYA menjelaskan dan menginterpretasikan angka yang sudah diberikan.

TUGAS ANDA:
Berdasarkan angka hasil perhitungan di atas, berikan interpretasi dalam format JSON berikut:

{
  "level_assessment": "Ringkasan singkat level permasalahan (misal: 'Sigma Level 3.2 — Rata-rata industri, masih ada ruang perbaikan signifikan')",
  "standard_used": "Nama standar/metode yang dipakai (misal: 'Konversi DPMO ke Sigma Level — standar Six Sigma dengan 1.5σ shift')",
  "interpretation": "Penjelasan detail dalam 2-4 kalimat yang mudah dipahami oleh manajer non-teknis tentang apa arti angka tersebut bagi perusahaan",
  "analyze_recommendation": "Rekomendasi arah untuk tahap Analyze berikutnya (1-2 kalimat)"
}

Kembalikan HANYA JSON di atas tanpa teks lain, tanpa markdown, tanpa backtick.`
}

const GROQ_MODEL = 'llama-3.1-8b-instant'
const MAX_RETRIES = 4

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
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
        Authorization: `Bearer ${apiKey}`,
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
      const backoffMs = retryAfterSec > 0 ? retryAfterSec * 1000 : Math.min(1000 * 2 ** attempt, 16000)
      if (backoffMs > 10000) {
        throw new Error(`Server AI sedang sibuk (Rate Limit). Silakan coba lagi nanti.`)
      }
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
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1)) } catch { /* lanjut */ }
  }

  throw new Error(`Cannot extract JSON from AI response`)
}

/** Fallback message jika AI gagal — sesuai guardrail */
const FALLBACK_INTERPRETATION = {
  level_assessment: 'Interpretasi AI tidak tersedia — silakan lihat angka perhitungan di atas.',
  standard_used: 'Standar Six Sigma',
  interpretation: 'Sistem telah menghitung metrik berdasarkan data yang diberikan. Silakan konsultasikan hasil angka di atas dengan konsultan untuk interpretasi lebih lanjut.',
  analyze_recommendation: 'Lanjutkan ke tahap Analyze untuk mendalami akar penyebab berdasarkan hasil pengukuran.',
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

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    // Guardrail: jika tidak ada API key, kembalikan fallback
    return NextResponse.json({ interpretation: FALLBACK_INTERPRETATION })
  }

  const prompt = buildPrompt({
    problem_statement: body.problem_statement || '',
    method: body.method,
    calculation_results: body.calculation_results,
    data_name: body.data_name || 'Data Measure',
  })

  try {
    const rawText = await callAI(prompt, apiKey)
    const parsed = extractJson(rawText)

    // Guardrail: validasi field output
    if (typeof parsed.level_assessment !== 'string' || typeof parsed.interpretation !== 'string') {
      console.warn('[measure-interpret] AI output gagal validasi, gunakan fallback')
      return NextResponse.json({ interpretation: FALLBACK_INTERPRETATION })
    }

    return NextResponse.json({ interpretation: parsed })
  } catch (err: any) {
    console.error('[measure-interpret] Error:', err.message)
    // Guardrail: fallback message, jangan tampilkan hasil yang tidak tervalidasi
    return NextResponse.json({ interpretation: FALLBACK_INTERPRETATION })
  }
}
