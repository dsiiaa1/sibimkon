'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
// Helper: Format dimension label
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

// ============================================================
// Generate Final Productivity Report PDF
// ============================================================
export function generateFinalReport(
  project: ProjectData,
  assessments: PQCDSMScore[],
  actionPlans: ActionPlanData[]
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentW = pageW - margin * 2

  // ---- Cover Page ----
  // Header bar
  doc.setFillColor(10, 22, 40)
  doc.rect(0, 0, pageW, 50, 'F')

  doc.setTextColor(212, 160, 23)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('SIBIMKON', margin, 22)

  doc.setTextColor(200, 200, 200)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistem Informasi Bimbingan Konsultansi Peningkatan Produktivitas', margin, 30)
  doc.text('Kementerian Ketenagakerjaan Republik Indonesia', margin, 37)

  // Report title
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('LAPORAN AKHIR PROGRAM BIMKON', pageW / 2, 70, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(project.title, pageW / 2, 80, { align: 'center' })

  // Project info box
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(248, 249, 250)
  doc.roundedRect(margin, 90, contentW, 55, 3, 3, 'FD')

  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  const infoItems = [
    ['Kode Proyek', project.project_code],
    ['Perusahaan Klien', project.company_name],
    ['Tanggal Mulai', project.start_date || '-'],
    ['Target Selesai', project.target_end_date || '-'],
  ]
  infoItems.forEach(([label, value], i) => {
    const y = 100 + i * 10
    doc.setFont('helvetica', 'bold')
    doc.text(label + ':', margin + 5, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(value), margin + 55, y)
  })

  // Score summary box
  const baseScore = project.baseline_score || 0
  const currScore = project.current_score || 0
  const improvement = currScore - baseScore

  doc.setFillColor(10, 22, 40)
  doc.roundedRect(margin, 155, contentW, 30, 3, 3, 'F')
  doc.setTextColor(212, 160, 23)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`Baseline: ${baseScore}%`, margin + 15, 167)
  doc.setTextColor(100, 200, 150)
  doc.text(`Aktual: ${currScore}%`, margin + 75, 167)
  doc.setTextColor(255, 200, 100)
  doc.text(`Peningkatan: +${improvement}%`, margin + 135, 167)

  // Generated at
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Digenerate otomatis: ${new Date().toLocaleString('id-ID')}`, pageW / 2, 200, { align: 'center' })

  // ============================================================
  // BAB 1 — Latar Belakang
  // ============================================================
  doc.addPage()
  let y = 25

  const drawChapterHeader = (title: string, subtitle: string) => {
    doc.setFillColor(10, 22, 40)
    doc.rect(margin, y - 6, contentW, 14, 'F')
    doc.setTextColor(212, 160, 23)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin + 3, y + 2)
    doc.setTextColor(180, 180, 180)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitle, margin + 3, y + 8)
    y += 20
  }

  const drawSectionTitle = (title: string) => {
    doc.setTextColor(10, 22, 40)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin, y)
    y += 7
  }

  const drawText = (text: string, maxWidth = contentW) => {
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(text, maxWidth)
    lines.forEach((line: string) => {
      if (y > 270) { doc.addPage(); y = 25 }
      doc.text(line, margin, y)
      y += 5
    })
    y += 2
  }

  drawChapterHeader('BAB 1 — LATAR BELAKANG', 'Identitas Proyek dan Program BIMKON')
  drawSectionTitle('1.1 Identitas Proyek')
  drawText(`Program Bimbingan Konsultansi Peningkatan Produktivitas (BIMKON) adalah program pembinaan dari Kementerian Ketenagakerjaan RI yang bertujuan meningkatkan produktivitas perusahaan melalui pendampingan konsultan produktivitas terlatih dengan menggunakan metodologi DMAIC (Define-Measure-Analyze-Improve-Control).`)
  drawText(`Proyek ini dilaksanakan untuk perusahaan ${project.company_name} dengan kode proyek ${project.project_code}.`)

  // ============================================================
  // BAB 2 — Hasil Assessment PQCDSM
  // ============================================================
  if (y > 230) { doc.addPage(); y = 25 }
  drawChapterHeader('BAB 2 — HASIL ASSESSMENT PQCDSM', 'Skor Baseline Produktivitas per Dimensi')

  if (assessments.length > 0) {
    const tableData = assessments.map(a => [
      getDimLabel(a.dimension),
      `${a.percentage_score}%`,
      a.percentage_score >= 70 ? 'BAIK' : a.percentage_score >= 50 ? 'CUKUP' : 'PERLU PERBAIKAN',
    ])

    autoTable(doc, {
      startY: y,
      head: [['Dimensi PQCDSM', 'Skor Baseline', 'Kategori']],
      body: tableData,
      margin: { left: margin },
      tableWidth: contentW,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [10, 22, 40], textColor: [212, 160, 23], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 60, halign: 'center' },
      },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  } else {
    drawText('Data assessment PQCDSM belum tersedia.')
  }

  // ============================================================
  // BAB 3 — Action Plan & Hasil Implementasi
  // ============================================================
  if (y > 220) { doc.addPage(); y = 25 }
  drawChapterHeader('BAB 3 — ACTION PLAN & IMPLEMENTASI', 'Rencana dan Hasil Perbaikan')

  if (actionPlans.length > 0) {
    const apData = actionPlans.map(ap => [
      ap.title.substring(0, 30),
      ap.methodology,
      getDimLabel(ap.dimension),
      `${ap.kpi_baseline} → ${ap.kpi_target}`,
      ap.kpi_actual !== undefined ? String(ap.kpi_actual) : '-',
      ap.kpi_unit,
      getStatusLabel(ap.status),
      `${ap.progress_percentage}%`,
    ])

    autoTable(doc, {
      startY: y,
      head: [['Program', 'Metodologi', 'Dimensi', 'Baseline → Target', 'Aktual', 'Satuan', 'Status', 'Progress']],
      body: apData,
      margin: { left: margin },
      tableWidth: contentW,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [10, 22, 40], textColor: [212, 160, 23], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  } else {
    drawText('Belum ada action plan yang dibuat.')
  }

  // ============================================================
  // BAB 4 — Dampak Ekonomi & ROI
  // ============================================================
  if (y > 220) { doc.addPage(); y = 25 }
  drawChapterHeader('BAB 4 — DAMPAK EKONOMI & ROI', 'Estimasi Penghematan Biaya dan Return on Investment')

  const costSaving = 25000000 * 3
  const investment = actionPlans.length * 2500000
  const roi = investment > 0 ? (costSaving / investment).toFixed(1) : '0'

  autoTable(doc, {
    startY: y,
    head: [['Komponen', 'Nilai']],
    body: [
      ['Estimasi Cost Saving (3 bulan)', `Rp ${costSaving.toLocaleString('id-ID')}`],
      ['Total Investasi Program', `Rp ${investment.toLocaleString('id-ID')}`],
      ['Estimasi ROI', `${roi}x Lipat`],
      ['Productivity Index Baseline', `${baseScore}%`],
      ['Productivity Index Aktual', `${currScore}%`],
      ['Peningkatan Produktivitas', `+${improvement}%`],
    ],
    margin: { left: margin },
    tableWidth: contentW,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [10, 22, 40], textColor: [212, 160, 23], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { fontStyle: 'bold' } },
  })
  y = (doc as any).lastAutoTable.finalY + 15

  // ============================================================
  // BAB 5 — Lembar Pengesahan
  // ============================================================
  if (y > 200) { doc.addPage(); y = 25 }
  drawChapterHeader('BAB 5 — LEMBAR PENGESAHAN', 'Tanda Tangan Digital Pihak Terkait')

  const signatories = [
    { role: 'Konsultan Pendamping', org: 'Kemnaker RI' },
    { role: 'Verifikator Disnaker', org: 'Dinas Ketenagakerjaan' },
    { role: 'Verifikator Kemnaker', org: 'Direktorat Bina Produktivitas' },
  ]

  signatories.forEach(sig => {
    if (y > 260) { doc.addPage(); y = 25 }
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(250, 250, 250)
    doc.roundedRect(margin, y, contentW / 3 - 5, 40, 2, 2, 'FD')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text(sig.role, margin + 3, y + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    doc.text(sig.org, margin + 3, y + 14)
    doc.text('TTD: ____________________', margin + 3, y + 30)
  })

  // Footer
  const totalPages = (doc as any).internal.pages.length - 1
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `SIBIMKON — ${project.company_name} | ${project.project_code} | Halaman ${i} dari ${totalPages}`,
      pageW / 2,
      290,
      { align: 'center' }
    )
    doc.setDrawColor(212, 160, 23)
    doc.line(margin, 285, pageW - margin, 285)
  }

  return doc
}

// ============================================================
// Generate E-Certificate PDF
// ============================================================
export function generateCertificate(project: ProjectData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // Background
  doc.setFillColor(5, 10, 24)
  doc.rect(0, 0, pageW, pageH, 'F')

  // Gold border
  doc.setDrawColor(212, 160, 23)
  doc.setLineWidth(2)
  doc.rect(10, 10, pageW - 20, pageH - 20)
  doc.setLineWidth(0.5)
  doc.rect(13, 13, pageW - 26, pageH - 26)

  // Corner decorations
  const corners = [[15, 15], [pageW - 15, 15], [15, pageH - 15], [pageW - 15, pageH - 15]]
  corners.forEach(([cx, cy]) => {
    doc.setFillColor(212, 160, 23)
    doc.circle(cx, cy, 3, 'F')
  })

  // Header
  doc.setTextColor(212, 160, 23)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('KEMENTERIAN KETENAGAKERJAAN REPUBLIK INDONESIA', pageW / 2, 30, { align: 'center' })
  doc.text('DIREKTORAT BINA PRODUKTIVITAS', pageW / 2, 37, { align: 'center' })

  doc.setTextColor(180, 180, 180)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('— Program Bimbingan Konsultansi Peningkatan Produktivitas (BIMKON) —', pageW / 2, 44, { align: 'center' })

  // Divider
  doc.setDrawColor(212, 160, 23)
  doc.setLineWidth(0.5)
  doc.line(40, 48, pageW - 40, 48)

  // Certificate title
  doc.setTextColor(230, 230, 230)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('SERTIFIKAT PENGHARGAAN', pageW / 2, 62, { align: 'center' })

  doc.setTextColor(180, 180, 180)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Dengan bangga diberikan kepada:', pageW / 2, 72, { align: 'center' })

  // Company name
  doc.setTextColor(255, 220, 100)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(project.company_name.toUpperCase(), pageW / 2, 90, { align: 'center' })

  // Description
  doc.setTextColor(200, 200, 200)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const desc = `Telah berhasil menyelesaikan Program Bimbingan Konsultansi Peningkatan Produktivitas\ndengan proyek "${project.title}"`
  doc.text(desc, pageW / 2, 104, { align: 'center' })

  // Project code
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(8)
  doc.text(`Kode Proyek: ${project.project_code}`, pageW / 2, 120, { align: 'center' })

  // Divider
  doc.setDrawColor(212, 160, 23)
  doc.line(80, 128, pageW - 80, 128)

  // Score badge
  doc.setFillColor(212, 160, 23)
  doc.roundedRect(pageW / 2 - 30, 133, 60, 18, 3, 3, 'F')
  doc.setTextColor(10, 22, 40)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`Indeks Produktivitas: ${project.current_score || 0}%`, pageW / 2, 144, { align: 'center' })

  // QR placeholder
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(pageW - 60, pageH - 55, 40, 40, 2, 2, 'F')
  doc.setTextColor(10, 22, 40)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.text('QR VERIFIKASI', pageW - 40, pageH - 12, { align: 'center' })

  // Date & signature
  doc.setTextColor(180, 180, 180)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Diterbitkan: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 30, pageH - 25)
  doc.text('Direktur Jenderal Binalavotas', 30, pageH - 18)
  doc.setFont('helvetica', 'bold')
  doc.text('Kementerian Ketenagakerjaan RI', 30, pageH - 12)

  return doc
}
