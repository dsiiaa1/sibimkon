import { NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/ai-providers/orchestrator'


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

    const aiRes = await generateWithFallback(prompt, {
      model: 'llama-3.1-8b-instant',
      temperature: 0.2,
      maxTokens: 1024
    })
    const rawResponse = aiRes.text
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
