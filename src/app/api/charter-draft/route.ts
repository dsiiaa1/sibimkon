import { NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/ai-providers/orchestrator'
import { createClient } from '@/lib/supabase/server'
import { getMockDB } from '@/lib/mockData'

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

  throw new Error(`Cannot extract JSON object from: ${raw.substring(0, 200)}`)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID tidak disertakan' }, { status: 400 })
    }

    let companyId = null
    
    // 1. Fetch project to get company_id
    let sb: any = null
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        sb = await createClient()
      }
    } catch(e) {}

    if (sb) {
      const { data: proj, error: projErr } = await sb.from('bimkon_projects').select('company_id').eq('id', projectId).maybeSingle()
      if (!projErr && proj) {
        companyId = proj.company_id
      }
    } else {
      const db = getMockDB()
      const proj = db.projects.find((p: any) => p.id === projectId)
      if (proj) companyId = proj.company_id
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Project tidak ditemukan atau tidak memiliki company_id' }, { status: 404 })
    }

    // 2. Fetch company baseline assessment
    let assessmentData = null
    if (sb) {
      const { data: assess, error: assessErr } = await sb.from('company_baseline_assessments').select('*').eq('company_id', companyId).maybeSingle()
      if (!assessErr && assess) {
        assessmentData = assess
      }
    } else {
      const db = getMockDB()
      assessmentData = db.companyBaselineAssessments[companyId]
    }

    if (!assessmentData) {
      return NextResponse.json({ error: 'Data kuesioner onboarding perusahaan belum diisi' }, { status: 404 })
    }

    // Prepare JSON structures for prompt
    const pqcdsmData = {
      production: assessmentData.dimensi_production,
      quality: assessmentData.dimensi_quality,
      cost: assessmentData.dimensi_cost,
      delivery: assessmentData.dimensi_delivery,
      safety: assessmentData.dimensi_safety,
      morale: assessmentData.dimensi_morale,
    }
    const summaryData = {
      masalah_utama: assessmentData.ringkasan_masalah_utama,
      rencana_program: assessmentData.ringkasan_rencana_program
    }

    const prompt = `Anda adalah konsultan ahli operasional Lean Six Sigma. Anda ditugaskan menyusun draf Project Charter berdasarkan data kuesioner onboarding perusahaan klien.

Data Kuesioner:
Struktur Staf: ${JSON.stringify(assessmentData.struktur_staf)}
Dimensi PQCDSM: ${JSON.stringify(pqcdsmData)}
Ringkasan Manajemen: ${JSON.stringify(summaryData)}

Tugas Anda: Buat draf untuk 4 kolom berikut dalam bentuk JSON (pastikan valid JSON, hanya kembalikan object JSON saja, tanpa tambahan kalimat pengantar atau markdown lainnya):
- "problem_statement": (string) Pernyataan masalah yang spesifik berdasarkan data kuesioner (apa masalahnya, seberapa besar, dampaknya).
- "objectives": (string) Tujuan proyek yang SMART (Specific, Measurable, Achievable, Relevant, Time-bound).
- "productivity_target": (string) Target efisiensi/produktivitas atau perbaikan metrik yang diharapkan.
- "scope": (string) Batasan masalah atau area kerja proyek ini (in scope & out of scope).
- "business_case": (string) Alasan strategis mengapa proyek ini penting bagi perusahaan secara finansial atau kelangsungan bisnis.
- "timeline": (string) Estimasi garis waktu proyek dari awal hingga akhir dalam hitungan minggu atau bulan.

CONTOH OUTPUT:
{
  "problem_statement": "Tingkat defect pada produk X mencapai 8% melebihi toleransi maksimal 2%...",
  "objectives": "Menurunkan tingkat defect dari 8% menjadi 2% pada akhir kuartal 4.",
  "productivity_target": "Peningkatan yield rate produksi sebesar 6%.",
  "scope": "In scope: Proses produksi di Line 1. Out of scope: Pengiriman dan logistik.",
  "business_case": "Mengurangi cacat produksi akan menghemat biaya material sebesar 15% per bulan.",
  "timeline": "Bulan 1-2: Fase Measure & Analyze. Bulan 3: Improve & Control."
}`

    const aiRes = await generateWithFallback(prompt, {
      model: 'llama-3.1-8b-instant',
      temperature: 0.2,
      maxTokens: 2048
    })
    
    const rawResponse = aiRes.text
    const result = extractJson(rawResponse)

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('[API/charter-draft] error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat menyusun draft AI.' },
      { status: 500 }
    )
  }
}
