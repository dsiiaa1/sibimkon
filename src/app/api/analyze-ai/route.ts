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
SELAIN ITU, Anda juga harus langsung melakukan simulasi analisis dan menghasilkan data terstruktur Root Cause HANYA BERDASARKAN MASALAH YANG ADA DI PROJECT CHARTER DAN MEASURE TERSEBUT.

PERINGATAN KERAS (CRITICAL WARNING): 
JANGAN MENGGUNAKAN DATA CONTOH ATAU KARANGAN SENDIRI! Anda wajib menyesuaikan isi RCA dengan bidang industri/konteks yang tertulis di Project Charter. Jika Charter tidak diisi, hasilkan data abstrak seperti "Proses Sistem A bermasalah", "Error pada modul B". JANGAN PERNAH MENGHASILKAN DATA TENTANG PABRIK ATAU PRODUKSI JIKA KONTEKSNYA BUKAN PABRIK! PAHAMI KONTEKS CHARTER TERLEBIH DAHULU SEBELUM MENGHASILKAN DATA RCA!

Anda harus memilih metode rekomendasi HANYA dari daftar tertutup berikut:
- 5 Whys
- Fishbone Diagram
- Pareto Analysis
- FMEA (Failure Mode and Effects Analysis)

PENTING: CONTOH DI BAWAH INI HANYA UNTUK MENUNJUKKAN FORMAT STRUKTUR JSON. ANDA DILARANG KERAS MENYALIN ISI DATA (SEPERTI "JAHITAN", "OPERATOR", DLL) DARI CONTOH INI. ANDA HARUS MENGHASILKAN DATA (KATEGORI, ITEM, PROBLEM, SCORE, DLL) BERDASARKAN KONTEKS PROJECT CHARTER DAN MEASURE YANG DIBERIKAN DI ATAS!

Kembalikan respon HANYA dalam format JSON array of objects berikut (tanpa backticks, tanpa teks pengantar, valid JSON):
[
  {
    "method": "Fishbone Diagram",
    "reasoning": "Jelaskan alasan berdasarkan charter dan problem di atas.",
    "priority": 1,
    "source": "ai",
    "structure_type": "category_list",
    "data": {
      "categories": [
        {
          "name": "[Kategori Contoh 1]",
          "items": [
            { "id": "fb-1", "text": "[Isi penyebab spesifik dari kategori 1 berdasarkan masalah yang ada]" }
          ]
        },
        {
          "name": "[Kategori Contoh 2]",
          "items": [
            { "id": "fb-2", "text": "[Isi penyebab spesifik dari kategori 2]" }
          ]
        }
      ]
    }
  },
  {
    "method": "Pareto Analysis",
    "reasoning": "Jelaskan mengapa Pareto cocok untuk masalah ini.",
    "priority": 2,
    "source": "ai",
    "structure_type": "ranked_list",
    "data": {
      "columns": ["Problem", "Score"],
      "items": [
        { "id": "p-1", "name": "[Nama masalah/defect dominan 1]", "score": 150 },
        { "id": "p-2", "name": "[Nama masalah/defect dominan 2]", "score": 85 }
      ]
    }
  },
  {
    "method": "5 Whys",
    "reasoning": "Jelaskan mengapa 5 Whys cocok untuk menggali akar masalah ini.",
    "priority": 3,
    "source": "ai",
    "structure_type": "nested_list",
    "data": {
      "problem": "[Sebutkan masalah spesifik yang ingin dicari akar penyebabnya]",
      "items": [
        {
          "id": "w-1",
          "level": 1,
          "question": "Mengapa [masalah] terjadi?",
          "answer": "[Penyebab level 1]"
        },
        {
          "id": "w-2",
          "level": 2,
          "question": "Mengapa [penyebab level 1] terjadi?",
          "answer": "[Penyebab level 2, dan seterusnya hingga akar masalah terdalam]"
        }
      ]
    }
  }
]

ATURAN STRUKTUR DATA:
1. Jika metode membutuhkan kategorisasi (seperti Fishbone), gunakan structure_type "category_list".
2. Jika metode membutuhkan ranking/skoring (seperti Pareto), gunakan structure_type "ranked_list".
3. Jika metode membutuhkan kedalaman/urutan logis beruntun (seperti 5 Whys), gunakan "nested_list".
4. Pastikan ID unik untuk setiap item (cth: fb-1, w-1, p-1).
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
    let parsed = extractJson(rawText)

    if (!Array.isArray(parsed)) {
      if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
        parsed = parsed.recommendations
      } else {
        throw new Error('Response bukan berupa array JSON yang diharapkan')
      }
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
