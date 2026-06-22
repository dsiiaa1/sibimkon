import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ── Simple in-memory rate limiter (resets per deployment/restart) ────────────
// Limit: 10 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const windowMs = 60_000 // 1 minute
  const maxReqs = 10

  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }
  if (entry.count >= maxReqs) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true }
}

// ── Helper: get caller IP from request headers ───────────────────────────────
function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

// Derive top problems from PQCDSM scores — returns array of { dimension, score } sorted worst first
function deriveTopProblems(scores: Record<string, number>) {
  const labels: Record<string, string> = {
    productivity: 'Produktivitas',
    quality: 'Kualitas',
    cost: 'Efisiensi Biaya',
    delivery: 'Ketepatan Delivery',
    safety: 'Keselamatan Kerja',
    morale: 'Moral & SDM',
  }
  return Object.entries(scores)
    .filter(([, v]) => typeof v === 'number')
    .map(([k, v]) => ({ dimension: labels[k] || k, score: v }))
    .sort((a, b) => a.score - b.score) // ascending = worst first
}

// Build a dynamic fallback response from the actual project data sent in the request
function buildDynamicFallback(
  projectTitle: string,
  companyName: string,
  vomList: string[],
  pqcdsmScores: Record<string, number>,
  whyTree: Array<{ why?: string; answer?: string }>,
  fishboneItems: Array<{ category: string; text: string }>,
) {
  const topProblems = deriveTopProblems(pqcdsmScores)
  const worstDim = topProblems[0]?.dimension ?? 'produktivitas'
  const secondDim = topProblems[1]?.dimension ?? 'kualitas'
  const prodScore = pqcdsmScores.productivity ?? pqcdsmScores.produktivity ?? null
  const qualScore = pqcdsmScores.quality ?? null
  const costScore = pqcdsmScores.cost ?? null

  // Collect unique root-cause hints from 5-Why answers
  const whyAnswers = whyTree
    .map((w: any) => w.answer)
    .filter(Boolean)
    .slice(0, 3)

  // Collect machine/method fishbone items as context
  const fishboneHints = (fishboneItems || [])
    .filter((f) => ['machine', 'method', 'man'].includes(f.category))
    .map((f) => f.text)
    .slice(0, 3)

  // VOM context (voice of management)
  const vomContext =
    Array.isArray(vomList) && vomList.length > 0
      ? vomList.slice(0, 2).join('; ')
      : 'kondisi operasional saat ini'

  // Dynamic root causes: use whyTree answers if available, else generic dimension-based
  const rootCauses: string[] =
    whyAnswers.length >= 2
      ? [
          ...whyAnswers,
          ...fishboneHints.slice(0, Math.max(0, 3 - whyAnswers.length)),
        ].slice(0, 3)
      : [
          `Belum adanya standar operasional yang konsisten pada dimensi ${worstDim}`,
          `Rendahnya skor ${worstDim} (${topProblems[0]?.score ?? '-'}%) mengindikasikan kebutuhan perbaikan proses`,
          `Dimensi ${secondDim} juga membutuhkan perhatian dengan skor ${topProblems[1]?.score ?? '-'}%`,
        ]

  // Realistic targets: nudge worst 3 dimensions toward improvement
  const realisticTargets: Record<string, number> = {}
  topProblems.slice(0, 3).forEach(({ dimension }) => {
    const key = Object.keys(pqcdsmScores).find(
      (k) =>
        k === dimension.toLowerCase() ||
        (k === 'productivity' && dimension === 'Produktivitas') ||
        (k === 'quality' && dimension === 'Kualitas') ||
        (k === 'cost' && dimension === 'Efisiensi Biaya'),
    )
    if (key) realisticTargets[key] = Math.min(100, Math.round((pqcdsmScores[key] ?? 60) + 15))
  })
  // Always include the three main KPI targets shown in the UI
  realisticTargets.productivity = Math.min(100, Math.round((prodScore ?? 60) + 15))
  realisticTargets.quality = Math.min(100, Math.round((qualScore ?? 60) + 15))
  realisticTargets.cost = Math.min(100, Math.round((costScore ?? 60) + 10))

  // Priority recommendations keyed on worst dimensions
  const recMap: Record<string, { program: string; description: string; impact: string }> = {
    productivity: {
      program: 'Standardized Work & Lean Process',
      description: `Petakan alur proses utama di ${companyName}, tetapkan standar waktu, dan eliminasi pemborosan untuk meningkatkan output`,
      impact: 'Estimasi peningkatan produktivitas 15-20%',
    },
    quality: {
      program: 'Quality Control Circle (QCC)',
      description: 'Bentuk tim QCC lintas fungsi untuk identifikasi dan eliminasi sumber defect secara berkelanjutan',
      impact: 'Target penurunan defect rate ≥ 50%',
    },
    cost: {
      program: 'Cost Reduction & Waste Elimination',
      description: 'Audit pemborosan (7 waste Lean) dan implementasikan program penghematan energi & material',
      impact: 'Estimasi penghematan biaya operasional 10-15%',
    },
    delivery: {
      program: 'Pull System & Penjadwalan Produksi',
      description: 'Terapkan sistem kanban atau jadwal produksi berbasis permintaan untuk mengurangi keterlambatan delivery',
      impact: 'On-time delivery meningkat ke >95%',
    },
    safety: {
      program: 'Program SMK3 & Safety Training',
      description: 'Perbarui risk assessment, lakukan safety induction berkala, dan pastikan APD tersedia dan digunakan',
      impact: 'Zero accident target dalam 6 bulan',
    },
    morale: {
      program: 'Employee Engagement & Reward System',
      description: 'Rancang program penghargaan berbasis pencapaian KPI, tingkatkan transparansi informasi kepada karyawan',
      impact: 'Penurunan turnover dan absensi ≥ 20%',
    },
  }

  const recommendations = topProblems
    .slice(0, 3)
    .map(({ dimension }) => {
      const key = Object.keys(pqcdsmScores).find(
        (k) =>
          (k === 'productivity' && dimension === 'Produktivitas') ||
          (k === 'quality' && dimension === 'Kualitas') ||
          (k === 'cost' && dimension === 'Efisiensi Biaya') ||
          (k === 'delivery' && dimension === 'Ketepatan Delivery') ||
          (k === 'safety' && dimension === 'Keselamatan Kerja') ||
          (k === 'morale' && dimension === 'Moral & SDM'),
      )
      return recMap[key ?? 'productivity'] ?? recMap.productivity
    })
    .filter((v, i, arr) => arr.findIndex((r) => r.program === v.program) === i) // deduplicate

  // Ensure at least 3 recommendations
  while (recommendations.length < 3) {
    const extras = Object.values(recMap).filter(
      (r) => !recommendations.find((rec) => rec.program === r.program),
    )
    if (extras.length === 0) break
    recommendations.push(extras[0])
  }

  return {
    summary: `Berdasarkan analisis data proyek "${projectTitle}" di ${companyName}, kendala utama teridentifikasi pada dimensi ${worstDim} (skor: ${topProblems[0]?.score ?? '-'}%) dan ${secondDim} (skor: ${topProblems[1]?.score ?? '-'}%). Keluhan manajemen mencakup: ${vomContext}. Analisis 5-Why menunjukkan bahwa akar penyebab berada di level proses dan standarisasi operasional.`,
    root_causes: rootCauses,
    priority_recommendations: recommendations.slice(0, 3),
    realistic_targets: realisticTargets,
  }
}

export async function POST(req: Request) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(req)
  const rl = checkRateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan. Coba lagi dalam beberapa saat.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfter ?? 60) },
      }
    )
  }

  // ── Auth check: harus ada Supabase session yang valid ─────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      })
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized. Silakan login terlebih dahulu.' },
          { status: 401 }
        )
      }
    } catch {
      // Jika Supabase tidak tersedia, lanjutkan (demo mode)
    }
  }

  try {
    const { projectTitle, companyName, vomList, pqcdsmScores, whyTree, fishboneItems } = await req.json()

    const geminiKey = process.env.GEMINI_API_KEY

    // If Gemini key is missing, build a fully dynamic response from the project's actual data
    // IMPORTANT: never use hardcoded industry-specific content here — all narrative derives from
    // the pqcdsmScores, vomList, whyTree, and fishboneItems sent by the caller for this specific project.
    if (!geminiKey) {
      console.warn('GEMINI_API_KEY is not defined. Returning dynamic data-driven response for project:', projectTitle)
      return NextResponse.json(
        buildDynamicFallback(projectTitle, companyName, vomList, pqcdsmScores, whyTree, fishboneItems ?? []),
      )
    }

    // Call real Google Gemini API
    const prompt = `
Anda adalah Konsultan Produktivitas Industri Senior dari Kementerian Ketenagakerjaan RI (Kemnaker).
Analisa data berikut dan berikan rekomendasi terstruktur untuk perbaikan produktivitas perusahaan klien.

Nama Perusahaan: ${companyName}
Judul Proyek: ${projectTitle}

Keluhan Manajemen (Voice of Management):
${JSON.stringify(vomList, null, 2)}

Skor Baseline PQCDSM (%):
- Productivity: ${pqcdsmScores.productivity || 60}%
- Quality: ${pqcdsmScores.quality || 50}%
- Cost: ${pqcdsmScores.cost || 50}%
- Delivery: ${pqcdsmScores.delivery || 50}%
- Safety: ${pqcdsmScores.safety || 70}%
- Morale: ${pqcdsmScores.morale || 60}%

Analisa 5-Why Akar Masalah:
${JSON.stringify(whyTree, null, 2)}

Berikan respon dalam format JSON yang valid dengan struktur berikut:
{
  "summary": "Ringkasan analisis kendala utama berdasarkan data",
  "root_causes": ["Akar masalah 1", "Akar masalah 2", "Akar masalah 3"],
  "priority_recommendations": [
    { "program": "Nama program perbaikan (misal: 5S, Kaizen, TPM)", "description": "Deskripsi singkat program", "impact": "Dampak estimasi perbaikan" }
  ],
  "realistic_targets": {
    "productivity": 80,
    "quality": 95,
    "cost": 85
  }
}
Kembalikan HANYA JSON di atas tanpa markdown formatting lainnya.
`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API failed with status ${response.status}`)
    }

    const data = await response.json()
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text
    const jsonResult = JSON.parse(textResult)

    return NextResponse.json(jsonResult)
  } catch (err: any) {
    console.error('Error calling Gemini:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
