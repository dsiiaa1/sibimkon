'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCompanies, getProjects, getCompanyBaselineAssessment, getAiIdentifiedProblems, saveAiIdentifiedProblems, updateAiIdentifiedProblemStatus, createProject, saveProjectCharter, updateProjectDetails, saveProjectEditLog } from '@/lib/db'
import { Company, Project, CompanyBaselineAssessment, AiIdentifiedProblem } from '@/lib/mockData'
import { Building, ArrowLeft, Plus, User, Phone, Mail, ArrowRight, BrainCircuit, FileText, CheckCircle2, Pencil, X } from 'lucide-react'
import { PROJECT_STATUS_LABELS } from '@/lib/utils'
import CreateProjectModal from '@/components/CreateProjectModal'

function EditProjectModal({ project, onClose, onSave }: { project: Project, onClose: () => void, onSave: (p: Partial<Project>) => void }) {
  const [title, setTitle] = useState(project.title)
  const [desc, setDesc] = useState(project.description)
  const [startDate, setStartDate] = useState(project.start_date)
  const [endDate, setEndDate] = useState(project.target_end_date)
  const [saving, setSaving] = useState(false)
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (startDate !== project.start_date || endDate !== project.target_end_date) {
      if (!confirm('Anda mengubah jadwal proyek. Apakah Anda yakin?')) return
    }
    setSaving(true)
    await onSave({ title, description: desc, start_date: startDate, target_end_date: endDate })
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
      
      const newProblems = data.map((d: any, i: number) => ({
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
      alert('Analisis selesai! Menemukan ' + newProblems.length + ' masalah potensial.')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAiAnalyzing(false)
    }
  }

  const handleApproveProblem = async (prob: AiIdentifiedProblem) => {
    if (!confirm('Buat proyek baru dari masalah ini?')) return
    
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
      current_score: 0
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
  }

  const handleSaveEditProject = async (updates: Partial<Project>) => {
    if (!editingProject) return
    await updateProjectDetails(editingProject.id, updates)
    await saveProjectEditLog({
      project_id: editingProject.id,
      edited_by: currentUserId,
      edited_at: new Date().toISOString(),
      changes: updates
    })
    setProjects(prev => prev.map(p => p.id === editingProject.id ? { ...p, ...updates } : p))
  }

  if (!company) {
    return <div className="text-center py-20 text-slate-400 text-sm">Memuat profil perusahaan...</div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back link */}
      <div>
        <Link href="/companies" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Daftar Perusahaan
        </Link>
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
            { key: 'productivity', label: 'Productivity', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
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
            onClick={() => setShowNewProjectModal(true)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer transform hover:-translate-y-0.5"
            style={{background: 'linear-gradient(135deg, #b8860b, #d4a017, #f4c430)', color: 'var(--navy-950)', boxShadow: '0 6px 20px rgba(212,160,23,0.15)'}}
          >
            <Plus className="h-3.5 w-3.5" />
            Mulai Proyek Baru
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl">
            Belum ada proyek terdaftar untuk perusahaan ini. Klik "Mulai Proyek Baru" di atas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map(proj => {
              const statusInfo = PROJECT_STATUS_LABELS[proj.status] || { label: proj.status, color: 'bg-slate-550' }
              return (
                <div key={proj.id} className="glass-card rounded-2xl border border-slate-800/60 bg-slate-950/35 p-5 flex flex-col justify-between hover:border-slate-700 transition-all group hover:-translate-y-0.5">
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
            })}
          </div>
        )}
      </div>

      {showNewProjectModal && company && (
        <CreateProjectModal
          companies={[]}
          currentUser={currentUser}
          currentUserId={currentUserId}
          fixedCompanyId={company.id}
          fixedCompanyName={company.name}
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
