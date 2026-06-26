'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getProjects, getAssessments, getActionPlans } from '@/lib/db'
import { Project, ActionPlan, Assessment } from '@/lib/mockData'
import { generateFinalReport, generateCertificate } from '@/lib/pdf-generator'
import { FileText, Award, ShieldCheck, Download, Edit3, CheckCircle2, Loader2 } from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'

interface SignatureRecord {
  signed: boolean
  signedAt: string
  signerName: string
}

type SigBundle = {
  consultant: SignatureRecord
  company: SignatureRecord
}

const EMPTY_SIG: SignatureRecord = { signed: false, signedAt: '', signerName: '' }

// ── Simpan tanda tangan ke Supabase dengan retry (max 2x) ──
async function persistSignaturesToSupabase(
  projectId: string,
  bundle: SigBundle
): Promise<void> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  for (let attempt = 1; attempt <= 2; attempt++) {
    const { error } = await supabase.from('reports').upsert(
      {
        project_id: projectId,
        report_type: 'signature',
        title: 'Tanda Tangan Digital',
        report_data: bundle,
      },
      { onConflict: 'project_id,report_type' }
    )
    if (!error) return
    if (attempt === 2) {
      console.warn('Supabase signature save failed after 2 attempts:', error.message)
    }
  }
}

export default function ReportsPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [consultantName, setConsultantName] = useState('Konsultan SIBIMKON')

  // Role diverifikasi dari server — tidak bisa dimanipulasi via DevTools
  const { userInfo, verified } = useUserRole()

  // Tanda tangan — primary: Supabase, fallback: localStorage
  // SIG_KEY di-memoize agar tidak berubah setiap render (mencegah useCallback infinite loop)
  const SIG_KEY = useMemo(() => `sibimkon_signatures_${projectId}`, [projectId])
  const [consultantSig, setConsultantSig] = useState<SignatureRecord>(EMPTY_SIG)
  const [companySig, setCompanySig] = useState<SignatureRecord>(EMPTY_SIG)
  const [sigSaving, setSigSaving] = useState<'consultant' | 'company' | null>(null)

  const [pdfLoading, setPdfLoading] = useState(false)
  const [certLoading, setCertLoading] = useState(false)

  // ── Ambil tanda tangan: coba Supabase dulu, fallback localStorage ──
  const loadSignatures = useCallback(async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase
        .from('reports')
        .select('report_data')
        .eq('project_id', projectId)
        .eq('report_type', 'signature')
        .maybeSingle()

      if (!error && data?.report_data) {
        const raw = data.report_data as SigBundle & { disnaker?: SignatureRecord; kemnaker?: SignatureRecord }
        const bundle: SigBundle = {
          consultant: raw.consultant || EMPTY_SIG,
          company: raw.company || raw.disnaker || raw.kemnaker || EMPTY_SIG,
        }
        if (bundle.consultant) setConsultantSig(bundle.consultant)
        if (bundle.company) setCompanySig(bundle.company)
        // Sync ke localStorage sebagai cache lokal
        localStorage.setItem(SIG_KEY, JSON.stringify(bundle))
        return
      }
    } catch (_) { /* Supabase tidak tersedia, fallback ke localStorage */ }

    // Fallback: baca dari localStorage
    const saved = localStorage.getItem(SIG_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SigBundle & { disnaker?: SignatureRecord; kemnaker?: SignatureRecord }
        if (parsed.consultant) setConsultantSig(parsed.consultant)
        if (parsed.company) setCompanySig(parsed.company)
        else if (parsed.disnaker) setCompanySig(parsed.disnaker)
        else if (parsed.kemnaker) setCompanySig(parsed.kemnaker)
      } catch (_) { /* data corrupt, abaikan */ }
    }
  }, [projectId, SIG_KEY])

  useEffect(() => {
    async function loadData() {
      // consultantName diambil dari userInfo (server-verified jika tersedia)
      if (userInfo?.full_name) {
        setConsultantName(userInfo.full_name)
      } else {
        // fallback saat hook masih loading
        const local = localStorage.getItem('sibimkon_user')
        if (local) {
          try { setConsultantName(JSON.parse(local)?.full_name || 'Konsultan SIBIMKON') } catch { /* noop */ }
        }
      }

      const projects = await getProjects()
      const proj = projects.find((p: Project) => p.id === projectId)
      if (!proj) { router.push('/dashboard'); return }
      setProject(proj)

      const [plans, assess] = await Promise.all([
        getActionPlans(projectId),
        getAssessments(projectId),
        loadSignatures(),
      ])
      setActionPlans(plans)
      setAssessments(assess)
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, userInfo])

  const handleSign = async (role: 'consultant' | 'company') => {
    // Prioritas: gunakan userInfo dari server (verified). Jika belum verified (masih
    // loading atau Supabase offline), fallback ke localStorage tetapi tampilkan peringatan.
    const effectiveUser = userInfo ?? (() => {
      const local = localStorage.getItem('sibimkon_user')
      return local ? JSON.parse(local) : {}
    })()

    const userRoleRaw: string = effectiveUser?.role ?? ''

    const allowedRoles: Record<string, string[]> = {
      consultant: ['konsultan'],
      company: ['perusahaan'],
    }

    if (!allowedRoles[role].includes(userRoleRaw)) {
      const modeNote = verified
        ? '(diverifikasi dari server)'
        : '(belum diverifikasi — pastikan koneksi aktif)'
      alert(
        `Tanda tangan untuk bagian ini hanya diperbolehkan untuk role: ${allowedRoles[role].join(', ')}.\n` +
        `Role Anda saat ini: ${userRoleRaw || 'tidak diketahui'} ${modeNote}`
      )
      return
    }

    const rec: SignatureRecord = {
      signed: true,
      signedAt: new Date().toLocaleString('id-ID'),
      signerName: effectiveUser?.full_name || (role === 'consultant' ? consultantName : project?.company_name || 'PIC Perusahaan'),
    }

    const next: SigBundle = {
      consultant: role === 'consultant' ? rec : consultantSig,
      company: role === 'company' ? rec : companySig,
    }

    if (role === 'consultant') setConsultantSig(rec)
    if (role === 'company') setCompanySig(rec)

    // Simpan ke localStorage dulu (always succeeds)
    localStorage.setItem(SIG_KEY, JSON.stringify(next))

    // Simpan ke Supabase dengan loading indicator
    setSigSaving(role)
    try {
      await persistSignaturesToSupabase(projectId, next)
    } finally {
      setSigSaving(null)
    }
  }

  // ── ROI dari data KPI aktual vs baseline ──
  // Prioritas: gunakan nilai manual (cost_saving_manual / investment_manual) jika ada,
  // fallback ke estimasi otomatis hanya jika belum ada input manual sama sekali.
  const roiData = (() => {
    if (actionPlans.length === 0) return { costSaving: 0, investment: 0, roi: 0, isManual: false }

    const totalManualSaving = actionPlans.reduce((acc, a) => acc + (a.cost_saving_manual ?? 0), 0)
    const totalManualInvestment = actionPlans.reduce((acc, a) => acc + (a.investment_manual ?? 0), 0)
    const hasManualData = totalManualSaving > 0 || totalManualInvestment > 0

    if (hasManualData) {
      // Gunakan nilai yang diinput langsung oleh konsultan
      const roi = totalManualInvestment > 0 ? totalManualSaving / totalManualInvestment : 0
      return { costSaving: totalManualSaving, investment: totalManualInvestment, roi, isManual: true }
    }

    // Fallback: estimasi otomatis dari perbaikan KPI
    const costSaving = actionPlans.reduce((acc, act) => {
      if (act.kpi_actual === undefined) return acc
      const achieved = act.kpi_target > act.kpi_baseline
        ? Math.max(0, act.kpi_actual - act.kpi_baseline)   // higher is better
        : Math.max(0, act.kpi_baseline - act.kpi_actual)   // lower is better
      const unitValue = 500000 // Rp 500rb per unit perbaikan KPI (estimasi default)
      return acc + achieved * unitValue
    }, 0)
    const investment = actionPlans.filter(a => a.status !== 'belum_mulai').length * 2500000
    const roi = investment > 0 ? costSaving / investment : 0
    return { costSaving, investment, roi, isManual: false }
  })()

  const beforeScore = project?.baseline_score || 0
  const afterScore = project?.current_score || 0
  const improvement = afterScore - beforeScore

  const handleDownloadPDF = async () => {
    if (!project) return
    setPdfLoading(true)
    try {
      const doc = await generateFinalReport(project, assessments, actionPlans)
      doc.save(`Laporan_Akhir_${project.project_code}.pdf`)
    } catch (err) {
      console.error(err)
      alert('Gagal membuat PDF: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setPdfLoading(false)
    }
  }

  const handleDownloadCert = async () => {
    if (!project) return
    setCertLoading(true)
    try {
      const doc = await generateCertificate(project, {
        consultant: consultantSig,
        company: companySig,
      })
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
    title: string; orgLabel: string; sig: SignatureRecord; role: 'consultant' | 'company'
  }) => {
    const isSaving = sigSaving === role
    return (
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
            {isSaving
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</>
              : <><CheckCircle2 className="h-4 w-4" /> Terverifikasi</>
            }
          </span>
        ) : (
          <button
            onClick={() => handleSign(role)}
            disabled={isSaving}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-xs font-bold rounded-lg text-white cursor-pointer shrink-0 disabled:opacity-60"
          >
            {isSaving
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</>
              : <><Edit3 className="h-3.5 w-3.5" /> Tanda Tangan</>
            }
          </button>
        )}
      </div>
    )
  }

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
              Auto-generate dokumen laporan BIMKON lengkap sesuai format standar SIBIMKON.
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
                  Telah menyelesaikan Program Bimbingan Konsultansi Peningkatan Produktivitas SIBIMKON
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

          {/* ROI — menggunakan nilai manual jika ada, fallback ke estimasi KPI */}
          <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200">Dampak Ekonomi &amp; ROI</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded border ${
                roiData.isManual
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-slate-500 bg-slate-900 border-slate-800'
              }`}>
                {roiData.isManual ? 'Dari input manual konsultan' : 'Estimasi dari data KPI'}
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
                <span className="text-xs font-bold text-navy-900" style={{ color: 'var(--navy-900)' }}>
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
              Tanda tangan disimpan ke server (Supabase) dan dicache lokal. Tersedia di semua browser &amp; perangkat.
            </p>
            {/* Badge verifikasi role */}
            <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              verified
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
            }`}>
              <ShieldCheck className="h-3 w-3" />
              {verified
                ? `Role terverifikasi server: ${userInfo?.role ?? '—'}`
                : 'Role belum terverifikasi — mode offline/demo'}
            </div>
            <div className="space-y-3">
              <SigBlock title="Konsultan Pendamping" orgLabel={consultantName} sig={consultantSig} role="consultant" />
              <SigBlock title="PIC Perusahaan Klien" orgLabel={project.company_name} sig={companySig} role="company" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
