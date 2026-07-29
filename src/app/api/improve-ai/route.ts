import { NextResponse } from 'next/server'
import { generateWithFallback, generateVisionWithFallback } from '@/lib/ai-providers/orchestrator'
import { ImagePart } from '@/lib/ai-providers/types'

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
  try {
    const body = await req.json()
    const { action, problem, pic, timeline, context_data, steps } = body

    if (!action) {
      return NextResponse.json({ error: 'Data action plan tidak lengkap' }, { status: 400 })
    }

    // 1. Kumpulkan file dari steps
    const imageParts: ImagePart[] = []
    let stepStatusText = ''
    
    let totalSteps = 0
    let selesaiDenganBukti = 0
    let selesaiTanpaBukti = 0
    let belumSelesai = 0

    if (steps && Array.isArray(steps)) {
      totalSteps = steps.length
      steps.forEach((step: any, index: number) => {
        const isSelesai = step.is_completed ? 'Selesai' : 'Belum'
        
        let buktiText = 'belum ada'
        let hasValidEvidence = false
        
        if (step.evidence && step.evidence.length > 0) {
          buktiText = step.evidence.map((ev: any) => ev.file_name).join(', ')
          hasValidEvidence = true
          
          if (step.is_completed) {
            selesaiDenganBukti++
          }
        } else {
          if (step.is_completed) {
            selesaiTanpaBukti++
          } else {
            belumSelesai++
          }
        }
        
        stepStatusText += `${index + 1}. [${isSelesai}] ${step.description} — Bukti: ${buktiText}\n`
      })
    }

    // Ambil base64 dari file url (max 8)
    const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4 MB
    
    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        if (!step.evidence) continue
        for (const ev of step.evidence) {
          if (imageParts.length >= 8) break
          
          const fileType = (ev.file_type || '').toLowerCase()
          const fileName = (ev.file_name || '').toLowerCase()
          const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/.test(fileName)
          const isPdf = fileType === 'application/pdf' || fileName.endsWith('.pdf')
          
          if (isImage || isPdf) {
            try {
              const res = await fetch(ev.file_url, { method: 'GET' })
              if (!res.ok) continue
              
              const buffer = await res.arrayBuffer()
              if (buffer.byteLength > MAX_FILE_SIZE) continue
              
              const base64Data = Buffer.from(buffer).toString('base64')
              
              let finalMime = fileType
              if (!finalMime) {
                if (isPdf) finalMime = 'application/pdf'
                else if (fileName.endsWith('.png')) finalMime = 'image/png'
                else if (fileName.endsWith('.webp')) finalMime = 'image/webp'
                else finalMime = 'image/jpeg'
              }
              
              imageParts.push({
                mimeType: finalMime,
                data: base64Data,
                label: ev.file_name
              })
            } catch (err) {
              console.warn(`[improve-ai] Failed to fetch evidence file ${ev.file_name}:`, err)
            }
          }
        }
      }
    }

    const stepStatusSection = stepStatusText ? `\nSTATUS ${totalSteps} LANGKAH IMPLEMENTASI:\n${stepStatusText}` : ''

    const prompt = `Anda adalah konsultan Lean Six Sigma (Black Belt). Anda sedang berada di tahap Improve (DMAIC).

Berdasarkan rencana tindakan berikut: '${action}'
(menjawab masalah: '${problem || "Tidak ditentukan"}', PIC: '${pic || "Belum ditentukan"}', timeline: '${timeline || "Belum ditentukan"}'),
dengan konteks:
- Sigma Level: ${context_data?.sigma_level ?? "Tidak ada data"}
- DPMO: ${context_data?.dpmo ?? "Tidak ada data"}
- Total Biaya Rework: ${context_data?.kpi_pendukung?.total_biaya_rework ?? "Tidak ada data"}${stepStatusSection}

INSTRUKSI TAMBAHAN:
- Beberapa file bukti (foto/dokumen PDF) dilampirkan langsung ke pesan ini (jika ada). Periksa isinya (foto kegiatan, absensi, kuitansi/nota, sertifikat, laporan, dsb.) untuk mengekstrak informasi nyata: jumlah peserta, tanggal pelaksanaan, nominal biaya yang tertera, item yang dibeli/dibayar, dsb.
- Jika sebuah langkah SUDAH selesai dan ada buktinya, gunakan informasi dari bukti tersebut sebagai dasar utama perhitungan biaya & manfaat, BUKAN karangan.
- Jika sebuah langkah BELUM selesai atau belum ada bukti, gunakan estimasi wajar dan tandai jelas sebagai "estimasi" pada field terkait (bukan seolah-olah sudah terjadi).
- Untuk field "biaya", kembalikan RINCIAN PER ITEM (array), bukan hanya 1 angka total. Setiap item cantumkan sumbernya: dari "bukti" nyata (sebutkan nama file di keterangan) atau "estimasi".
- Untuk field "roi.estimasi_penghematan_tahunan", jelaskan dasar perhitungannya di "roi.catatan", termasuk bukti mana yang dipakai (pada array "roi.bukti_digunakan").

Lengkapi analisis Lean Six Sigma berikut dalam format JSON. Jika Anda tidak punya data persis, gunakan estimasi kasar dan tulis asumsinya, jangan mengosongkannya.

KEMBALIKAN OUTPUT SEBAGAI OBJEK JSON SAJA, TANPA TEKS LAIN.
CONTOH FORMAT OUTPUT:
{
  "persiapan": "...",
  "sumber_daya": {
    "sdm": "...",
    "alat": "...",
    "anggaran_terkait": "..."
  },
  "biaya": {
    "estimasi": 5000000,
    "rincian": "Ringkasan naratif singkat",
    "rincian_items": [
      { "item": "Instruktur/Trainer", "jumlah": 3000000, "sumber": "bukti", "keterangan": "Berdasarkan kuitansi-trainer.pdf" },
      { "item": "Konsumsi", "jumlah": 800000, "sumber": "estimasi", "keterangan": "Belum ada bukti nota" }
    ]
  },
  "manfaat": {
    "kualitatif": "...",
    "kuantitatif": "..."
  },
  "target_efisiensi": "...",
  "roi": {
    "estimasi_penghematan_tahunan": 10000000,
    "biaya_implementasi": 5000000,
    "roi_persen": 100,
    "catatan": "Dasar perhitungan...",
    "bukti_digunakan": ["kuitansi-trainer.pdf"]
  },
  "langkah_dianalisis": {
    "total": ${totalSteps},
    "selesai_dengan_bukti": ${selesaiDenganBukti},
    "selesai_tanpa_bukti": ${selesaiTanpaBukti},
    "belum_selesai": ${belumSelesai}
  }
}`

    const aiRes = await generateVisionWithFallback(prompt, imageParts, {
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      maxTokens: 1536
    })
    
    const rawResponse = aiRes.text
    const result = extractJson(rawResponse)

    result.langkah_dianalisis = {
      total: totalSteps,
      selesai_dengan_bukti: selesaiDenganBukti,
      selesai_tanpa_bukti: selesaiTanpaBukti,
      belum_selesai: belumSelesai
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('[API/improve-ai] error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat memproses data ke AI.' },
      { status: 500 }
    )
  }
}
