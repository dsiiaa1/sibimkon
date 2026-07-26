'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCompanies, getProjects, getCompanyBaselineAssessment, getAiIdentifiedProblems, saveAiIdentifiedProblems, updateAiIdentifiedProblemStatus, createProject, saveProjectCharter, updateProjectDetails, saveProjectEditLog } from '@/lib/db'
import { Company, Project, CompanyBaselineAssessment, AiIdentifiedProblem } from '@/lib/mockData'
import { Building, ArrowLeft, Plus, User, Phone, Mail, ArrowRight, BrainCircuit, FileText, CheckCircle2, Pencil, X, MapPin, Trash2 } from 'lucide-react'
import { PROJECT_STATUS_LABELS, inferPQCDSMDimension } from '@/lib/utils'
import CreateProjectModal from '@/components/CreateProjectModal'
import { useDialog } from '@/hooks/useDialog'

function EditProjectModal({ project, onClose, onSave }: { project: Project, onClose: () => void, onSave: (p: Partial<Project>) => void }) {
  const [title, setTitle] = useState(project.title)
  const [desc, setDesc] = useState(project.description)
  const [startDate, setStartDate] = useState(project.start_date)
  const [endDate, setEndDate] = useState(project.target_end_date)
  const [dimensi, setDimensi] = useState(project.dimensi_pqcdsm || '')
  const [saving, setSaving] = useState(false)
  const { showConfirm } = useDialog()
  
  const PQCDSM_OPTS = [
    { key: 'productivity', label: 'Production' },
    { key: 'quality', label: 'Quality' },
    { key: 'cost', label: 'Cost' },
    { key: 'delivery', label: 'Delivery' },
    { key: 'safety', label: 'Safety' },
    { key: 'morale', label: 'Morale' },
  ]

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (startDate !== project.start_date || endDate !== project.target_end_date) {
      const ok = await showConfirm('Anda mengubah jadwal proyek. Apakah Anda yakin?')
      if (!ok) return
    }
    setSaving(true)
    await onSave({ title, description: desc, start_date: startDate, target_end_date: endDate, dimensi_pqcdsm: dimensi || undefined })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(2,6,15,0.80)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-[0_30px_80px_rgba(0,0,0,0.60)]">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-950">
          <h3 className="text-lg font-bold text-slate-200">Edit Proyek</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Dimensi PQCDSM</label>
            <select value={dimensi} onChange={(e) => setDimensi(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:border-indigo-500">
              <option value="">-- Pilih Dimensi --</option>
              {PQCDSM_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Judul Proyek</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Deskripsi</label>
            <textarea required value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:border-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tanggal Mulai</label>
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Target Selesai</label>
              <input type="date" required min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:border-indigo-500" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-300">Batal</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const { showAlert, showConfirm, showPrompt } = useDialog()

  const [company, setCompany] = useState<Company | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('unknown')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [assessment, setAssessment] = useState<CompanyBaselineAssessment | null>(null)
  const [aiProblems, setAiProblems] = useState<AiIdentifiedProblem[]>([])
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [activeDimFilter, setActiveDimFilter] = useState<string | null>(null)
  const [activeProjDimFilter, setActiveProjDimFilter] = useState<string | null>(null)
  // §6.3 PRD — readiness gate state
  const [readinessGateOpen, setReadinessGateOpen] = useState<boolean | null>(null)

  useEffect(() => {
    async function loadData() {
      const localUser = localStorage.getItem('smartproductive_user')
      if (localUser) {
        const u = JSON.parse(localUser)
        setCurrentUserId(u.id || 'unknown')
        setCurrentUser(u)
      }
      const comps = await getCompanies()
      const comp = comps.find(c => c.id === companyId)
      if (!comp) {
        router.push('/companies')
        return
      }
      setCompany(comp)

      const allProjects = await getProjects()
      const compProjects = allProjects.filter(p => p.company_id === companyId)
      setProjects(compProjects)

      const [ass, probs] = await Promise.all([
        getCompanyBaselineAssessment(companyId),
        getAiIdentifiedProblems(companyId)
      ])
      setAssessment(ass)
      setAiProblems(probs)

      // §6.3 PRD — load readiness gate status untuk tier simple
      if (comp?.tier === 'simple') {
        try {
          const { getReadinessGateStatus } = await import('@/app/actions/readiness')
          const gate = await getReadinessGateStatus(companyId)
          setReadinessGateOpen(gate.gateOpen)
        } catch { setReadinessGateOpen(false) }
      } else {
        // Tier menengah/besar: gate selalu terbuka (tidak ada readiness phase)
        setReadinessGateOpen(true)
      }
    }
    loadData()
  }, [companyId, router])

  const isKonsultan = currentUser?.role !== 'perusahaan'

  const handleRunAi = async () => {
    if (!assessment) return
    setAiAnalyzing(true)
    try {
      const res = await fetch('/api/onboarding-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_role: currentUser?.role,
          company_name: company?.name,
          business_field: company?.business_field,
          total_employees: company?.total_employees,
          assessment_data: assessment
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal analisis AI')
      
      const newProblems = data.map((d: any) => ({
        id: crypto.randomUUID(),
        assessment_id: assessment.id,
        company_id: companyId,
        title: d.title,
        description: d.description,
        pqcdsm_dimensions: [d.pqcdsm_dimension],
        urgency_indicator: d.urgency,
        sumber_jawaban: d.sumber_jawaban || [],
        status: 'pending'
      }))
      
      await saveAiIdentifiedProblems(newProblems)
      setAiProblems(prev => [...prev, ...newProblems])
      await showAlert('Analisis selesai! Menemukan ' + newProblems.length + ' masalah potensial.')
    } catch (err: any) {
      await showAlert(err.message)
    } finally {
      setAiAnalyzing(false)
    }
  }

  const handleApproveProblem = async (prob: AiIdentifiedProblem) => {
    const ok = await showConfirm('Buat proyek baru dari masalah ini?')
    if (!ok) return
    
    try {
      // Create new Project
      const newProj = await createProject({
        title: prob.title,
        description: prob.description,
        company_id: companyId,
        company_name: company?.name || '',
        consultant_id: currentUser?.id || 'unknown',
        status: 'define',
        start_date: new Date().toISOString().split('T')[0],
        target_end_date: new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0],
        baseline_score: 0,
        current_score: 0,
        dimensi_pqcdsm: prob.pqcdsm_dimensions?.[0] || undefined,
        urgency_indicator: prob.urgency_indicator || undefined,
      })
      
      // Create Draft Charter
      await saveProjectCharter({
        project_id: newProj.id,
        problem_statement: prob.description,
        objectives: '',
        productivity_target: '',
        scope: '',
        team_members: [],
        source: 'ai_generated',
        source_problem_id: prob.id
      })
      
      await updateAiIdentifiedProblemStatus(prob.id, 'approved', newProj.id, companyId)
      setAiProblems(prev => prev.map(p => p.id === prob.id ? { ...p, status: 'approved', project_id: newProj.id } : p))
      setProjects(prev => [...prev, newProj])
      
      router.push(`/projects/${newProj.id}/define`)
    } catch (error: any) {
      console.error('Failed to approve problem and create project:', error);
      await showAlert('Gagal membuat proyek: ' + (error.message || String(error)));
    }
  }

  const handleSaveEditProject = async (updates: Partial<Project>) => {
    if (!editingProject) return
    
    // Optimistic UI Update - langsung perbarui state agar UI terasa instan
    setProjects(prev => prev.map(p => p.id === editingProject.id ? { ...p, ...updates } : p))
    
    // Update ke database berjalan di background (tidak memblokir UI)
    updateProjectDetails(editingProject.id, updates).catch(e => console.error(e))
    saveProjectEditLog({
      project_id: editingProject.id,
      edited_by: currentUserId,
      edited_at: new Date().toISOString(),
      changes: updates
    }).catch(e => console.error(e))
  }

  const handleDeleteCompany = async () => {
    const confirmText = (company?.name || '').trim()
    const userInput = await showPrompt(
      `⚠️ PERINGATAN: Tindakan ini tidak dapat dibatalkan!\n\nSemua data perusahaan ini akan dihapus permanen, termasuk semua Proyek DMAIC, Baseline Assessment, Data PQCDSM, dan Fase Kesiapan.\n\nKetik nama perusahaan untuk konfirmasi:\n"${confirmText}"`,
      'Konfirmasi Hapus Perusahaan'
    )
    if (userInput === null) return
    if ((userInput || '').trim() !== confirmText) {
      await showAlert('Nama perusahaan tidak cocok. Penghapusan dibatalkan.')
      return
    }
    
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId)
      
      if (error) throw error
      
      await showAlert('Perusahaan berhasil dihapus.')
      router.push('/companies')
    } catch (err: any) {
      await showAlert('Gagal menghapus perusahaan: ' + (err.message || String(err)))
    }
  }

  if (!company) {
    return <div className="text-center py-20 text-slate-400 text-sm">Memuat profil perusahaan...</div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back link + actions */}
      <div className="flex items-center justify-between">
        <Link href="/companies" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Daftar Perusahaan
        </Link>
        {isKonsultan && (
          <button
            onClick={handleDeleteCompany}
            className="inline-flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:border-rose-500/40 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus Perusahaan
          </button>
        )}
      </div>

      {/* Header Profile Panel */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        
        {/* Company profile column */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xl">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-100">{company.name}</h1>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 text-indigo-400">
                {company.business_field || 'Umum'}
              </span>
            </div>
          </div>
          <div className="space-y-2 text-xs text-slate-400">
            <p>📍 <span className="text-slate-300 font-medium">{company.address || `${company.city}, ${company.province}`}</span></p>
            <p>👥 Tenaga Kerja: <span className="text-slate-300 font-semibold">{company.total_employees} Orang</span></p>
            {company.certifications && company.certifications.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Sertifikasi:</span>
                {company.certifications.map(c => (
                  <span key={c} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] font-medium text-slate-300">{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PIC Contact column */}
        <div className="bg-slate-950/60 border border-slate-900/60 rounded-2xl p-5 space-y-3.5 text-xs">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-500" /> Kontak PIC Utama
          </h3>
          {company.pic_name ? (
            <div className="space-y-2 text-slate-350">
              <p className="font-bold text-slate-200">{company.pic_name}</p>
              <p className="text-indigo-400 font-medium">{company.pic_position}</p>
              <div className="space-y-1 pt-1 text-slate-400">
                {company.pic_phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-600" /> {company.pic_phone}</p>}
                {company.pic_email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-600" /> {company.pic_email}</p>}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 italic">Belum ada data kontak PIC.</p>
          )}
        </div>
      </div>

      {/* Fase Kesiapan Card — hanya untuk tier simple */}
      {company?.tier === 'simple' && (
        <div className={`rounded-3xl border p-6 md:p-8 space-y-3 ${readinessGateOpen ? 'border-emerald-700/40 bg-emerald-950/10' : 'border-amber-800/40 bg-amber-950/10'}`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${readinessGateOpen ? 'text-emerald-300' : 'text-amber-300'}`}>
                <MapPin className="h-5 w-5" />
                Fase Kesiapan (Readiness Phase)
                {readinessGateOpen === true && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                    ✓ Gate Terbuka
                  </span>
                )}
                {readinessGateOpen === false && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400">
                    🔒 Belum Selesai
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {readinessGateOpen
                  ? 'Fase Kesiapan sudah disetujui Konsultan. Proyek formal DMAIC bisa dimulai.'
                  : 'Lengkapi dua modul ini sebelum memulai proyek formal DMAIC: Pemetaan Proses Bisnis dan Identifikasi Waste Cepat.'}
              </p>
            </div>
            <Link
              href={`/companies/${companyId}/readiness`}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white text-xs font-bold transition-colors ${readinessGateOpen ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-amber-600 hover:bg-amber-500'}`}
            >
              <MapPin className="h-4 w-4" />
              {readinessGateOpen ? 'Lihat Detail' : 'Buka Fase Kesiapan'}
            </Link>
          </div>
        </div>
      )}

      {/* §6.6 PRD — Tier Upgrade Recommendation Banner (hanya untuk konsultan) */}
      {isKonsultan && company?.tier_upgrade_recommended && (
        <div className="rounded-3xl border border-blue-700/40 bg-blue-950/10 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-300">Rekomendasi Upgrade Tier</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Berdasarkan data terbaru, perusahaan ini memenuhi kriteria tier{' '}
                <strong className="text-blue-300">{company.tier_recommended_value}</strong>.
                Tier saat ini: <strong>{company.tier}</strong>.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const ok = await showConfirm(
                  `Setujui upgrade tier perusahaan ini dari "${company.tier}" ke "${company.tier_recommended_value}"?`,
                  'Konfirmasi Upgrade Tier'
                )
                if (!ok) return
                try {
                  const { updateCompany } = await import('@/lib/db')
                  await updateCompany(companyId, {
                    tier: company.tier_recommended_value as any,
                    tier_source: 'manual',
                    tier_upgrade_recommended: false,
                    tier_upgrade_reviewed_by: currentUserId,
                    tier_upgrade_reviewed_at: new Date().toISOString(),
                  })
                  await showAlert(`Tier berhasil diupdate ke ${company.tier_recommended_value}.`)
                  window.location.reload()
                } catch (err: any) {
                  await showAlert('Gagal update tier: ' + err.message)
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
            >
              Setujui Upgrade
            </button>
            <button
              onClick={async () => {
                const ok = await showConfirm('Tolak rekomendasi upgrade tier ini?', 'Tolak Upgrade')
                if (!ok) return
                try {
                  const { updateCompany } = await import('@/lib/db')
                  await updateCompany(companyId, {
                    tier_upgrade_recommended: false,
                    tier_upgrade_reviewed_by: currentUserId,
                    tier_upgrade_reviewed_at: new Date().toISOString(),
                  })
                  window.location.reload()
                } catch (err: any) {
                  await showAlert('Gagal: ' + err.message)
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition-colors"
            >
              Tolak
            </button>
          </div>
        </div>
      )}

      {/* Onboarding & AI Panel */}
      <div className="rounded-3xl border border-slate-850 bg-slate-950/20 p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-850 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-200">Baseline Assessment (Onboarding)</h2>
            <p className="text-xs text-slate-500">
              {assessment?.status === 'submitted' || assessment?.status === 'locked' 
                ? 'Kuesioner profil awal perusahaan telah diisi.' 
                : 'Kuesioner belum lengkap.'}
            </p>
          </div>
          {(!isKonsultan) && (
            <Link 
              href={`/companies/${companyId}/onboarding`}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
            >
              <FileText className="h-4 w-4" /> Buka Kuesioner
            </Link>
          )}
          {(isKonsultan && assessment && (assessment.status === 'submitted' || assessment.status === 'locked')) && (
            <button 
              onClick={handleRunAi}
              disabled={aiAnalyzing}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-[0_0_15px_rgba(147,51,234,0.3)]"
            >
              <BrainCircuit className="h-4 w-4" /> {aiAnalyzing ? 'Menganalisis...' : 'Jalankan Analisa AI'}
            </button>
          )}
        </div>

        {isKonsultan && aiProblems.length > 0 && (() => {
          const PQCDSM_OPTIONS = [
            { key: 'productivity', label: 'Production', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
            { key: 'quality', label: 'Quality', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
            { key: 'cost', label: 'Cost', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
            { key: 'delivery', label: 'Delivery', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
            { key: 'safety', label: 'Safety', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
            { key: 'morale', label: 'Morale', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
          ]
          // Hanya tampilkan dimensi yang ada di data
          const activeDimensions = new Set(
            aiProblems.flatMap(p => p.pqcdsm_dimensions || [])
          )
          const filteredProblems = activeDimFilter
            ? aiProblems.filter(p => p.pqcdsm_dimensions?.includes(activeDimFilter))
            : aiProblems

          return (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-300">Rekomendasi AI (Kandidat Masalah)</h3>
                <span className="text-[10px] text-slate-500">{filteredProblems.length} dari {aiProblems.length} masalah</span>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveDimFilter(null)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                    activeDimFilter === null
                      ? 'bg-slate-200 text-slate-900 border-slate-200'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  Semua ({aiProblems.length})
                </button>
                {PQCDSM_OPTIONS.filter(opt => activeDimensions.has(opt.key)).map(opt => {
                  const count = aiProblems.filter(p => p.pqcdsm_dimensions?.includes(opt.key)).length
                  const isActive = activeDimFilter === opt.key
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setActiveDimFilter(isActive ? null : opt.key)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                        isActive
                          ? opt.color + ' border-current scale-105 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {opt.label} ({count})
                    </button>
                  )
                })}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProblems.map(prob => (
                  <div key={prob.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-200 text-sm">{prob.title}</h4>
                      {prob.status === 'approved' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Approved</span>
                      )}
                      {prob.status === 'pending' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">Menunggu Review</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-3">{prob.description}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">Dimensi: {prob.pqcdsm_dimensions?.join(', ') || '-'}</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${prob.urgency_indicator?.toLowerCase() === 'tinggi' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-300'}`}>
                        Urgensi: {prob.urgency_indicator}
                      </span>
                      {prob.sumber_jawaban && prob.sumber_jawaban.length > 0 && (
                        <span className="px-2 py-0.5 rounded border border-slate-700 text-slate-400 flex items-center gap-1" title={prob.sumber_jawaban.join(', ')}>
                          <FileText className="h-3 w-3" />
                          Sumber Jawaban
                        </span>
                      )}
                    </div>
                    {prob.status === 'pending' && (
                      <div className="pt-3 border-t border-slate-800 flex justify-end">
                        <button 
                          onClick={() => handleApproveProblem(prob)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Buat Proyek
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Projects List Panel */}
      <div className="rounded-3xl border border-slate-850 bg-slate-950/20 p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-850 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-200">Daftar Proyek Pendampingan</h2>
            <p className="text-xs text-slate-500">Seluruh proyek Smart Productive aktif dan selesai untuk perusahaan ini</p>
          </div>
          <button 
            onClick={async () => {
              // §6.3 PRD — Readiness Gate: blokir tier simple sampai gate terbuka
              if (company?.tier === 'simple' && readinessGateOpen === false) {
                await showAlert(
                  'Fase Kesiapan belum selesai.\n\nSelesaikan Modul Pemetaan Proses Bisnis dan Identifikasi Waste Cepat, lalu dapatkan persetujuan Konsultan sebelum memulai proyek baru.',
                  'Readiness Gate Belum Terbuka'
                )
                return
              }
              setShowNewProjectModal(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer transform hover:-translate-y-0.5"
            style={{background: 'linear-gradient(135deg, #b8860b, #d4a017, #f4c430)', color: 'var(--navy-950)', boxShadow: '0 6px 20px rgba(212,160,23,0.15)'}}
          >
            <Plus className="h-3.5 w-3.5" />
            Mulai Proyek Baru
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl">
            Belum ada proyek terdaftar untuk perusahaan ini. Klik &quot;Mulai Proyek Baru&quot; di atas.
          </div>
        ) : (() => {
          const PROJ_DIM_OPTIONS = [
            { key: 'productivity', label: 'Production', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
            { key: 'quality', label: 'Quality', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
            { key: 'cost', label: 'Cost', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
            { key: 'delivery', label: 'Delivery', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30', dot: 'bg-sky-400' },
            { key: 'safety', label: 'Safety', color: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-400' },
            { key: 'morale', label: 'Morale', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
          ]

          // Fungsi resolve dimensi: prioritaskan dari AI Recommendation → fallback ke field project → deteksi otomatis teks → 'lainnya'
          const getProjectDim = (proj: typeof projects[0]): string => {
            const fromAI = aiProblems.find(ap => ap.project_id === proj.id)
            if (fromAI?.pqcdsm_dimensions?.[0]) return fromAI.pqcdsm_dimensions[0].toLowerCase()
            if (proj.dimensi_pqcdsm) return proj.dimensi_pqcdsm.toLowerCase()
            
            // Deteksi otomatis jika dimensi kosong (terutama untuk data lama)
            return inferPQCDSMDimension(proj.title, proj.description)
          }

          const activeProjDimensions = new Set(projects.map(p => getProjectDim(p)).filter(d => d !== 'lainnya'))
          const filteredProjects = activeProjDimFilter
            ? projects.filter(p => getProjectDim(p) === activeProjDimFilter)
            : projects

          // Kelompokkan proyek yang difilter berdasarkan dimensi
          const grouped: Record<string, typeof projects> = {}
          filteredProjects.forEach(p => {
            const dim = getProjectDim(p)
            if (!grouped[dim]) grouped[dim] = []
            grouped[dim].push(p)
          })
          const groupKeys = Object.keys(grouped)


          const ProjectCard = ({ proj }: { proj: typeof projects[0] }) => {
            const statusInfo = PROJECT_STATUS_LABELS[proj.status] || { label: proj.status, color: 'bg-slate-550' }
            return (
              <div className="glass-card rounded-2xl border border-slate-800/60 bg-slate-950/35 p-5 flex flex-col justify-between hover:border-slate-700 transition-all group hover:-translate-y-0.5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-indigo-400">{proj.project_code}</span>
                      {isKonsultan && (
                        <button onClick={() => setEditingProject(proj)} className="p-1 rounded bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-indigo-400 transition-colors" title="Edit Proyek">
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{proj.title}</h3>
                    <p className="text-xs text-slate-450 line-clamp-2 leading-relaxed">{proj.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-850 text-xs text-slate-400">
                    <div>
                      <span>Mulai</span>
                      <p className="font-semibold text-slate-300 mt-0.5">{proj.start_date}</p>
                    </div>
                    <div>
                      <span>Selesai</span>
                      <p className="font-semibold text-slate-300 mt-0.5">{proj.target_end_date}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 pt-3.5 border-t border-slate-850 flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-400">
                    Index: <span className="text-emerald-400 font-bold">{proj.current_score || 0}%</span>
                  </div>
                  <Link href={`/projects/${proj.id}/define`} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                    Kelola DMAIC <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            )
          }

          return (
            <div className="space-y-5">
              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveProjDimFilter(null)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                    activeProjDimFilter === null
                      ? 'bg-slate-200 text-slate-900 border-slate-200'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  Semua ({projects.length})
                </button>
                {PROJ_DIM_OPTIONS.filter(opt => activeProjDimensions.has(opt.key)).map(opt => {
                  const count = projects.filter(p => getProjectDim(p) === opt.key).length
                  const isActive = activeProjDimFilter === opt.key
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setActiveProjDimFilter(isActive ? null : opt.key)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                        isActive
                          ? opt.color + ' border-current scale-105 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {opt.label} ({count})
                    </button>
                  )
                })}
                {/* Proyek tanpa dimensi (tidak bisa diidentifikasi dari AI maupun field) */}
                {projects.some(p => getProjectDim(p) === 'lainnya') && (
                  <button
                    onClick={() => setActiveProjDimFilter(activeProjDimFilter === 'lainnya' ? null : 'lainnya')}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                      activeProjDimFilter === 'lainnya'
                        ? 'bg-slate-500/20 text-slate-300 border-slate-400 scale-105'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    Lainnya ({projects.filter(p => getProjectDim(p) === 'lainnya').length})
                  </button>
                )}
              </div>

              {/* Grouped by dimension */}
              {activeProjDimFilter ? (
                // Mode filter aktif — flat grid
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredProjects.map(proj => <ProjectCard key={proj.id} proj={proj} />)}
                </div>
              ) : (
                // Mode "Semua" — tampilkan per grup dimensi
                <div className="space-y-6">
                  {groupKeys.map(dim => {
                    const dimConfig = PROJ_DIM_OPTIONS.find(o => o.key === dim)
                    return (
                      <div key={dim}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`w-2 h-2 rounded-full ${dimConfig?.dot || 'bg-slate-500'}`} />
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {dimConfig?.label || 'Lainnya'}
                          </span>
                          <span className="text-[10px] text-slate-600">({grouped[dim].length} proyek)</span>
                          <div className="flex-1 h-px bg-slate-800/60" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {grouped[dim].map(proj => <ProjectCard key={proj.id} proj={proj} />)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}
      </div>


      {showNewProjectModal && company && (
        <CreateProjectModal
          companies={[]}
          currentUser={currentUser}
          currentUserId={currentUserId}
          fixedCompanyId={company.id}
          fixedCompanyName={company.name}
          readinessGateOpen={readinessGateOpen}
          onCreated={(proj) => setProjects(prev => [...prev, proj])}
          onClose={() => setShowNewProjectModal(false)}
        />
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={handleSaveEditProject}
        />
      )}
    </div>
  )
}
