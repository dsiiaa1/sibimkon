'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'

// ── Helper: generate QR code sebagai data URL (PNG base64) ──
async function generateQRDataURL(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, {
      width: 200,
      margin: 1,
      color: { dark: '#0A1628', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
  } catch {
    return null
  }
}

interface ProjectData {
  project_code: string
  title: string
  company_name: string
  start_date?: string
  target_end_date?: string
  baseline_score?: number
  current_score?: number
}

interface ActionPlanData {
  title: string
  methodology: string
  dimension: string
  kpi_name: string
  kpi_baseline: number
  kpi_target: number
  kpi_actual?: number
  kpi_unit: string
  pic_name: string
  start_date: string
  end_date: string
  status: string
  progress_percentage: number
}

interface PQCDSMScore {
  dimension: string
  percentage_score: number
}

// ============================================================
// Konstanta warna tema
// ============================================================
const C_NAVY: [number, number, number]  = [10, 22, 40]
const C_GOLD: [number, number, number]  = [212, 160, 23]
const C_LIGHT: [number, number, number] = [180, 180, 180]
const C_WHITE: [number, number, number] = [255, 255, 255]
const C_TEXT: [number, number, number]  = [50, 50, 60]
const C_MUTED: [number, number, number] = [130, 130, 140]
const C_ROW_ALT: [number, number, number] = [245, 247, 252]

// ============================================================
// Font Embedding — Noto Sans untuk dukungan karakter Indonesia
// ============================================================
let _notoSansRegularB64: string | null = null
let _notoSansBoldB64: string | null = null

async function fetchFontAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  } catch {
    return null
  }
}

async function embedNotoSans(doc: jsPDF): Promise<boolean> {
  const REGULAR_TTF =
    'https://fonts.gstatic.com/s/notosans/v36/o-0IIpQlx3QUlC5A4PNr5TRASf6M7bE.ttf'
  const BOLD_TTF =
    'https://fonts.gstatic.com/s/notosans/v36/o-0NIpQlx3QUlC5A4PNjXhFVadyBx2pqPA.ttf'
  try {
    if (!_notoSansRegularB64) _notoSansRegularB64 = await fetchFontAsBase64(REGULAR_TTF)
    if (!_notoSansBoldB64)    _notoSansBoldB64    = await fetchFontAsBase64(BOLD_TTF)
    if (!_notoSansRegularB64) return false
    doc.addFileToVFS('NotoSans-Regular.ttf', _notoSansRegularB64)
    doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal')
    if (_notoSansBoldB64) {
      doc.addFileToVFS('NotoSans-Bold.ttf', _notoSansBoldB64)
      doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold')
    }
    return true
  } catch {
    return false
  }
}

// ============================================================
// Helper: label mapping
// ============================================================
function getDimLabel(dim: string): string {
  const map: Record<string, string> = {
    productivity: 'Productivity (P)',
    quality: 'Quality (Q)',
    cost: 'Cost (C)',
    delivery: 'Delivery (D)',
    safety: 'Safety (S)',
    morale: 'Morale (M)',
  }
  return map[dim] || dim
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    belum_mulai: 'Belum Mulai',
    sedang_berjalan: 'Sedang Berjalan',
    selesai: 'Selesai',
    tertunda: 'Tertunda',
  }
  return map[status] || status
}

function getCategoryLabel(score: number): string {
  if (score >= 70) return 'BAIK'
  if (score >= 50) return 'CUKUP'
  return 'PERLU PERBAIKAN'
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// ============================================================
// Generate Final Productivity Report PDF
// ============================================================
export async function generateFinalReport(
  project: ProjectData,
  assessments: PQCDSMScore[],
  actionPlans: ActionPlanData[],
  signatures?: SignatureData
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW  = doc.internal.pageSize.getWidth()   // 210
  const pageH  = doc.internal.pageSize.getHeight()  // 297
  const margin = 18
  const contentW = pageW - margin * 2

  const fontLoaded = await embedNotoSans(doc)
  const FN = fontLoaded ? 'NotoSans' : 'helvetica'
  const FB = fontLoaded ? 'NotoSans' : 'helvetica'

  const setN = (size: number) => { doc.setFontSize(size); doc.setFont(FN, 'normal') }
  const setB = (size: number) => { doc.setFontSize(size); doc.setFont(FB, 'bold') }
  const setC = (c: [number,number,number]) => doc.setTextColor(...c)
  const setF = (c: [number,number,number]) => doc.setFillColor(...c)
  const setD = (c: [number,number,number]) => doc.setDrawColor(...c)

  // ----------------------------------------------------------
  // COVER PAGE
  // ----------------------------------------------------------

  // Header bar
  setF(C_NAVY); doc.rect(0, 0, pageW, 52, 'F')

  // Logo / brand text
  setC(C_GOLD); setB(24)
  doc.text('SIBIMKON', margin, 24)
  setC(C_LIGHT); setN(8.5)
  doc.text('Sistem Informasi Bimbingan Konsultansi Peningkatan Produktivitas', margin, 33)
  doc.text('Platform SIBIMKON — Link Productive', margin, 40)

  // Thin gold accent line below header
  setD(C_GOLD); doc.setLineWidth(0.8)
  doc.line(margin, 52, pageW - margin, 52)

  // Report title block
  setC(C_NAVY); setB(15)
  doc.text('LAPORAN AKHIR PROGRAM BIMKON', pageW / 2, 72, { align: 'center' })
  setC(C_MUTED); setN(10.5)
  doc.text(project.title, pageW / 2, 81, { align: 'center', maxWidth: contentW })

  // Thin divider
  doc.setDrawColor(220, 220, 225); doc.setLineWidth(0.4)
  doc.line(margin + 20, 88, pageW - margin - 20, 88)

  // Info box — rounded card
  doc.setDrawColor(210, 215, 225); doc.setLineWidth(0.5)
  setF([250, 251, 253])
  doc.roundedRect(margin, 95, contentW, 56, 3, 3, 'FD')

  const infoItems = [
    ['Kode Proyek',       project.project_code],
    ['Perusahaan Klien',  project.company_name],
    ['Tanggal Mulai',     formatDate(project.start_date)],
    ['Target Selesai',    formatDate(project.target_end_date)],
  ]
  infoItems.forEach(([label, value], i) => {
    const iy = 106 + i * 11
    // label column
    setC(C_MUTED); setN(8)
    doc.text(label, margin + 6, iy)
    // separator
    setC([210, 215, 225])
    doc.text(':', margin + 46, iy)
    // value column
    setC(C_TEXT); setB(8.5)
    doc.text(String(value), margin + 52, iy)
  })

  // Score summary — 3-column card
  setF(C_NAVY)
  doc.roundedRect(margin, 160, contentW, 34, 3, 3, 'F')

  // Gold accent strip at top of score card
  setF(C_GOLD)
  doc.roundedRect(margin, 160, contentW, 5, 3, 3, 'F')
  doc.rect(margin, 162, contentW, 3, 'F') // flatten bottom corners of strip

  const scoreW = contentW / 3
  const scores = [
    { label: 'Skor Baseline', value: `${project.baseline_score || 0}%`, color: C_LIGHT },
    { label: 'Skor Aktual',   value: `${project.current_score  || 0}%`, color: [100, 210, 160] as [number,number,number] },
    { label: 'Peningkatan',   value: `+${(project.current_score || 0) - (project.baseline_score || 0)}%`, color: [255, 210, 90] as [number,number,number] },
  ]
  scores.forEach((s, i) => {
    const sx = margin + scoreW * i
    setC(C_LIGHT); setN(7.5)
    doc.text(s.label, sx + scoreW / 2, 174, { align: 'center' })
    setC(s.color); setB(13)
    doc.text(s.value, sx + scoreW / 2, 184, { align: 'center' })
    // vertical divider between columns
    if (i < 2) {
      doc.setDrawColor(255, 255, 255, 0.3); doc.setLineWidth(0.3)
      doc.line(margin + scoreW * (i + 1), 165, margin + scoreW * (i + 1), 192)
    }
  })

  // Generated timestamp
  setC(C_MUTED); setN(7.5)
  doc.text(
    `Digenerate: ${new Date().toLocaleString('id-ID')}`,
    pageW / 2, 210, { align: 'center' }
  )

  // ----------------------------------------------------------
  // HELPER FUNCTIONS (used across chapters)
  // ----------------------------------------------------------
  let y = 25

  // Ensure there's enough room; if not, add new page first
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 22) { doc.addPage(); y = 25 }
  }

  // Chapter header: full-width navy bar with gold title + grey subtitle
  const drawChapterHeader = (title: string, subtitle: string) => {
    ensureSpace(20)
    const barH = 16
    setF(C_NAVY); doc.rect(margin, y, contentW, barH, 'F')
    // Gold left accent
    setF(C_GOLD); doc.rect(margin, y, 4, barH, 'F')
    setC(C_GOLD); setB(10.5)
    doc.text(title, margin + 8, y + 7)
    setC(C_LIGHT); setN(7.5)
    doc.text(subtitle, margin + 8, y + 13)
    y += barH + 6
  }

  // Section title with left rule
  const drawSectionTitle = (title: string) => {
    ensureSpace(12)
    setD(C_GOLD); doc.setLineWidth(1.5)
    doc.line(margin, y + 1, margin + 2.5, y + 1)
    doc.setLineWidth(0.3)
    setC(C_NAVY); setB(9.5)
    doc.text(title, margin + 5, y + 3)
    y += 9
  }

  // Body text with automatic page overflow
  const drawText = (text: string, maxWidth = contentW, indent = 0) => {
    setC(C_TEXT); setN(9)
    const lines = doc.splitTextToSize(text, maxWidth - indent)
    lines.forEach((line: string) => {
      ensureSpace(6)
      doc.text(line, margin + indent, y)
      y += 5.2
    })
    y += 2
  }

  // Key-value info row
  const drawInfoRow = (label: string, value: string) => {
    ensureSpace(7)
    setC(C_MUTED); setN(8.5)
    doc.text(label + ':', margin + 2, y)
    setC(C_TEXT); setB(8.5)
    doc.text(value, margin + 52, y)
    y += 7
  }

  // ----------------------------------------------------------
  // BAB 1 — Latar Belakang
  // ----------------------------------------------------------
  doc.addPage(); y = 25

  drawChapterHeader('BAB 1 - LATAR BELAKANG', 'Identitas Proyek dan Program BIMKON')

  drawSectionTitle('1.1 Identitas Proyek')
  drawInfoRow('Kode Proyek',     project.project_code)
  drawInfoRow('Perusahaan',      project.company_name)
  drawInfoRow('Judul Program',   project.title)
  drawInfoRow('Tanggal Mulai',   formatDate(project.start_date))
  drawInfoRow('Target Selesai',  formatDate(project.target_end_date))
  y += 3

  drawSectionTitle('1.2 Latar Belakang Program')
  drawText(
    'Program Bimbingan Konsultansi Peningkatan Produktivitas (BIMKON) merupakan program ' +
    'pendampingan konsultan produktivitas terlatih yang bertujuan meningkatkan kinerja operasional ' +
    'perusahaan secara terstruktur dan berkelanjutan.'
  )
  drawText(
    `Proyek ini dilaksanakan untuk perusahaan ${project.company_name} ` +
    `dengan kode proyek ${project.project_code}, mencakup seluruh tahapan metodologi ` +
    'DMAIC (Define-Measure-Analyze-Improve-Control) untuk memastikan perbaikan yang ' +
    'terukur dan berbasis data.'
  )

  drawSectionTitle('1.3 Tujuan Program')
  const tujuan = [
    'Mengidentifikasi gap produktivitas perusahaan melalui asesmen PQCDSM.',
    'Merancang dan mengimplementasikan action plan perbaikan yang terukur.',
    'Meningkatkan indeks produktivitas perusahaan secara signifikan.',
    'Membangun kapabilitas internal untuk perbaikan berkelanjutan (continuous improvement).',
  ]
  tujuan.forEach((t, i) => {
    ensureSpace(8)
    setC(C_GOLD); setB(9)
    doc.text(`${i + 1}.`, margin + 3, y)
    setC(C_TEXT); setN(9)
    const lines = doc.splitTextToSize(t, contentW - 14)
    lines.forEach((line: string, li: number) => {
      doc.text(line, margin + 10, y + li * 5.2)
    })
    y += lines.length * 5.2 + 2
  })

  // ----------------------------------------------------------
  // BAB 2 — Hasil Assessment PQCDSM
  // ----------------------------------------------------------
  ensureSpace(80)
  if (y > 200) { doc.addPage(); y = 25 }
  drawChapterHeader('BAB 2 - HASIL ASSESSMENT PQCDSM', 'Skor Baseline Produktivitas per Dimensi')

  if (assessments.length > 0) {
    // Color-coded score column: BAIK=green, CUKUP=orange, PERLU PERBAIKAN=red
    const tableData = assessments.map(a => {
      const cat = getCategoryLabel(a.percentage_score)
      return [getDimLabel(a.dimension), `${a.percentage_score}%`, cat]
    })

    autoTable(doc, {
      startY: y,
      head: [['Dimensi PQCDSM', 'Skor Baseline', 'Kategori']],
      body: tableData,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      styles: {
        fontSize: 9,
        cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
        font: FN,
        textColor: C_TEXT,
        lineColor: [220, 225, 235],
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: C_NAVY,
        textColor: C_GOLD,
        fontStyle: 'bold',
        font: FB,
        fontSize: 9,
        cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
      },
      alternateRowStyles: { fillColor: C_ROW_ALT },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 45, halign: 'center' },
        2: { cellWidth: contentW - 80 - 45, halign: 'center' },
      },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 2) {
          const val = String(data.cell.raw)
          if (val === 'BAIK')              data.cell.styles.textColor = [34, 139, 34]
          else if (val === 'CUKUP')        data.cell.styles.textColor = [200, 130, 20]
          else                             data.cell.styles.textColor = [180, 40, 40]
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
    y = (doc as any).lastAutoTable.finalY + 10

    // Summary note
    const totalAvg = Math.round(assessments.reduce((s, a) => s + a.percentage_score, 0) / assessments.length)
    drawText(
      `Rata-rata skor PQCDSM baseline: ${totalAvg}% (${getCategoryLabel(totalAvg)}). ` +
      'Dimensi yang memerlukan perhatian utama menjadi prioritas dalam rancangan action plan.',
      contentW, 0
    )
  } else {
    drawText('Data assessment PQCDSM belum tersedia.')
  }

  // ----------------------------------------------------------
  // BAB 3 — Action Plan & Implementasi
  // ----------------------------------------------------------
  if (y > 200) { doc.addPage(); y = 25 }
  drawChapterHeader('BAB 3 - ACTION PLAN & IMPLEMENTASI', 'Rencana dan Hasil Perbaikan per Dimensi')

  if (actionPlans.length > 0) {
    // Columns: No | Program | Dimensi | KPI (Baseline → Target → Aktual) | Status | Progress
    const apData = actionPlans.map((ap, idx) => [
      String(idx + 1),
      ap.title.length > 32 ? ap.title.substring(0, 30) + '…' : ap.title,
      getDimLabel(ap.dimension),
      `${ap.kpi_name}\n${ap.kpi_baseline} → ${ap.kpi_target}${ap.kpi_actual !== undefined ? ` → ${ap.kpi_actual}` : ''} ${ap.kpi_unit}`,
      ap.pic_name || '-',
      getStatusLabel(ap.status),
      `${ap.progress_percentage}%`,
    ])

    autoTable(doc, {
      startY: y,
      head: [['#', 'Program Perbaikan', 'Dimensi', 'KPI (Baseline→Target→Aktual)', 'PIC', 'Status', 'Progress']],
      body: apData,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
        font: FN,
        textColor: C_TEXT,
        lineColor: [220, 225, 235],
        lineWidth: 0.3,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: C_NAVY,
        textColor: C_GOLD,
        fontStyle: 'bold',
        font: FB,
        fontSize: 7.5,
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      },
      alternateRowStyles: { fillColor: C_ROW_ALT },
      columnStyles: {
        0: { cellWidth: 8,  halign: 'center' },
        1: { cellWidth: 42 },
        2: { cellWidth: 28 },
        3: { cellWidth: 50 },
        4: { cellWidth: 22 },
        5: { cellWidth: 26 },
        6: { cellWidth: 16, halign: 'center' },
      },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 5) {
          const val = String(data.cell.raw)
          if (val === 'Selesai')              data.cell.styles.textColor = [34, 139, 34]
          else if (val === 'Sedang Berjalan') data.cell.styles.textColor = [30, 120, 200]
          else if (val === 'Tertunda')        data.cell.styles.textColor = [180, 40, 40]
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  } else {
    drawText('Belum ada action plan yang dibuat.')
  }

  // ----------------------------------------------------------
  // BAB 4 — Dampak Ekonomi & ROI
  // ----------------------------------------------------------
  if (y > 200) { doc.addPage(); y = 25 }
  drawChapterHeader('BAB 4 - DAMPAK EKONOMI & ROI', 'Estimasi Penghematan Biaya dan Return on Investment')

  const baseScore = project.baseline_score || 0
  const currScore = project.current_score  || 0
  const improvement = currScore - baseScore

  const costSaving = actionPlans.reduce((acc, act) => {
    if (act.kpi_actual === undefined) return acc
    const achieved =
      act.kpi_target > act.kpi_baseline
        ? Math.max(0, (act.kpi_actual as number) - act.kpi_baseline)
        : Math.max(0, act.kpi_baseline - (act.kpi_actual as number))
    return acc + achieved * 500000
  }, 0)
  const investment = actionPlans.filter(a => a.status !== 'belum_mulai').length * 2500000
  const roi = investment > 0 ? (costSaving / investment).toFixed(1) : '0'

  autoTable(doc, {
    startY: y,
    head: [['Komponen Ekonomi', 'Nilai']],
    body: [
      ['Estimasi Cost Saving (3 bulan)',  `Rp ${costSaving.toLocaleString('id-ID')}`],
      ['Total Investasi Program',          `Rp ${investment.toLocaleString('id-ID')}`],
      ['Estimasi ROI',                     `${roi}x lipat`],
      ['Productivity Index Baseline',      `${baseScore}%`],
      ['Productivity Index Aktual',        `${currScore}%`],
      ['Peningkatan Produktivitas',        `+${improvement}%`],
    ],
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    styles: {
      fontSize: 9.5,
      cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
      font: FN,
      textColor: C_TEXT,
      lineColor: [220, 225, 235],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: C_NAVY,
      textColor: C_GOLD,
      fontStyle: 'bold',
      font: FB,
      fontSize: 9.5,
    },
    alternateRowStyles: { fillColor: C_ROW_ALT },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 110 },
      1: { cellWidth: contentW - 110 },
    },
    didParseCell(data) {
      // Highlight ROI row
      if (data.section === 'body' && data.row.index === 2) {
        data.cell.styles.textColor = [34, 139, 34]
        data.cell.styles.fontStyle = 'bold'
      }
      // Highlight improvement row
      if (data.section === 'body' && data.row.index === 5) {
        data.cell.styles.textColor = [30, 120, 200]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })
  y = (doc as any).lastAutoTable.finalY + 12

  drawText(
    'Catatan: Estimasi cost saving dihitung berdasarkan selisih KPI aktual terhadap baseline, ' +
    'dikalikan nilai unit perbaikan Rp 500.000 per unit. Investasi program dihitung sebesar ' +
    'Rp 2.500.000 per action plan yang sudah berjalan. Angka merupakan estimasi indikatif.'
  )

  // ----------------------------------------------------------
  // BAB 5 — Lembar Pengesahan
  // ----------------------------------------------------------
  if (y > 190) { doc.addPage(); y = 25 }
  drawChapterHeader('BAB 5 - LEMBAR PENGESAHAN', 'Tanda Tangan Digital Pihak Terkait')

  drawText(
    'Laporan Akhir Program BIMKON ini telah disusun berdasarkan data yang dikumpulkan ' +
    'selama masa pendampingan dan disahkan oleh pihak-pihak berikut:'
  )
  y += 4

  // Two signature boxes side-by-side
  const sigW   = (contentW - 10) / 2   // width of each box
  const sigH   = 52
  const sigGap = 10

  const signatories = [
    { role: 'Konsultan Pendamping',  org: 'SIBIMKON — Link Productive' },
    { role: 'PIC Perusahaan Klien',  org: project.company_name },
  ]

  ensureSpace(sigH + 10)

  signatories.forEach((sig, i) => {
    const sx = margin + i * (sigW + sigGap)
    const sigKey = i === 0 ? 'consultant' : 'company'
    const sigRecord = signatures?.[sigKey]

    // Box background + border
    doc.setDrawColor(210, 215, 225); doc.setLineWidth(0.5)
    setF([250, 251, 253])
    doc.roundedRect(sx, y, sigW, sigH, 3, 3, 'FD')

    // Top accent bar
    setF(C_NAVY)
    doc.roundedRect(sx, y, sigW, 7, 3, 3, 'F')
    doc.rect(sx, y + 4, sigW, 3, 'F') // flatten bottom corners of accent

    setC(C_GOLD); setB(7.5)
    doc.text(sig.role.toUpperCase(), sx + sigW / 2, y + 5.5, { align: 'center' })

    setC(C_TEXT); setN(8)
    doc.text(sig.org, sx + sigW / 2, y + 15, { align: 'center', maxWidth: sigW - 8 })

    // Signature line
    doc.setDrawColor(180, 185, 195); doc.setLineWidth(0.4)
    doc.line(sx + 8, y + 37, sx + sigW - 8, y + 37)

    if (sigRecord?.signed) {
      if (sigRecord.signatureImg) {
        try {
          doc.addImage(sigRecord.signatureImg, 'PNG', sx + (sigW - 40) / 2, y + 19, 40, 16)
        } catch (e) {
          console.warn('Failed to add signature image:', e)
        }
      }
      setC(C_TEXT); setB(7.5)
      doc.text(sigRecord.signerName, sx + sigW / 2, y + 42, { align: 'center' })
      setC(C_MUTED); setN(6.5)
      doc.text(`TTD: ${sigRecord.signedAt}`, sx + sigW / 2, y + 46, { align: 'center' })
    } else {
      setC(C_MUTED); setN(7.5)
      doc.text('(Belum TTD)', sx + sigW / 2, y + 27, { align: 'center' })
      doc.text('Tanda Tangan', sx + sigW / 2, y + 43, { align: 'center' })
    }

    // Date placeholder
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    setC(C_TEXT); setN(7)
    doc.text(today, sx + sigW / 2, y + 50, { align: 'center' })
  })

  y += sigH + 14

  // ----------------------------------------------------------
  // FOOTER — every page except cover (page 1)
  // ----------------------------------------------------------
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // Gold separator line
    setD(C_GOLD); doc.setLineWidth(0.5)
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12)

    // Footer text
    setC(C_MUTED); setN(7)
    if (i === 1) {
      // Cover: only show generation info, no "Halaman X"
      doc.text(
        `SIBIMKON — Laporan Akhir ${project.project_code}`,
        pageW / 2, pageH - 7, { align: 'center' }
      )
    } else {
      doc.text(
        `SIBIMKON  |  ${project.company_name}  |  ${project.project_code}`,
        margin, pageH - 7
      )
      doc.text(
        `Halaman ${i} dari ${totalPages}`,
        pageW - margin, pageH - 7, { align: 'right' }
      )
    }
  }

  return doc
}

// ============================================================
// Generate E-Certificate PDF  (landscape A4)
// ============================================================

export interface SignatureData {
  consultant: { signed: boolean; signerName: string; signedAt: string; signatureImg?: string }
  company:    { signed: boolean; signerName: string; signedAt: string; signatureImg?: string }
}

export async function generateCertificate(
  project: ProjectData,
  signatures?: SignatureData
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()   // 297
  const pageH = doc.internal.pageSize.getHeight()  // 210
  const cx    = pageW / 2

  const fontLoaded = await embedNotoSans(doc)
  const FN = fontLoaded ? 'NotoSans' : 'helvetica'
  const FB = fontLoaded ? 'NotoSans' : 'helvetica'

  const setN = (size: number) => { doc.setFontSize(size); doc.setFont(FN, 'normal') }
  const setB = (size: number) => { doc.setFontSize(size); doc.setFont(FB, 'bold') }

  // Sanitize: only replace fancy quotes; keep all printable chars intact
  const safe = (str: string) =>
    str
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u2013/g, '-')
      .replace(/\u2014/g, '--')

  // ═══════════════════════════════════════════════════════════
  // LAYOUT GRID  (semua Y absolut, landscape 297 × 210 mm)
  //
  //  20  ┌─ border luar
  //  22  │  SIBIMKON  (brand)
  //  29  │  Link Productive
  //  36  │  subtitle kecil
  //  43  ── garis emas
  //  55  │  SERTIFIKAT PENGHARGAAN
  //  65  │  "Dengan bangga diberikan kepada"
  //  82  │  NAMA PERUSAHAAN  (besar)
  //  98  │  Deskripsi baris 1
  // 106  │  Judul proyek
  // 114  │  Kode proyek
  // 122  ── garis emas tengah
  // 131  │  BADGE skor
  // 149  ── garis footer
  // 154  │  Tanggal + TTD              QR (154–184)
  // 184  │  Nama jabatan
  // 191  │  Link Productive (bold)
  // ═══════════════════════════════════════════════════════════

  // ── Background ─────────────────────────────────────────────
  doc.setFillColor(8, 15, 32)
  doc.rect(0, 0, pageW, pageH, 'F')

  // ── Double border ──────────────────────────────────────────
  doc.setDrawColor(...C_GOLD as [number,number,number]); doc.setLineWidth(2)
  doc.rect(9, 9, pageW - 18, pageH - 18)
  doc.setLineWidth(0.5)
  doc.rect(13, 13, pageW - 26, pageH - 26)

  // ── Corner ornaments ───────────────────────────────────────
  const corners: [number,number][] = [
    [17, 17], [pageW - 17, 17], [17, pageH - 17], [pageW - 17, pageH - 17],
  ]
  corners.forEach(([ox, oy]) => {
    doc.setFillColor(...C_GOLD as [number,number,number]); doc.circle(ox, oy, 3, 'F')
    doc.setFillColor(8, 15, 32);                          doc.circle(ox, oy, 1.2, 'F')
  })

  // ── BRAND HEADER  (Y = 22–42) ──────────────────────────────
  doc.setTextColor(...C_GOLD as [number,number,number]); setB(13)
  doc.text('SIBIMKON', cx, 27, { align: 'center' })

  doc.setTextColor(160, 165, 175); setN(8)
  doc.text('Link Productive', cx, 34, { align: 'center' })

  doc.setTextColor(100, 105, 115); setN(7)
  doc.text(
    'Program Bimbingan Konsultansi Peningkatan Produktivitas (BIMKON)',
    cx, 41, { align: 'center' }
  )

  // Garis emas dengan diamond  Y = 47
  doc.setDrawColor(...C_GOLD as [number,number,number]); doc.setLineWidth(0.5)
  doc.line(28, 47, cx - 5, 47)
  doc.line(cx + 5, 47, pageW - 28, 47)
  doc.setFillColor(...C_GOLD as [number,number,number])
  doc.triangle(cx, 44.5, cx - 2.5, 47, cx, 49.5, 'F')
  doc.triangle(cx, 44.5, cx + 2.5, 47, cx, 49.5, 'F')

  // ── JUDUL SERTIFIKAT  (Y = 57) ─────────────────────────────
  doc.setTextColor(238, 240, 248); setB(15)
  doc.text('SERTIFIKAT PENGHARGAAN', cx, 57, { align: 'center' })
  doc.setDrawColor(...C_GOLD as [number,number,number]); doc.setLineWidth(0.8)
  doc.line(cx - 52, 60, cx + 52, 60)

  // ── SUB-JUDUL  (Y = 68) ────────────────────────────────────
  doc.setTextColor(155, 158, 168); setN(9)
  doc.text('Dengan bangga diberikan kepada', cx, 68, { align: 'center' })

  // ── NAMA PERUSAHAAN  (Y = 82) — fixed position ─────────────
  const compName = safe(project.company_name).toUpperCase()
  doc.setTextColor(255, 218, 68); setB(24)
  // Jika terlalu panjang, kecilkan font
  const compW = doc.getTextWidth(compName)
  if (compW > pageW - 80) { setB(18) }
  if (doc.getTextWidth(compName) > pageW - 60) { setB(14) }
  doc.text(compName, cx, 82, { align: 'center', maxWidth: pageW - 50 })

  // ── DESKRIPSI  (Y = 96–112) — fixed, 2 baris ───────────────
  doc.setTextColor(195, 198, 208); setN(9)
  doc.text(
    'Telah berhasil menyelesaikan Program Bimbingan Konsultansi Peningkatan Produktivitas',
    cx, 96, { align: 'center' }
  )

  // Judul proyek — pakai font yang di-load, strip hanya karakter benar-benar non-printable
  const projTitle = safe(project.title)
  doc.setTextColor(175, 178, 190); setN(8.5)
  doc.text(
    `"${projTitle}"`,
    cx, 104, { align: 'center', maxWidth: pageW - 80 }
  )

  // Kode proyek
  doc.setTextColor(120, 125, 138); setN(8)
  doc.text(`Kode Proyek: ${project.project_code}`, cx, 113, { align: 'center' })

  // ── GARIS TENGAH  (Y = 120) ────────────────────────────────
  doc.setDrawColor(...C_GOLD as [number,number,number]); doc.setLineWidth(0.4)
  doc.line(50, 120, pageW - 50, 120)

  // ── SCORE BADGE  (Y = 125–140) ─────────────────────────────
  const bW = 74, bH = 13
  doc.setFillColor(...C_GOLD as [number,number,number])
  doc.roundedRect(cx - bW / 2, 124, bW, bH, 3, 3, 'F')
  doc.setTextColor(8, 15, 32); setB(9)
  doc.text(
    `Indeks Produktivitas: ${project.current_score || 0}%`,
    cx, 132.5, { align: 'center' }
  )

  // ── Generate QR code (berisi teks verifikasi) ───────────────
  const consultantSigned = signatures?.consultant?.signed
  const companySigned    = signatures?.company?.signed

  const qrText = [
    'SIBIMKON VERIFIED',
    `Proyek  : ${project.project_code}`,
    `Perusahaan: ${project.company_name}`,
    `Konsultan : ${consultantSigned ? `${signatures!.consultant.signerName} (${signatures!.consultant.signedAt})` : 'Belum TTD'}`,
    `Perusahaan: ${companySigned    ? `${signatures!.company.signerName} (${signatures!.company.signedAt})`    : 'Belum TTD'}`,
    `Generated : ${new Date().toLocaleString('id-ID')}`,
  ].join('\n')

  const qrDataUrl = await generateQRDataURL(qrText)

  // ── GARIS FOOTER  (Y = 148) ────────────────────────────────
  doc.setDrawColor(50, 58, 80); doc.setLineWidth(0.3)
  doc.line(20, 148, pageW - 20, 148)

  // ── TTD KIRI  (Y = 152–196) ────────────────────────────────
  const issueDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  doc.setTextColor(135, 140, 152); setN(7.5)
  doc.text(`Diterbitkan: ${issueDate}`, 28, 156)

  // Nama konsultan (jika sudah TTD)
  if (consultantSigned && signatures?.consultant.signerName) {
    if (signatures.consultant.signatureImg) {
      try {
        doc.addImage(signatures.consultant.signatureImg, 'PNG', 42, 156, 35, 14)
      } catch (e) {
        console.warn('Failed to add cert signature image:', e)
      }
    }
    doc.setTextColor(...C_GOLD as [number,number,number]); setB(8)
    doc.text(signatures.consultant.signerName, 28, 165)
    doc.setTextColor(135, 140, 152); setN(7)
    doc.text(`TTD: ${signatures.consultant.signedAt}`, 28, 171)
  }

  // Garis TTD
  doc.setDrawColor(100, 108, 125); doc.setLineWidth(0.4)
  doc.line(28, 178, 115, 178)

  doc.setTextColor(135, 140, 152); setN(7.5)
  doc.text('Direktur Program SIBIMKON', 28, 184)
  doc.setTextColor(...C_GOLD as [number,number,number]); setB(8)
  doc.text('Link Productive', 28, 191)

  // ── QR CODE KANAN  (28×28 mm, Y = 150–178) ─────────────────
  const qrX = pageW - 30 - 28   // right-aligned dengan margin 30mm
  const qrY = 150
  const qrS = 28

  if (qrDataUrl) {
    // White background
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(qrX - 1, qrY - 1, qrS + 2, qrS + 2, 1.5, 1.5, 'F')
    // QR image
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrS, qrS)
  } else {
    // Fallback jika QR gagal generate
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(qrX - 1, qrY - 1, qrS + 2, qrS + 2, 1.5, 1.5, 'F')
    doc.setFillColor(8, 15, 32); doc.setTextColor(8, 15, 32); setN(6)
    doc.text('QR', qrX + qrS / 2, qrY + qrS / 2, { align: 'center' })
  }

  doc.setTextColor(100, 105, 115); setN(6)
  doc.text('SCAN VERIFIKASI', qrX + qrS / 2 + 1, qrY + qrS + 5, { align: 'center' })

  return doc
}
