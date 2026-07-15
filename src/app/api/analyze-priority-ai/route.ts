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

      console.warn(`[analyze-priority-ai] 429 rate limit, retry ${attempt + 1}/${MAX_RETRIES} in ${backoffMs}ms`)
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

function buildPrompt(data: {
  charter: any
  dataCollected: any
  rcaResults: any[]
}): string {
  const charterStr = `
- Problem Statement: ${data.charter?.problem_statement || 'Tidak diisi'}
- Goal/Objective: ${data.charter?.objectives || 'Tidak diisi'}
- Scope: ${data.charter?.scope || 'Tidak diisi'}
`

  const summaryStr = data.dataCollected?.measure_summary ? JSON.stringify(data.dataCollected.measure_summary) : 'Tidak ada summary agregat'
  
  const rcaStr = data.rcaResults?.map((r, idx) => `
### Hasil RCA ${idx + 1}: ${r.method}
Struktur Data: ${r.structure_type}
Data: ${JSON.stringify(r.data)}
  `).join('\n') || 'Tidak ada data RCA'

  return `Anda adalah konsultan senior Lean Six Sigma (DMAIC Expert).

Berikut adalah data dari tahap DEFINE (Project Charter):
${charterStr}

Berikut adalah metrik dari tahap MEASURE (Pengukuran & Hasil):
${summaryStr}

Berikut adalah hasil Root Cause Analysis (RCA) yang telah diselesaikan:
${rcaStr}

---

TUGAS ANDA:
Berdasarkan seluruh hasil analisis RCA di atas (Fishbone, Pareto, 5 Whys, dll), susun daftar masalah yang perlu dibenahi. Urutkan berdasarkan skala prioritas (mempertimbangkan dampak terhadap defect, biaya rework, dan kepuasan pelanggan dari data Measure).
Untuk setiap masalah prioritas, sertakan juga rencana tindakan (action plan) awal: langkah perbaikan, penanggung jawab yang disarankan, dan estimasi timeline.

PERINGATAN KERAS (CRITICAL WARNING): 
JANGAN MENGGUNAKAN DATA CONTOH ATAU KARANGAN SENDIRI! Anda wajib menyintesis HANYA dari data yang benar-benar ada di konteks Project Charter dan hasil RCA di atas. Jika data kosong, hasilkan data abstrak. JANGAN PERNAH menghasilkan contoh data tentang pabrik/produksi (jahit, mesin) jika konteksnya bukan itu!

Kembalikan respon HANYA dalam format JSON array of objects berikut (tanpa backticks, tanpa teks pengantar, valid JSON):
[
  {
    "no": 1,
    "problem": "Masalah dominan pertama (berdasarkan Pareto/Fishbone, dll)",
    "priority_score": 90,
    "priority_level": "Tinggi",
    "justification": "Penjelasan mengapa ini prioritas 1, hubungkan dengan skor Pareto atau kedalaman akar masalah di 5 Whys",
    "related_methods": ["Pareto Analysis", "5 Whys"],
    "action_plan": [
      {
        "id": "ap-1-1",
        "action": "Langkah spesifik perbaikan pertama",
        "pic": "Supervisor Produksi",
        "timeline": "2 minggu"
      },
      {
        "id": "ap-1-2",
        "action": "Langkah perbaikan kedua",
        "pic": "QA Lead",
        "timeline": "1 bulan"
      }
    ]
  }
]

ATURAN:
1. Pastikan setiap objek action_plan memiliki properti 'id' yang unik (string acak/format seperti "ap-x-y").
2. Pastikan urutan nomor (no) dari 1, 2, dst sesuai dengan prioritas paling tinggi.
3. Priority level gunakan "Tinggi", "Sedang", atau "Rendah".
4. Priority score rentang 1-100.
`
}

export async function POST(req: Request) {
  let body: any = {}

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.charter || !body.rcaResults) {
    return NextResponse.json(
      { error: 'Data charter dan rcaResults wajib dikirimkan sebagai konteks' },
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
    let parsed = extractJson(rawText)

    if (!Array.isArray(parsed)) {
      if (parsed.priorities && Array.isArray(parsed.priorities)) {
        parsed = parsed.priorities
      } else {
        throw new Error('Response bukan berupa array JSON yang diharapkan')
      }
    }

    return NextResponse.json(parsed)
  } catch (err: any) {
    console.error('[analyze-priority-ai] Error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Gagal memproses AI' },
      { status: 500 }
    )
  }
}
