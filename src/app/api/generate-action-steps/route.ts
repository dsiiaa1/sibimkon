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
    temperature: 0.2, // Slightly higher for variation but still structured
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

      console.warn(`[generate-action-steps] 429 rate limit, retry ${attempt + 1}/${MAX_RETRIES} in ${backoffMs}ms`)
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

  throw new Error(`Cannot extract JSON array from: ${raw.substring(0, 200)}`)
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY belum dikonfigurasi di server.' }, { status: 500 })
    }

    const body = await req.json()
    const { action_title, methodology, problem_title, description } = body

    if (!action_title) {
      return NextResponse.json({ error: 'Judul action plan tidak disertakan' }, { status: 400 })
    }

    const prompt = `Anda adalah konsultan operasional Lean Six Sigma (Black Belt). Anda sedang memandu tim untuk mengeksekusi rencana perbaikan (Action Plan).

Data Action Plan:
- Judul: "${action_title}"
- Deskripsi/Justifikasi: "${description || '-'}"
- Masalah yang Ingin Diselesaikan: "${problem_title || '-'}"
- Metodologi Terkait: "${methodology || '-'}"

Tugas Anda adalah mem-breakdown action plan tersebut menjadi 3-6 langkah konkret dan berurutan yang dapat dieksekusi (checklist). Langkah harus ringkas, jelas, dan dapat dipantau penyelesaiannya.

KEMBALIKAN OUTPUT SEBAGAI JSON ARRAY OBJECT SAJA, TANPA TEKS LAIN.
CONTOH FORMAT OUTPUT (harus valid JSON array of objects dengan key "description"):
[
  { "description": "Langkah 1: ..." },
  { "description": "Langkah 2: ..." },
  { "description": "Langkah 3: ..." }
]`

    const rawResponse = await callAI(prompt, apiKey)
    const result = extractJson(rawResponse)

    if (!Array.isArray(result)) {
      throw new Error('Hasil AI bukan berupa array JSON.')
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('[API/generate-action-steps] error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat men-generate checklist ke AI.' },
      { status: 500 }
    )
  }
}
