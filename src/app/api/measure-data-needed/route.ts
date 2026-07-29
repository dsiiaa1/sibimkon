import { NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/ai-providers/orchestrator'

// ═══════════════════════════════════════════════════════════════════════════════
// Konfigurasi grup data per kategori masalah (PQCDSM)
// Sumber data tetap dari file upload — hanya panduan pengelompokan yang berbeda
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_GROUP_GUIDE: Record<string, {
  metricName: string
  primaryDefectLabel: string
  primaryVolumeLabel: string
  exampleColumns: string[]
  groupNote: string
}> = {
  quality: {
    metricName: 'Sigma Level / DPMO',
    primaryDefectLabel: 'jumlah cacat/defect/reject (numerator DPMO)',
    primaryVolumeLabel: 'total unit produksi/transaksi (denominator DPMO)',
    exampleColumns: ['tanggal', 'total_produksi', 'jumlah_cacat', 'jenis_cacat'],
    groupNote: 'Metrik utama: DPMO → Sigma Level. primary_defect = jumlah cacat; primary_volume = total produksi.',
  },
  delivery: {
    metricName: 'On-Time Delivery Rate / Rata-rata Keterlambatan',
    primaryDefectLabel: 'jumlah pengiriman terlambat / jumlah hari terlambat',
    primaryVolumeLabel: 'total pengiriman/transaksi dalam periode',
    exampleColumns: ['tanggal_order', 'tanggal_janji_kirim', 'tanggal_kirim_aktual', 'nama_customer', 'jumlah_item'],
    groupNote: 'Metrik utama: On-Time Delivery Rate = (volume - defect) / volume × 100%. primary_defect = pengiriman terlambat; primary_volume = total pengiriman.',
  },
  cost: {
    metricName: '% Pemborosan / Cost Variance',
    primaryDefectLabel: 'nilai pemborosan/overrun biaya/biaya tidak efisien (Rp)',
    primaryVolumeLabel: 'total anggaran/biaya yang direncanakan (Rp)',
    exampleColumns: ['periode', 'biaya_aktual', 'biaya_rencana', 'kategori_biaya', 'selisih'],
    groupNote: 'Metrik utama: Cost Variance = defect / volume × 100%. primary_defect = nilai pemborosan; primary_volume = total anggaran.',
  },
  production: {
    metricName: '% Downtime / OEE',
    primaryDefectLabel: 'total jam downtime/mesin berhenti tidak terencana',
    primaryVolumeLabel: 'total jam produksi yang direncanakan',
    exampleColumns: ['tanggal', 'mesin', 'jam_mulai', 'jam_selesai', 'jenis_downtime', 'durasi_menit'],
    groupNote: 'Metrik utama: Downtime Rate = defect / volume × 100%. primary_defect = jam downtime; primary_volume = jam produksi terencana.',
  },
  safety: {
    metricName: 'Incident Rate',
    primaryDefectLabel: 'jumlah insiden/kecelakaan/near miss dalam periode',
    primaryVolumeLabel: 'total karyawan aktif atau total jam kerja dalam periode',
    exampleColumns: ['tanggal', 'jenis_insiden', 'departemen', 'karyawan_terlibat', 'dampak'],
    groupNote: 'Metrik utama: Incident Rate = defect / volume × 100%. primary_defect = jumlah insiden; primary_volume = total karyawan atau jam kerja.',
  },
  morale: {
    metricName: 'Skor Kepuasan Karyawan / Turnover Rate',
    primaryDefectLabel: 'jumlah karyawan keluar/resign atau jumlah responden tidak puas',
    primaryVolumeLabel: 'total karyawan aktif dalam periode',
    exampleColumns: ['periode', 'departemen', 'karyawan_keluar', 'total_karyawan', 'skor_kepuasan'],
    groupNote: 'Metrik utama: Turnover Rate = defect / volume × 100%. primary_defect = karyawan keluar; primary_volume = total karyawan. Jika ada skor kepuasan (0-100), masukkan ke grup "supporting".',
  },
}

function buildPrompt(charter: {
  problem_statement?: string
  objectives?: string
  productivity_target?: string
  scope?: string
  company_name?: string
  project_title?: string
  problem_category?: string
}): string {
  const category = charter.problem_category || 'quality'
  const guide = CATEGORY_GROUP_GUIDE[category] || CATEGORY_GROUP_GUIDE['quality']

  return `Anda adalah konsultan produktivitas senior dari firma konsultan Link Productive Indonesia.
Tugas Anda adalah menganalisis data apa saja yang perlu dikumpulkan di tahap MEASURE berdasarkan Project Charter berikut.

Project Title: ${charter.project_title || '-'}
Company: ${charter.company_name || '-'}
Problem Statement: ${charter.problem_statement || '-'}
Objectives: ${charter.objectives || '-'}
Productivity Target: ${charter.productivity_target || '-'}
Scope: ${charter.scope || '-'}
Kategori Masalah: ${category.toUpperCase()}
Metrik Level Target: ${guide.metricName}

ATURAN PENGELOMPOKAN DATA:
Data harus diklasifikasikan ke dalam "group" berikut sesuai peran dalam rumus ${guide.metricName}:
- "primary_defect": ${guide.primaryDefectLabel}
- "primary_volume": ${guide.primaryVolumeLabel}
- "primary_ctq": (hanya untuk Quality) data karakteristik kualitas / opportunity per unit — untuk kategori lain, JANGAN gunakan group ini
- "supporting": data KPI pendukung lain (bukan input rumus utama) misalnya biaya, lead time, skor kepuasan
- "context": data referensi untuk tahap Analyze

CATATAN PENTING:
${guide.groupNote}
Seluruh data diambil dari FILE UPLOAD (CSV/Excel) — bukan input manual.
Contoh kolom yang relevan: ${guide.exampleColumns.join(', ')}.

Kembalikan HANYA JSON berikut, tanpa teks lain, tanpa markdown, tanpa backtick:

{
  "data_needed": [
    {
      "name": "Nama Data (spesifik, misal: 'Data Keterlambatan Pengiriman Bulanan')",
      "description": "Deskripsi data secara singkat",
      "reason": "Alasan mengapa data ini penting untuk mengukur masalah tersebut",
      "expected_format": "csv/excel",
      "example_columns": ["kolom1", "kolom2", "kolom3"],
      "group": "primary_defect | primary_volume | primary_ctq | supporting | context",
      "role_note": "Peran data dalam rumus ${guide.metricName} (misal: 'Sebagai total pengiriman terlambat')"
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
