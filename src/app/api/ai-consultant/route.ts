import { NextResponse } from 'next/server'

// ── Simple in-memory rate limiter (resets per deployment/restart) ────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const windowMs = 60_000
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

function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

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
    .map(([k, v]) => ({ key: k, dimension: labels[k] || k, score: v }))
    .sort((a, b) => a.score - b.score)
}

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
  const prodScore = pqcdsmScores.productivity ?? null
  const qualScore = pqcdsmScores.quality ?? null
  const costScore = pqcdsmScores.cost ?? null

  const whyAnswers = whyTree.map((w: any) => w.answer).filter(Boolean).slice(0, 3)
  const fishboneHints = (fishboneItems || [])
    .filter((f) => ['machine', 'method', 'man'].includes(f.category))
    .map((f) => f.text)
    .slice(0, 3)
  const vomContext =
    Array.isArray(vomList) && vomList.length > 0
      ? vomList.slice(0, 2).join('; ')
      : 'kondisi operasional saat ini'

  const rootCauses: string[] =
    whyAnswers.length >= 2
      ? [...whyAnswers, ...fishboneHints.slice(0, Math.max(0, 3 - whyAnswers.length))].slice(0, 3)
      : [
          `Belum adanya standar operasional yang konsisten pada dimensi ${worstDim}`,
          `Rendahnya skor ${worstDim} (${topProblems[0]?.score ?? '-'}%) mengindikasikan kebutuhan perbaikan proses`,
          `Dimensi ${secondDim} juga membutuhkan perhatian dengan skor ${topProblems[1]?.score ?? '-'}%`,
        ]

  const realisticTargets: Record<string, number> = {
    productivity: Math.min(100, Math.round((prodScore ?? 60) + 15)),
    quality: Math.min(100, Math.round((qualScore ?? 60) + 15)),
    cost: Math.min(100, Math.round((costScore ?? 60) + 10)),
  }

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
    .map(({ key }) => recMap[key] ?? recMap.productivity)
    .filter((v, i, arr) => arr.findIndex((r) => r.program === v.program) === i)

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
  // Rate limiting
  const ip = getClientIp(req)
  const rl = checkRateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan. Coba lagi dalam beberapa saat.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
    )
  }

  // Auth check di-handle oleh middleware.ts yang sudah memproteksi /projects/* routes.
  // API route ini hanya bisa dicapai kalau user sudah melewati middleware auth check.
  // Tidak perlu re-verify session di sini untuk menghindari false-positive Unauthorized errors.

  // Parse request body
  let projectTitle = '', companyName = ''
  let vomList: string[] = []
  let pqcdsmScores: Record<string, number> = {}
  let whyTree: any[] = []
  let fishboneItems: any[] = []

  try {
    const body = await req.json()
    projectTitle = body.projectTitle ?? ''
    companyName = body.companyName ?? ''
    vomList = body.vomList ?? []
    pqcdsmScores = body.pqcdsmScores ?? {}
    whyTree = body.whyTree ?? []
    fishboneItems = body.fishboneItems ?? []
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const geminiKey = process.env.GEMINI_API_KEY

  // No key → always return dynamic fallback
  if (!geminiKey) {
    console.warn('GEMINI_API_KEY not set. Using dynamic fallback for:', projectTitle)
    return NextResponse.json(
      buildDynamicFallback(projectTitle, companyName, vomList, pqcdsmScores, whyTree, fishboneItems),
    )
  }

  // Build prompt
  const prompt = `Anda adalah Konsultan Produktivitas Industri Senior pada platform SIBIMKON.
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
    { "program": "Nama program perbaikan", "description": "Deskripsi singkat program", "impact": "Dampak estimasi perbaikan" }
  ],
  "realistic_targets": {
    "productivity": 80,
    "quality": 95,
    "cost": 85
  }
}
Kembalikan HANYA JSON di atas tanpa markdown formatting lainnya.`

  // Call Gemini — auth key (AQ.xxx) uses x-goog-api-key header, standard key (AIza...) uses ?key= param
  try {
    const isAuthKey = geminiKey.startsWith('AQ.')
    const url = isAuthKey
      ? 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
      : `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(isAuthKey ? { 'x-goog-api-key': geminiKey } : {}),
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    })

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text().catch(() => '')
      console.warn(`Gemini ${geminiRes.status}: ${errBody} — using fallback`)
      return NextResponse.json(
        buildDynamicFallback(projectTitle, companyName, vomList, pqcdsmScores, whyTree, fishboneItems),
      )
    }

    const data = await geminiRes.json()
    const textResult: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textResult) {
      console.warn('Gemini returned empty content — using fallback')
      return NextResponse.json(
        buildDynamicFallback(projectTitle, companyName, vomList, pqcdsmScores, whyTree, fishboneItems),
      )
    }

    try {
      return NextResponse.json(JSON.parse(textResult))
    } catch {
      console.warn('Gemini returned non-JSON — using fallback')
      return NextResponse.json(
        buildDynamicFallback(projectTitle, companyName, vomList, pqcdsmScores, whyTree, fishboneItems),
      )
    }
  } catch (err: any) {
    console.error('Gemini fetch error:', err?.message ?? err)
    // Network error or anything unexpected — always fall back, never 500
    return NextResponse.json(
      buildDynamicFallback(projectTitle, companyName, vomList, pqcdsmScores, whyTree, fishboneItems),
    )
  }
}
