import { NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/ai-providers/orchestrator'

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



  const prompt = buildPrompt(body)

  try {
    const aiRes = await generateWithFallback(prompt, {
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      maxTokens: 1024
    })
    const rawText = aiRes.text
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
