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
    const { projectId, isRegenerate, userRole } = body

    // ── Role check for regenerate ──────────────────────────────────────────────
    if (isRegenerate && userRole !== 'konsultan') {
      return NextResponse.json(
        { error: 'Hanya konsultan yang dapat melakukan regenerate draft charter' },
        { status: 403 }
      )
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID tidak disertakan' }, { status: 400 })
    }

    let companyId: string | null = null
    let projectTitle: string | null = null
    let projectDescription: string | null = null

    // 1. Fetch project to get company_id, title, description (FIX: sebelumnya hanya company_id)
    let sb: any = null
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        sb = await createClient()
      }
    } catch(e) {}

    if (sb) {
      const { data: proj, error: projErr } = await sb
        .from('bimkon_projects')
        .select('company_id, title, description')  // FIX: tambahkan title & description
        .eq('id', projectId)
        .maybeSingle()
      if (!projErr && proj) {
        companyId = proj.company_id
        projectTitle = proj.title || null
        projectDescription = proj.description || null
      }
    } else {
      const db = getMockDB()
      const proj = db.projects.find((p: any) => p.id === projectId)
      if (proj) {
        companyId = proj.company_id
        projectTitle = proj.title || null
        projectDescription = proj.description || null
      }
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Project tidak ditemukan atau tidak memiliki company_id' }, { status: 404 })
    }

    // FIX: Validasi title/description proyek — wajib ada agar charter relevan
    if (!projectTitle || !projectTitle.trim()) {
      return NextResponse.json(
        { error: 'Judul proyek belum diisi. Tidak bisa membuat draft charter tanpa judul proyek.' },
        { status: 400 }
      )
    }

    // 2. Fetch company baseline assessment
    let assessmentData: any = null
    if (sb) {
      const { data: assess, error: assessErr } = await sb
        .from('company_baseline_assessments')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle()
      if (!assessErr && assess) {
        assessmentData = assess
      }
    } else {
      const db = getMockDB()
      assessmentData = db.companyBaselineAssessments?.[companyId]
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

    // FIX: Prompt baru — project title/description sebagai FOKUS UTAMA
    const prompt = `Anda adalah konsultan ahli operasional Lean Six Sigma (Master Black Belt).

FOKUS PROYEK INI (WAJIB DIJADIKAN TOPIK UTAMA — JANGAN MENYIMPANG):
Judul Proyek: ${projectTitle}
Deskripsi Masalah Proyek: ${projectDescription || '(tidak ada deskripsi tambahan)'}

Data pendukung dari kuesioner onboarding perusahaan (gunakan HANYA bagian yang relevan dengan topik proyek di atas; abaikan dimensi yang tidak berkaitan dengan "${projectTitle}"):
Struktur Staf: ${JSON.stringify(assessmentData.struktur_staf)}
Dimensi PQCDSM: ${JSON.stringify(pqcdsmData)}
Ringkasan Manajemen: ${JSON.stringify(summaryData)}

ATURAN PENTING:
1. Seluruh isi charter (problem_statement, objectives, productivity_target, scope, business_case, timeline) HARUS membahas topik "${projectTitle}" secara spesifik dan relevan.
2. JANGAN membahas dimensi PQCDSM lain yang tidak berkaitan dengan topik proyek ini. Misal jika proyek ini tentang keterlambatan pengiriman, fokus pada delivery — bukan quality/defect.
3. Gunakan angka/fakta spesifik dari deskripsi proyek dan data pendukung yang relevan.
4. Charter antar-proyek dalam perusahaan yang sama harus berbeda — buat konten yang benar-benar spesifik untuk proyek ini.

Tugas Anda: Buat draf untuk 7 kolom berikut dalam bentuk JSON (hanya kembalikan object JSON saja, tanpa teks tambahan):
- "problem_category": (string) Klasifikasikan topik proyek ke SATU kategori paling dominan berikut: "quality", "delivery", "cost", "production", "safety", atau "morale".
- "problem_statement": (string) Pernyataan masalah yang spesifik tentang "${projectTitle}" (apa masalahnya, seberapa besar, dampaknya pada operasional).
- "objectives": (string) Tujuan proyek yang SMART (Specific, Measurable, Achievable, Relevant, Time-bound) terkait "${projectTitle}".
- "productivity_target": (string) Target efisiensi/produktivitas atau perbaikan metrik yang diharapkan dari penyelesaian masalah "${projectTitle}".
- "scope": (string) Batasan masalah atau area kerja proyek ini (in scope & out of scope) terkait "${projectTitle}".
- "business_case": (string) Alasan strategis mengapa masalah "${projectTitle}" penting diselesaikan secara finansial atau kelangsungan bisnis.
- "timeline": (string) Estimasi garis waktu proyek dari awal hingga akhir dalam hitungan minggu atau bulan.

FORMAT OUTPUT (WAJIB valid JSON object):
{
  "problem_category": "...",
  "problem_statement": "...",
  "objectives": "...",
  "productivity_target": "...",
  "scope": "...",
  "business_case": "...",
  "timeline": "..."
}`

    const aiRes = await generateWithFallback(prompt, {
      model: 'llama-3.1-8b-instant',
      temperature: 0.2,
      maxTokens: 2048
    })

    const rawResponse = aiRes.text
    const result = extractJson(rawResponse)

    // Update project_category di tabel projects jika menggunakan supabase
    if (sb && result.problem_category && projectId) {
      await sb.from('bimkon_projects').update({
        problem_category: result.problem_category,
        updated_at: new Date().toISOString()
      }).eq('id', projectId)
    } else if (!sb && result.problem_category && projectId) {
      // Mock db
      const db = getMockDB()
      const updatedProjects = db.projects.map((p: any) => p.id === projectId ? { ...p, problem_category: result.problem_category } : p)
      import('@/lib/mockData').then(({ updateMockDB }) => {
        updateMockDB('projects', updatedProjects)
      })
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('[API/charter-draft] error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat menyusun draft AI.' },
      { status: 500 }
    )
  }
}
