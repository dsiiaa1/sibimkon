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
    max_tokens: 1536,
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

      console.warn(`[analyze-ai] 429 rate limit, retry ${attempt + 1}/${MAX_RETRIES} in ${backoffMs}ms`)
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

function buildPrompt(data: {
  charter: {
    problem_statement: string
    objectives: string
    scope: string
    team_members: any[]
  }
  dataCollected: {
    requirements: any[]
    problems: any[]
    measure_summary?: any
  }
}): string {
  const charterStr = `
- Problem Statement: ${data.charter?.problem_statement || 'Tidak diisi'}
- Goal/Objective: ${data.charter?.objectives || 'Tidak diisi'}
- Scope: ${data.charter?.scope || 'Tidak diisi'}
- Team/Stakeholders: ${JSON.stringify(data.charter?.team_members || [])}
`
  const dataReqsStr = (data.dataCollected?.requirements || []).map((r: any) => 
    `- Nama Data: ${r.name}\n  Deskripsi: ${r.description || '-'}\n  Status: ${r.status}\n  Summary: ${JSON.stringify(r.parsed_summary || {})}`
  ).join('\n')

  const problemsStr = (data.dataCollected?.problems || []).map((p: any) => 
    `- Masalah: ${p.problem_text}\n  Dimensi PQCDSM: ${p.pqcdsm_dimension}\n  Rekomendasi Metode Measure: ${JSON.stringify(p.recommended_methods || [])}`
  ).join('\n')

  const summaryStr = data.dataCollected?.measure_summary ? JSON.stringify(data.dataCollected.measure_summary) : 'Tidak ada summary agregat'

  return `Anda adalah konsultan senior Lean Six Sigma (DMAIC Expert).

Berikut adalah data dari tahap DEFINE (Project Charter):
${charterStr}

Berikut adalah data dari tahap MEASURE (Pengukuran & Hasil):
1. Ringkasan Level Kinerja (Sigma Level/DPMO):
${summaryStr}

2. Data yang Dikumpulkan:
${dataReqsStr || 'Tidak ada data terupload'}

3. Masalah/Kandidat Root Cause yang Teridentifikasi:
${problemsStr || 'Tidak ada masalah teridentifikasi'}

---

TUGAS ANDA:
Berdasarkan konteks Project Charter (Define) dan data hasil pengukuran (Measure) di atas, rekomendasikan metode analisis yang paling tepat untuk mendalami akar masalah (Root Cause Analysis).

Anda harus memilih metode rekomendasi HANYA dari daftar tertutup berikut:
- 5 Whys
- Fishbone / Ishikawa Diagram
- Pareto Analysis
- Regression Analysis
- Hypothesis Testing
- FMEA (Failure Mode and Effects Analysis)

Kembalikan respon HANYA dalam format JSON berikut (tanpa backticks, tanpa teks pengantar, pastikan format JSON valid):
{
  "recommendedMethod": "Pilih salah satu dari daftar tertutup di atas",
  "reasoning": "Alasan singkat dan tajam mengapa metode ini paling sesuai untuk tipe data dan masalah ini",
  "analysisResult": {
    "summary": "Ringkasan analisis temuan dari data Define dan Measure yang dikirimkan",
    "keyFindings": [
      "Temuan kunci 1 berdasarkan data",
      "Temuan kunci 2 berdasarkan data"
    ],
    "suggestedRootCauses": [
      "Kandidat akar masalah 1 yang perlu diselidiki",
      "Kandidat akar masalah 2 yang perlu diselidiki"
    ]
  }
}
`
}

export async function POST(req: Request) {
  let body: any = {}

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.charter) {
    return NextResponse.json(
      { error: 'Data charter wajib dikirimkan sebagai konteks' },
      { status: 400 }
    )
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Konfigurasi AI belum tersedia. Silakan tambahkan GROQ_API_KEY di berkas .env.local' },
      { status: 503 }
    )
  }

  const prompt = buildPrompt(body)

  try {
    const rawText = await callAI(prompt, apiKey)
    const parsed = extractJson(rawText)

    if (!parsed.recommendedMethod || !parsed.analysisResult) {
      throw new Error('Response tidak memiliki field recommendedMethod atau analysisResult yang valid')
    }

    return NextResponse.json(parsed)
  } catch (err: any) {
    console.error('[analyze-ai] Error:', err.message)
    return NextResponse.json(
      { error: `Analisis AI gagal: ${err.message}` },
      { status: 502 }
    )
  }
}
