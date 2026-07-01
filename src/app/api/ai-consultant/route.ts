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

  const groqKey = process.env.GROQ_API_KEY

  // No key → return error
  if (!groqKey) {
    console.warn('GROQ_API_KEY not set')
    return NextResponse.json(
      { error: 'Konfigurasi AI belum tersedia. Tambahkan GROQ_API_KEY di .env.local' },
      { status: 503 },
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

  // Call Groq — OpenAI-compatible, retry dengan exponential backoff jika 429
  const GROQ_MODEL = 'llama-3.3-70b-versatile'
  const MAX_RETRIES = 4
  const groqUrl = 'https://api.groq.com/openai/v1/chat/completions'

  let lastErr: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const groqRes = await fetch(groqUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    })

    if (groqRes.ok) {
      const data = await groqRes.json()
      const textResult: string | undefined = data.choices?.[0]?.message?.content

      if (!textResult) {
        return NextResponse.json(
          { error: 'Groq tidak mengembalikan konten. Coba lagi dalam beberapa saat.' },
          { status: 502 },
        )
      }

      // Parse JSON dari teks (Groq mungkin bungkus dalam ```json ... ```)
      const cleaned = textResult.trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      try {
        return NextResponse.json(JSON.parse(cleaned))
      } catch {
        // Coba cari kurung kurawal pertama
        const start = cleaned.indexOf('{')
        const end   = cleaned.lastIndexOf('}')
        if (start !== -1 && end > start) {
          try {
            return NextResponse.json(JSON.parse(cleaned.substring(start, end + 1)))
          } catch { /* lanjut */ }
        }
        return NextResponse.json(
          { error: 'Groq mengembalikan format tidak valid. Coba lagi.' },
          { status: 502 },
        )
      }
    }

    if (groqRes.status === 429) {
      const retryAfterSec = parseInt(groqRes.headers.get('Retry-After') ?? '0', 10)
      const backoffMs = retryAfterSec > 0
        ? retryAfterSec * 1000
        : Math.min(1000 * 2 ** attempt, 16000)

      console.warn(`[ai-consultant] 429 rate limit, retry ${attempt + 1}/${MAX_RETRIES} dalam ${backoffMs}ms`)
      lastErr = new Error(`Rate limit — retry ${attempt + 1}/${MAX_RETRIES}`)
      await new Promise((r) => setTimeout(r, backoffMs))
      continue
    }

    // Error lain — lempar langsung
    const errBody = await groqRes.text().catch(() => '')
    return NextResponse.json(
      { error: `Groq API error ${groqRes.status}: ${errBody.substring(0, 200)}` },
      { status: 502 },
    )
  }

  // Semua retry habis
  return NextResponse.json(
    { error: `Groq API gagal setelah ${MAX_RETRIES} percobaan karena rate limit. Tunggu 1 menit lalu coba lagi.` },
    { status: 429 },
  )
}
