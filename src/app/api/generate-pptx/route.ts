import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { project, measureProblems, actionPlans, beforeScore, afterScore, improvement, computedKpiAkhir, consultantSig } = await req.json()

    // pptxgenjs runs on Node.js server-side, no browser compat issues
    const pptxgen = (await import('pptxgenjs')).default
    const prs = new pptxgen()

    prs.layout = 'LAYOUT_WIDE'
    prs.title = `Laporan DMAIC - ${project.title}`

    const BG = '#0b0f1a'
    const ACCENT = '#6366f1'
    const WHITE = 'FFFFFF'
    const GREY = '94a3b8'

    // ── Slide 1: Cover ──
    const s1 = prs.addSlide()
    s1.background = { color: BG }
    s1.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.08, fill: { color: ACCENT } })
    s1.addShape(prs.ShapeType.rect, { x: 0, y: 7.42, w: '100%', h: 0.08, fill: { color: ACCENT } })
    s1.addText('SMART PRODUCTIVE', { x: 0.5, y: 0.5, w: 12, h: 0.4, fontSize: 10, color: ACCENT, bold: true, fontFace: 'Arial' })
    s1.addText('LAPORAN AKHIR PROYEK DMAIC', { x: 0.5, y: 1.2, w: 12, h: 0.8, fontSize: 28, color: WHITE, bold: true, fontFace: 'Arial', align: 'center' })
    s1.addText(project.title, { x: 0.5, y: 2.2, w: 12, h: 0.6, fontSize: 18, color: GREY, fontFace: 'Arial', align: 'center' })
    s1.addShape(prs.ShapeType.rect, { x: 5.5, y: 3.1, w: 2, h: 0.04, fill: { color: ACCENT } })
    s1.addText(`Kode Proyek: ${project.project_code}`, { x: 0.5, y: 3.4, w: 12, h: 0.3, fontSize: 11, color: GREY, fontFace: 'Arial', align: 'center' })
    s1.addText(new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }), { x: 0.5, y: 3.8, w: 12, h: 0.3, fontSize: 11, color: GREY, fontFace: 'Arial', align: 'center' })
    s1.addText(`Skor Baseline: ${beforeScore}%   →   Skor Aktual: ${afterScore}%   →   Peningkatan: +${improvement}%`, { x: 0.5, y: 6.5, w: 12, h: 0.4, fontSize: 12, color: ACCENT, bold: true, fontFace: 'Arial', align: 'center' })

    // ── Slide 2: Define ──
    const s2 = prs.addSlide()
    s2.background = { color: BG }
    s2.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 0.06, h: '100%', fill: { color: ACCENT } })
    s2.addText('01 / DEFINE', { x: 0.3, y: 0.3, w: 4, h: 0.35, fontSize: 10, color: ACCENT, bold: true, fontFace: 'Arial' })
    s2.addText('Identifikasi Masalah', { x: 0.3, y: 0.75, w: 12, h: 0.5, fontSize: 22, color: WHITE, bold: true, fontFace: 'Arial' })
    const defineRows = [
      ['Nama Proyek', project.title],
      ['Kode Proyek', project.project_code],
      ['Perusahaan', project.company_name || '-'],
      ['Deskripsi', project.description || '-'],
    ]
    defineRows.forEach(([label, value]: string[], idx: number) => {
      const y = 1.6 + idx * 0.85
      s2.addText(label, { x: 0.3, y, w: 3, h: 0.3, fontSize: 10, color: GREY, fontFace: 'Arial' })
      s2.addText(value, { x: 3.5, y, w: 9, h: 0.6, fontSize: 11, color: WHITE, fontFace: 'Arial', wrap: true })
    })

    // ── Slide 3: Measure ──
    const s3 = prs.addSlide()
    s3.background = { color: BG }
    s3.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 0.06, h: '100%', fill: { color: '0ea5e9' } })
    s3.addText('02 / MEASURE', { x: 0.3, y: 0.3, w: 4, h: 0.35, fontSize: 10, color: '0ea5e9', bold: true, fontFace: 'Arial' })
    s3.addText('Pengukuran & Data', { x: 0.3, y: 0.75, w: 12, h: 0.5, fontSize: 22, color: WHITE, bold: true, fontFace: 'Arial' })
    if (measureProblems && measureProblems.length > 0) {
      measureProblems.slice(0, 5).forEach((prob: any, idx: number) => {
        const y = 1.6 + idx * 0.85
        s3.addShape(prs.ShapeType.rect, { x: 0.3, y, w: 0.04, h: 0.5, fill: { color: '0ea5e9' } })
        s3.addText(prob.problem_text || '-', { x: 0.5, y, w: 10, h: 0.5, fontSize: 11, color: WHITE, fontFace: 'Arial', wrap: true })
        s3.addText(`Dimensi: ${prob.pqcdsm_dimension || '-'}`, { x: 0.5, y: y + 0.52, w: 6, h: 0.25, fontSize: 9, color: GREY, fontFace: 'Arial' })
      })
    } else {
      s3.addText('Data masalah belum tersedia.', { x: 0.3, y: 1.8, w: 12, h: 0.5, fontSize: 12, color: GREY, fontFace: 'Arial', italic: true })
    }

    // ── Slide 4: Improve / Action Plans ──
    const s4 = prs.addSlide()
    s4.background = { color: BG }
    s4.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 0.06, h: '100%', fill: { color: '10b981' } })
    s4.addText('04 / IMPROVE', { x: 0.3, y: 0.3, w: 4, h: 0.35, fontSize: 10, color: '10b981', bold: true, fontFace: 'Arial' })
    s4.addText('Rencana Perbaikan', { x: 0.3, y: 0.75, w: 12, h: 0.5, fontSize: 22, color: WHITE, bold: true, fontFace: 'Arial' })
    const activeActions = (actionPlans || []).filter((a: any) => !a.is_deleted)
    if (activeActions.length > 0) {
      const tableData = [
        [
          { text: 'Action Plan', options: { bold: true, color: WHITE, fill: { color: '10b981' } } },
          { text: 'PIC', options: { bold: true, color: WHITE, fill: { color: '10b981' } } },
          { text: 'Status', options: { bold: true, color: WHITE, fill: { color: '10b981' } } },
          { text: 'Progress', options: { bold: true, color: WHITE, fill: { color: '10b981' } } },
        ],
        ...activeActions.slice(0, 8).map((a: any) => [
          { text: a.title || '-', options: { color: WHITE } },
          { text: a.pic_name || '-', options: { color: GREY } },
          { text: (a.status || '-').replace('_', ' '), options: { color: GREY } },
          { text: `${a.progress_percentage || 0}%`, options: { color: '10b981' } },
        ])
      ]
      s4.addTable(tableData as any, { x: 0.3, y: 1.5, w: 12.3, colW: [5, 2.5, 2, 1.8], border: { pt: 0.5, color: '1e293b' }, fontSize: 10, fontFace: 'Arial' })
    } else {
      s4.addText('Belum ada action plan.', { x: 0.3, y: 1.8, w: 12, h: 0.5, fontSize: 12, color: GREY, fontFace: 'Arial', italic: true })
    }

    // ── Slide 5: Results Summary ──
    const s5 = prs.addSlide()
    s5.background = { color: BG }
    s5.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 0.06, h: '100%', fill: { color: 'f59e0b' } })
    s5.addText('05 / CONTROL — HASIL', { x: 0.3, y: 0.3, w: 6, h: 0.35, fontSize: 10, color: 'f59e0b', bold: true, fontFace: 'Arial' })
    s5.addText('Ringkasan Pencapaian', { x: 0.3, y: 0.75, w: 12, h: 0.5, fontSize: 22, color: WHITE, bold: true, fontFace: 'Arial' })
    const cards = [
      { label: 'Skor Baseline', value: `${beforeScore}%`, color: GREY },
      { label: 'Skor Aktual', value: `${afterScore}%`, color: ACCENT },
      { label: 'Peningkatan', value: `+${improvement}%`, color: '10b981' },
      { label: 'KPI Akhir', value: `${Math.round(computedKpiAkhir || 0)}%`, color: '0ea5e9' },
      { label: 'Action Plans', value: `${activeActions.length}`, color: 'f59e0b' },
      { label: 'Selesai', value: `${activeActions.filter((a: any) => a.status === 'selesai').length}`, color: '10b981' },
    ]
    cards.forEach((card, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = 0.3 + col * 4.3
      const y = 1.8 + row * 2.2
      s5.addShape(prs.ShapeType.roundRect, { x, y, w: 4, h: 1.8, fill: { color: '0f172a' }, line: { color: '1e293b', pt: 1 }, rectRadius: 0.1 })
      s5.addText(card.label, { x: x + 0.2, y: y + 0.2, w: 3.6, h: 0.3, fontSize: 9, color: GREY, fontFace: 'Arial', bold: true })
      s5.addText(card.value, { x: x + 0.2, y: y + 0.6, w: 3.6, h: 0.8, fontSize: 28, color: card.color, fontFace: 'Arial', bold: true })
    })

    // ── Slide 6: Closing ──
    const s6 = prs.addSlide()
    s6.background = { color: BG }
    s6.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.08, fill: { color: ACCENT } })
    s6.addShape(prs.ShapeType.rect, { x: 0, y: 7.42, w: '100%', h: 0.08, fill: { color: ACCENT } })
    s6.addText('Terima Kasih', { x: 0.5, y: 2.5, w: 12, h: 0.8, fontSize: 32, color: WHITE, bold: true, fontFace: 'Arial', align: 'center' })
    s6.addText('Laporan ini dibuat secara otomatis oleh sistem Smart Productive', { x: 0.5, y: 3.5, w: 12, h: 0.5, fontSize: 12, color: GREY, fontFace: 'Arial', align: 'center' })
    if (consultantSig?.signed) {
      s6.addText(`Konsultan: ${consultantSig.signerName}   |   TTD: ${consultantSig.signedAt}`, { x: 0.5, y: 6.5, w: 12, h: 0.3, fontSize: 10, color: GREY, fontFace: 'Arial', align: 'center' })
    }

    // Generate as buffer and return as binary response
    const buffer = await prs.write({ outputType: 'nodebuffer' }) as Buffer
    
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="Laporan_DMAIC_${project.project_code}.pptx"`,
      },
    })
  } catch (err: any) {
    console.error('[generate-pptx] error:', err)
    return NextResponse.json({ error: err.message || 'Gagal membuat PPTX' }, { status: 500 })
  }
}
