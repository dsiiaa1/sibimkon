'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getProjects, getAssessments, getActionPlans } from '@/lib/db'
import { Project, ActionPlan, Assessment } from '@/lib/mockData'
import { generateFinalReport, generateCertificate } from '@/lib/pdf-generator'
import { FileText, Award, ShieldCheck, Download, Edit3, CheckCircle2 } from 'lucide-react'

interface SignatureRecord {
  signed: boolean
  signedAt: string
  signerName: string
}

export default function ReportsPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [consultantName, setConsultantName] = useState('Konsultan SIBIMKON')

  // Tanda tangan — persisten via localStorage
  const SIG_KEY = `sibimkon_signatures_${projectId}`
  const [consultantSig, setConsultantSig] = useState<SignatureRecord>({ signed: false, signedAt: '', signerName: '' })
  const [disnakerSig, setDisnakerSig] = useState<SignatureRecord>({ signed: false, signedAt: '', signerName: '' })
  const [kemnakerSig, setKemnakerSig] = useState<SignatureRecord>({ signed: false, signedAt: '', signerName: '' })

  const [pdfLoading, setPdfLoading] = useState(false)
  const [certLoading, setCertLoading] = useState(false)

  useEffect(() => {
    async function loadData() {
      // Baca nama konsultan dari session
      const localUser = localStorage.getItem('sibimkon_user')
      if (localUser) {
        const u = JSON.parse(localUser)
        setConsultantName(u.full_name || 'Konsultan SIBIMKON')
      }

      const projects = await getProjects()
      const proj = projects.find((p: Project) => p.id === projectId)
      if (!proj) { router.push('/dashboard'); return }
      setProject(proj)

      const [plans, assess] = await Promise.all([
        getActionPlans(projectId),
        getAssessments(projectId),
      ])
      setActionPlans(plans)
      setAssessments(assess)

      // Muat tanda tangan yang tersimpan
      const saved = localStorage.getItem(SIG_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.consultant) setConsultantSig(parsed.consultant)
        if (parsed.disnaker) setDisnakerSig(parsed.disnaker)
        if (parsed.kemnaker) setKemnakerSig(parsed.kemnaker)
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const saveSigs = (updated: { consultant: SignatureRecord; disnaker: SignatureRecord; kemnaker: SignatureRecord }) => {
    localStorage.setItem(SIG_KEY, JSON.stringify(updated))
  }

  const handleSign = (role: 'consultant' | 'disnaker' | 'kemnaker') => {
    const localUser = localStorage.getItem('sibimkon_user')
    const u = localUser ? JSON.parse(localUser) : {}
    const rec: SignatureRecord = {
      signed: true,
      signedAt: new Date().toLocaleString('id-ID'),
      signerName: role === 'consultant' ? (u.full_name || consultantName)
        : role === 'disnaker' ? (u.full_name || 'Admin Disnaker')
        : (u.full_name || 'Admin Kemnaker'),
    }
    const next = {
      consultant: role === 'consultant' ? rec : consultantSig,
      disnaker: role === 'disnaker' ? rec : disnakerSig,
      kemnaker: role === 'kemnaker' ? rec : kemnakerSig,
    }
    if (role === 'consultant') setConsultantSig(rec)
    if (role === 'disnaker') setDisnakerSig(rec)
    if (role === 'kemnaker') setKemnakerSig(rec)
    saveSigs(next)

    // Simpan ke Supabase (best-effort)
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.from('reports').upsert({
        project_id: projectId,
        report_type: 'signature',
        title: `Tanda Tangan ${role}`,
        report_data: next,
      }, { onConflict: 'project_id,report_type' }).then(({ error }) => {
        if (error) console.warn('Supabase signature save error (non-critical):', error.message)
      })
    }).catch(console.warn)
  }

  // ── ROI dari data KPI aktual vs baseline (Fix #7) ──
  const roiData = (() => {
    if (actionPlans.length === 0) return { costSaving: 0, investment: 0, roi: 0 }

    // Cost saving: hitung dari KPI yang sudah ada aktual dan mencapai target
    // Estimasi: setiap unit perbaikan KPI diasumsikan setara Rp 500.000 nilai bisnis
    const costSaving = actionPlans.reduce((acc, act) => {
      if (act.kpi_actual === undefined) return acc
      const achieved = act.kpi_target > act.kpi_baseline
        ? Math.max(0, act.kpi_actual - act.kpi_baseline)   // higher is better
        : Math.max(0, act.kpi_baseline - act.kpi_actual)   // lower is better
      const unitValue = 500000 // Rp 500rb per unit perbaikan KPI
      return acc + achieved * unitValue
    }, 0)

    // Investment: dihitung dari jumlah action plan aktif × estimasi biaya per plan
    const investment = actionPlans.filter(a => a.status !== 'belum_mulai').length * 2500000

    const roi = investment > 0 ? costSaving / investment : 0
    return { costSaving, investment, roi }
  })()

  const beforeScore = project?.baseline_score || 0
  const afterScore = project?.current_score || 0
  const improvement = afterScore - beforeScore

  const handleDownloadPDF = () => {
    if (!project) return
    setPdfLoading(true)
    try {
      const doc = generateFinalReport(project, assessments, actionPlans)
      doc.save(`Laporan_Akhir_${project.project_code}.pdf`)
    } catch (err) {
      console.error(err)
      alert('Gagal membuat PDF: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setPdfLoading(false)
    }
  }

  const handleDownloadCert = () => {
    if (!project) return
    setCertLoading(true)
    try {
      const doc = generateCertificate(project)
      doc.save(`E-Sertifikat_${project.company_name.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error(err)
      alert('Gagal membuat Sertifikat: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setCertLoading(false)
    }
  }

  if (!project) return (
    <div className="flex h-64 items-center justify-center text-slate-400 text-sm">Memuat laporan...</div>
  )

  const SigBlock = ({
    title, orgLabel, sig, role,
  }: {
    title: string; orgLabel: string; sig: SignatureRecord; role: 'consultant' | 'disnaker' | 'kemnaker'
  }) => (
    <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-slate-500 font-bold block uppercase">{title}</span>
        {sig.signed ? (
          <>
            <span className="text-xs font-semibold text-slate-300 mt-1 block">{sig.signerName}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">✅ TTD pada {sig.signedAt}</span>
          </>
        ) : (
          <span className="text-xs font-semibold text-slate-500 mt-1 block italic">{orgLabel}</span>
        )}
      </div>
      {sig.signed ? (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 shrink-0">
          <CheckCircle2 className="h-4 w-4" /> Terverifikasi
        </span>
      ) : (
        <button onClick={() => handleSign(role)}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-xs font-bold rounded-lg text-white cursor-pointer shrink-0">
          <Edit3 className="h-3.5 w-3.5" /> Tanda Tangan
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
        <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
        <p className="text-xs text-slate-500 mt-0.5">Modul Dokumen: Laporan, Sertifikat, dan Lembar Verifikasi Digital</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left col */}
        <div className="lg:col-span-7 space-y-6">

          {/* Laporan Akhir */}
          <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 md:p-8 space-y-4">
            <h3 className="font-bold text-slate-200 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400" /> Laporan Produktivitas Akhir
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Auto-generate dokumen laporan BIMKON lengkap 7 Bab sesuai format standar Kemnaker RI.
            </p>
            <div className="grid grid-cols-3 gap-2 bg-slate-950 border border-slate-850 p-4 rounded-2xl">
              <div className="text-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Baseline</span>
                <span className="text-lg font-bold text-slate-400">{beforeScore}%</span>
              </div>
              <div className="text-center border-x border-slate-850">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Aktual</span>
                <span className="text-lg font-bold text-indigo-400">{afterScore}%</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Peningkatan</span>
                <span className={`text-lg font-bold ${improvement >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {improvement >= 0 ? '+' : ''}{improvement}%
                </span>
              </div>
            </div>
            <button onClick={handleDownloadPDF} disabled={pdfLoading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-650 hover:bg-indigo-600 text-sm font-semibold rounded-xl text-white transition-all cursor-pointer shadow-md disabled:opacity-50">
              <Download className="h-4 w-4" />
              {pdfLoading ? 'Menyusun Laporan...' : 'Unduh Laporan Akhir (PDF)'}
            </button>
          </div>

          {/* E-Certificate */}
          <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 md:p-8 space-y-4">
            <h3 className="font-bold text-slate-200 flex items-center gap-2">
              <Award className="h-5 w-5 text-cyan-400" /> E-Sertifikat Peningkatan Produktivitas
            </h3>
            <div className="border border-amber-500/20 bg-gradient-to-tr from-slate-950 to-slate-900 p-6 rounded-2xl text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500">Sertifikat Penghargaan</span>
                <h4 className="text-sm font-extrabold text-slate-200 uppercase">{project.company_name}</h4>
                <p className="text-[10px] text-slate-400 leading-normal max-w-xs mx-auto">
                  Telah menyelesaikan Program Bimbingan Konsultansi Peningkatan Produktivitas Kemnaker RI
                </p>
                <div className="flex justify-center pt-2">
                  <div className="h-12 w-12 bg-white p-1 rounded flex items-center justify-center">
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[6px] text-white">QR</div>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={handleDownloadCert} disabled={certLoading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-sm font-semibold rounded-xl text-white transition-all cursor-pointer shadow-md disabled:opacity-50">
              <Download className="h-4 w-4" />
              {certLoading ? 'Membuat Sertifikat...' : 'Unduh E-Sertifikat (PDF)'}
            </button>
          </div>
        </div>

        {/* Right col */}
        <div className="lg:col-span-5 space-y-6">

          {/* ROI — dihitung dari data KPI aktual */}
          <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200">Dampak Ekonomi &amp; ROI</h3>
              <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                Dari data KPI aktual
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-950 border border-slate-850 p-3 rounded-xl">
                <span className="text-xs text-slate-500">Estimasi Cost Saving</span>
                <span className="text-xs font-bold text-emerald-400">
                  {roiData.costSaving > 0
                    ? `Rp ${roiData.costSaving.toLocaleString('id-ID')}`
                    : <span className="text-slate-500 italic">Belum ada data KPI aktual</span>}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-950 border border-slate-850 p-3 rounded-xl">
                <span className="text-xs text-slate-500">Estimasi Investasi Program</span>
                <span className="text-xs font-bold text-indigo-400">
                  {roiData.investment > 0
                    ? `Rp ${roiData.investment.toLocaleString('id-ID')}`
                    : <span className="text-slate-500 italic">Belum ada action plan aktif</span>}
                </span>
              </div>
              <div className="flex justify-between items-center bg-indigo-500/5 border border-indigo-500/10 p-3.5 rounded-xl">
                <span className="text-xs font-bold text-indigo-300">Estimasi ROI</span>
                <span className="text-xs font-bold text-white">
                  {roiData.roi > 0 ? `${roiData.roi.toFixed(1)}× Lipat` : '—'}
                </span>
              </div>
            </div>
            {actionPlans.filter(a => a.kpi_actual !== undefined).length === 0 && (
              <p className="text-[10px] text-slate-600 leading-normal">
                * ROI akan dihitung otomatis setelah input KPI aktual di modul IMPROVE.
              </p>
            )}
          </div>

          {/* Tanda Tangan Digital — persisten */}
          <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 space-y-4">
            <h3 className="font-bold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-400" /> Tanda Tangan Digital
            </h3>
            <p className="text-xs text-slate-500 leading-normal">
              Tanda tangan tersimpan permanen di perangkat dan tercatat dengan timestamp.
            </p>
            <div className="space-y-3">
              <SigBlock title="Konsultan Pendamping" orgLabel={consultantName} sig={consultantSig} role="consultant" />
              <SigBlock title="Verifikator Disnaker" orgLabel="Dinas Ketenagakerjaan" sig={disnakerSig} role="disnaker" />
              <SigBlock title="Verifikator Kemnaker" orgLabel="Direktorat Bina Produktivitas" sig={kemnakerSig} role="kemnaker" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
