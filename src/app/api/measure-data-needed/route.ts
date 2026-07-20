import { NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/ai-providers/orchestrator'

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



  const prompt = buildPrompt(charter)

  try {
    const aiRes = await generateWithFallback(prompt, {
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      maxTokens: 2048
    })
    const rawText = aiRes.text
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
