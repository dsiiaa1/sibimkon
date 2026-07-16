import { NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/ai-providers/orchestrator'

/**
 * POST /api/measure-analyze
 *
 * Menerima teks Project Charter → AI menganalisis → return:
 * - Masalah-masalah utama yang teridentifikasi
 * - Dimensi PQCDSM yang tepat per masalah
 * - Rekomendasi metode yang BENAR-BENAR RELEVAN dengan konteks masalah
 */

function buildPrompt(charter: {
  problem_statement?: string
  objectives?: string
  productivity_target?: string
  scope?: string
  company_name?: string
  project_title?: string
}): string {
  const lines = [
    `Perusahaan: ${charter.company_name || 'Tidak disebutkan'}`,
    `Proyek: ${charter.project_title || 'Tidak disebutkan'}`,
    charter.problem_statement && `\nPROBLEM STATEMENT (masalah utama):\n${charter.problem_statement}`,
    charter.objectives        && `\nTUJUAN PROGRAM:\n${charter.objectives}`,
    charter.productivity_target && `\nTARGET PRODUKTIVITAS:\n${charter.productivity_target}`,
    charter.scope             && `\nRUANG LINGKUP:\n${charter.scope}`,
  ].filter(Boolean).join('\n')

  return `Anda adalah konsultan produktivitas senior dari firma konsultan Link Productive Indonesia.

Berikut adalah data Project Charter yang perlu Anda analisis:

${lines}

---

TUGAS ANDA:

Baca seluruh teks di atas dengan seksama. Kemudian:

1. Identifikasi 2-4 masalah SPESIFIK dari teks tersebut. Setiap masalah harus berbeda topiknya.

2. Untuk setiap masalah, tentukan dimensi PQCDSM yang paling tepat:
   - P (productivity): output, kapasitas, efisiensi proses, penjualan, pemasaran, pendapatan, jangkauan pasar
   - Q (quality): mutu produk/layanan, defect, standar, kepuasan pelanggan
   - C (cost): biaya operasional, pemborosan finansial, margin, anggaran
   - D (delivery): ketepatan waktu, pengiriman, lead time, distribusi
   - S (safety): keselamatan kerja, K3, risiko
   - M (morale): SDM, absensi, turnover, motivasi, kompetensi, pelatihan

3. Rekomendasikan 3-5 metode/program penanganan. WAJIB mengikuti aturan ini:
   - BACA masalahnya dulu, BARU tentukan metode
   - Masalah pemasaran/penjualan → rekomendasikan Digital Marketing, CRM, Sales Methodology, dll — BUKAN Lean Manufacturing atau TPM
   - Masalah SDM/karyawan → rekomendasikan metode HR, Training, Coaching — BUKAN metode produksi
   - Masalah kualitas produk → rekomendasikan QCC, Six Sigma, Poka-Yoke
   - Masalah efisiensi manufaktur → BARU boleh rekomendasikan Lean, TPM, Kaizen
   - Setiap rekomendasi HARUS menjelaskan MENGAPA metode itu relevan dengan masalah SPESIFIK ini

4. Tulis semua dalam Bahasa Indonesia.

5. Estimasikan Baseline Produktivitas (0-100%). Berikan nilai "estimated_baseline_score" berdasarkan tingkat keparahan masalah di atas. Jika masalah sangat parah, berikan skor rendah (misal 30-50). Jika masalah menengah, berikan skor sedang (50-70). Ini akan menjadi titik awal (Baseline) perusahaan sebelum program perbaikan.
Juga berikan "baseline_reasoning" berupa 1-2 kalimat kesimpulan mengapa Anda memberikan skor baseline tersebut.

CONTOH yang BENAR — jika masalahnya tentang "penjualan door-to-door yang tidak efisien dan kurangnya digital marketing":
✅ Benar: Digital Marketing Strategy, Social Media Marketing, CRM System, Sales Funnel Optimization
❌ Salah: Lean Manufacturing, TPM, Value Stream Mapping, Kaizen

---

Kembalikan HANYA JSON berikut, tanpa teks lain, tanpa markdown, tanpa backtick:

{"estimated_baseline_score": 65, "baseline_reasoning": "Penjelasan mengapa skor 65 diberikan...", "problems":[{"problem_text":"Deskripsi masalah spesifik","pqcdsm_dimension":"productivity","dimension_reason":"Alasan dimensi ini tepat","recommended_methods":[{"priority":1,"method":"Nama metode","reason":"Mengapa metode ini tepat untuk masalah ini secara spesifik"},{"priority":2,"method":"Nama metode 2","reason":"Alasan spesifik"},{"priority":3,"method":"Nama metode 3","reason":"Alasan spesifik"}]}]}`
}

function extractJson(raw: string): any {
  // Gemini kadang return JSON di dalam backtick ```json ... ``` atau ada teks sebelumnya
  // Coba parse langsung dulu
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch { /* lanjut */ }

  // Cari blok JSON dalam markdown code block
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1]) } catch { /* lanjut */ }
  }

  // Cari kurung kurawal pertama sebagai awal JSON
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
      maxTokens: 1536
    })
    const rawText = aiRes.text
    console.log('[measure-analyze] AI raw response (first 500):', rawText.substring(0, 500))

    const parsed = extractJson(rawText)

    if (!parsed.problems || !Array.isArray(parsed.problems) || parsed.problems.length === 0) {
      throw new Error('Response tidak memiliki field problems yang valid')
    }

    // Helper robust untuk memastikan dimensi ter-map dengan benar
    const mapDimension = (raw: any) => {
      const s = String(raw || '').toLowerCase()
      if (s.includes('qual') || s.includes('kualitas') || s.includes('mutu') || s === 'q') return 'quality'
      if (s.includes('cost') || s.includes('biaya') || s.includes('uang') || s.includes('harga') || s === 'c') return 'cost'
      if (s.includes('deliv') || s.includes('pengiriman') || s.includes('waktu') || s.includes('terlambat') || s === 'd') return 'delivery'
      if (s.includes('safe') || s.includes('aman') || s.includes('keselamatan') || s.includes('risiko') || s === 's') return 'safety'
      if (s.includes('moral') || s.includes('sdm') || s.includes('karyawan') || s.includes('motivasi') || s === 'm') return 'morale'
      return 'productivity' // default
    }

    const normalized = parsed.problems.map((p: any, idx: number) => ({
      problem_text:     String(p.problem_text || '').trim(),
      pqcdsm_dimension: mapDimension(p.pqcdsm_dimension),
      dimension_reason: String(p.dimension_reason || '').trim(),
      recommended_methods: Array.isArray(p.recommended_methods)
        ? p.recommended_methods.map((m: any, ri: number) => ({
            priority: Number(m.priority) || ri + 1,
            method:   String(m.method || '').trim(),
            reason:   String(m.reason  || '').trim(),
          }))
        : [],
    }))

    return NextResponse.json({ 
      estimated_baseline_score: Number(parsed.estimated_baseline_score) || 50,
      baseline_reasoning: String(parsed.baseline_reasoning || 'Tingkat keparahan masalah memengaruhi estimasi baseline awal produktivitas perusahaan.'),
      problems: normalized 
    })

  } catch (err: any) {
    console.error('[measure-analyze] Error:', err.message)
    // Jangan return fallback manufaktur — kembalikan error agar halaman tahu AI gagal
    return NextResponse.json(
      { error: `Analisis AI gagal: ${err.message}` },
      { status: 502 }
    )
  }
}
