'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Project, ActionPlan, ConsultantControlNote } from '@/lib/mockData'
import {
  AlertTriangle, CheckCircle2, ShieldAlert, FileCheck, Save,
  Check, ArrowRight, Plus, Trash2, DollarSign, TrendingUp,
  Edit3, MessageSquare, Send, Lock,
} from 'lucide-react'
import {
  updateProjectPhase, getProjects, getActionPlans,
  getControlAudit, saveControlAudit,
  getControlPsi, saveControlPsi,
  getConsultantNotes, saveConsultantNote, deleteConsultantNote,
} from '@/lib/db'
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useUserRole } from '@/hooks/useUserRole'

export default function ControlPage() {
  const router    = useRouter()
  const params    = useParams()
  const projectId = params.id as string

  const { userInfo } = useUserRole()
  const isKonsultan  = (userInfo?.role ?? 'perusahaan').toLowerCase() !== 'perusahaan'

  /* ── core ── */
  const [project,     setProject]     = useState<Project | null>(null)
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([])
  const [activeTab,   setActiveTab]   = useState<'kpi' | 'audit' | 'sustainability'>('kpi')
  const [saveMsg,     setSaveMsg]     = useState<string | null>(null)

  /* ── KPI: economic impact inline edit ── */
  const [editingEconId,  setEditingEconId]  = useState<string | null>(null)
  const [editCostSaving, setEditCostSaving] = useState(0)
  const [editInvestment, setEditInvestment] = useState(0)

  /* ── KPI: catatan konsultan ── */
  const [notes,       setNotes]       = useState<ConsultantControlNote[]>([])
  const [noteText,    setNoteText]    = useState('')
  const [noteType,    setNoteType]    = useState<ConsultantControlNote['note_type']>('general')
  const [noteActionId,setNoteActionId]= useState<string>('')
  const [noteSaving,  setNoteSaving]  = useState(false)

  /* ── Audit ── */
  const [auditItems,      setAuditItems]      = useState<any[]>([])
  const [newAuditTask,    setNewAuditTask]     = useState('')
  const [newAuditCategory,setNewAuditCategory]= useState('Production')

  /* ── PSI ── */
  const [peopleScore,  setPeopleScore]  = useState(70)
  const [processScore, setProcessScore] = useState(65)
  const [systemScore,  setSystemScore]  = useState(60)
  const [resultScore,  setResultScore]  = useState(75)

  /* ── load ── */
  useEffect(() => {
    async function loadData() {
      const [projects, actions] = await Promise.all([getProjects(), getActionPlans(projectId)])
      const proj = projects.find((p: Project) => p.id === projectId)
      if (!proj) { router.push('/dashboard'); return }
      setProject(proj)
      setActionPlans(actions)

      /* audit */
      const auditData = await getControlAudit(projectId)
      let finalAudit: any[] = []
      
      if (actions && actions.length > 0) {
        const generatedAudit = actions.map((act: any) => {
          const actId = `aud-act-${act.id}`
          const existing = auditData?.find((a: any) => a.id === actId)
          return {
            id: actId,
            category: act.dimension || 'General',
            task: `Permasalahan: ${act.title || '-'} | Metode: ${act.methodology || '-'}`,
            completed: existing ? existing.completed : false
          }
        })
        
        const manualItems = (auditData || []).filter((a: any) => 
          !a.id.startsWith('aud-act-') && 
          !a.id.startsWith('aud-gen-') && 
          !['aud-1','aud-2','aud-3','aud-4'].includes(a.id)
        )
        
        finalAudit = [...generatedAudit, ...manualItems]
        setAuditItems(finalAudit)
        saveControlAudit(projectId, finalAudit).catch(console.error)
      } else if (auditData && auditData.length > 0) {
        finalAudit = auditData
        setAuditItems(finalAudit)
      } else {
        finalAudit = [
          { id: 'aud-1', category: 'Production', task: 'SOP proses produksi dipasang dan dipatuhi di lapangan',       completed: false },
          { id: 'aud-2', category: 'Quality',    task: 'Sistem inspeksi mutu (inline/final) berjalan rutin',           completed: false },
          { id: 'aud-3', category: 'Safety',     task: 'APD tersedia dan digunakan seluruh operator',                  completed: false },
          { id: 'aud-4', category: 'Morale',     task: 'Program pelatihan dan reward karyawan berjalan',               completed: false },
        ]
        setAuditItems(finalAudit)
        saveControlAudit(projectId, finalAudit).catch(console.error)
      }

      /* PSI */
      const psi = await getControlPsi(projectId)
      if (psi) {
        setPeopleScore(psi.people); setProcessScore(psi.process)
        setSystemScore(psi.system); setResultScore(psi.result)
      }

      /* catatan konsultan */
      const savedNotes = await getConsultantNotes(projectId)
      setNotes(savedNotes)
    }
    loadData()
  }, [projectId, router])

  const showSave = (msg: string) => { setSaveMsg(msg); setTimeout(() => setSaveMsg(null), 3000) }

  /* ── audit handlers — hanya konsultan ── */
  const handleToggleAudit = (id: string) => {
    if (!isKonsultan) return
    const updated = auditItems.map(item => item.id === id ? { ...item, completed: !item.completed } : item)
    setAuditItems(updated)
    saveControlAudit(projectId, updated).catch(console.error)
  }
  const handleAddAudit = () => {
    if (!isKonsultan || !newAuditTask.trim()) return
    const item = { id: 'aud-' + Math.random().toString(36).substr(2,9), category: newAuditCategory, task: newAuditTask.trim(), completed: false }
    const updated = [...auditItems, item]
    setAuditItems(updated)
    saveControlAudit(projectId, updated).catch(console.error)
    setNewAuditTask('')
  }
  const handleDeleteAudit = (id: string) => {
    if (!isKonsultan) return
    if (!window.confirm('Hapus item checklist ini?')) return
    const updated = auditItems.filter(item => item.id !== id)
    setAuditItems(updated)
    saveControlAudit(projectId, updated).catch(console.error)
  }

  /* ── PSI handler — hanya konsultan ── */
  const handleSavePSI = async () => {
    if (!isKonsultan) return
    const psiObj = { people: peopleScore, process: processScore, system: systemScore, result: resultScore }
    await saveControlPsi(projectId, psiObj)
    showSave('Productivity Sustainability Index (PSI) berhasil direkam!')
  }

  /* ── economic impact inline edit — hanya konsultan ── */
  const handleSaveEconEdit = async (actionId: string) => {
    const updated = actionPlans.map(act =>
      act.id === actionId ? { ...act, cost_saving_manual: editCostSaving, investment_manual: editInvestment } : act
    )
    setActionPlans(updated)
    try {
      const { saveActionPlans } = await import('@/lib/db')
      await saveActionPlans(projectId, updated)
    } catch (err) { console.warn('[handleSaveEconEdit] fallback local only') }
    setEditingEconId(null)
    showSave('Data dampak ekonomi berhasil disimpan!')
  }

  /* ── catatan konsultan handlers ── */
  const handleAddNote = async () => {
    if (!noteText.trim() || !isKonsultan) return
    setNoteSaving(true)
    const localUser = localStorage.getItem('sibimkon_user')
    const actor     = localUser ? JSON.parse(localUser) : null
    const newNote = await saveConsultantNote(projectId, {
      project_id: projectId,
      action_plan_id: noteActionId || undefined,
      note_text: noteText.trim(),
      note_type: noteType,
      is_visible_to_company: true,
      created_by: actor?.id,
      created_by_name: actor?.full_name ?? 'Konsultan',
    })
    setNotes(prev => [newNote, ...prev])
    setNoteText('')
    setNoteSaving(false)
    showSave('Catatan berhasil ditambahkan!')
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!isKonsultan || !window.confirm('Hapus catatan ini?')) return
    await deleteConsultantNote(projectId, noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  /* ── advance ── */
  const handleCompleteProject = async () => {
    await updateProjectPhase(projectId, 'completed')
    router.push(`/projects/${projectId}/reports`)
  }

  if (!project) return null

  const psiTotal = Math.round((peopleScore + processScore + systemScore + resultScore) / 4)

  const kpiData = actionPlans.map(act => ({
    name:    act.title.substring(0, 15) + '...',
    Baseline: act.kpi_baseline,
    Target:   act.kpi_target,
    Aktual:   act.verified_kpi_actual ?? act.kpi_actual ?? 0,
  }))

  const earlyWarnings = actionPlans.filter(act => {
    const actual = act.verified_kpi_actual ?? act.kpi_actual
    if (actual === undefined) return false
    return act.kpi_target > act.kpi_baseline
      ? actual < act.kpi_baseline
      : actual > act.kpi_baseline
  })

  const categories = Array.from(new Set(auditItems.map(i => i.category)))
  const categoryCompliance = categories.map(cat => {
    const items     = auditItems.filter(i => i.category === cat)
    const completed = items.filter(i => i.completed).length
    return { category: cat, percentage: Math.round((completed / items.length) * 100) || 0, completed, total: items.length }
  })

  const NOTE_TYPE_LABELS: Record<ConsultantControlNote['note_type'], { label: string; cls: string }> = {
    general:        { label: 'Umum',           cls: 'bg-slate-500/10 border-slate-500/30 text-slate-400' },
    kpi_comment:    { label: 'Komentar KPI',    cls: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' },
    warning:        { label: 'Peringatan',      cls: 'bg-red-500/10 border-red-500/30 text-red-400' },
    recommendation: { label: 'Rekomendasi',     cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fase CONTROL: KPI Dashboard, Audit Kepatuhan, dan Sustainability Index</p>
        </div>
      </div>

      {/* ── Save toast ── */}
      {saveMsg && (
        <div className="px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-sm text-emerald-400">
          ✅ {saveMsg}
        </div>
      )}

      {/* ── Phase banner ── */}
      <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 phase-banner">
        <div>
          <p className="text-xs font-semibold text-indigo-300">Fase Saat Ini: <span className="uppercase font-black">CONTROL</span></p>
          <p className="text-[10px] text-slate-500 mt-0.5">Simpan PSI, lalu selesaikan proyek dan cetak laporan akhir.</p>
        </div>
        <button onClick={handleCompleteProject}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl text-white cursor-pointer">
          Selesaikan &amp; Buka Laporan <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b border-slate-800 overflow-x-auto pb-1">
        {[
          { id: 'kpi',          name: 'KPI Dashboard & Catatan' },
          { id: 'audit',        name: 'Productivity Audit' },
          { id: 'sustainability', name: 'Sustainability Index (PSI)' },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id ? 'bg-amber-50 text-amber-800' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            style={activeTab === tab.id ? { borderBottomColor: 'var(--gold-400,#d97706)', borderBottomWidth: '2px' } : {}}>
            {tab.name}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 md:p-8">


        {/* ══ TAB 1: KPI DASHBOARD & CATATAN KONSULTAN ══ */}
        {activeTab === 'kpi' && (
          <div className="space-y-8">

            {/* ── KPI Chart ── */}
            <div className="space-y-4">
              <div className="border-b border-slate-850 pb-4">
                <h2 className="text-lg font-bold text-slate-200">Perbandingan Titik KPI</h2>
                <p className="text-xs text-slate-500">Baseline vs Target vs Nilai Aktual Terverifikasi</p>
              </div>

              {earlyWarnings.length > 0 && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 text-xs text-red-400">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <div className="space-y-1">
                    <span className="font-bold">Early Warning Alert!</span>
                    <p className="text-slate-300">Terdeteksi degradasi performa:</p>
                    <ul className="list-disc pl-4 space-y-1 mt-1">
                      {earlyWarnings.map(w => (
                        <li key={w.id}>{w.title}: Aktual ({w.verified_kpi_actual ?? w.kpi_actual}) meleset dari baseline ({w.kpi_baseline})</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {kpiData.length === 0
                ? <p className="text-center py-6 text-xs text-slate-500">Belum ada data KPI dari action plan.</p>
                : (
                  <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-3xl h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={kpiData}>
                        <defs>
                          <linearGradient id="baseBarGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#475569" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#334155" stopOpacity={0.2} />
                          </linearGradient>
                          <linearGradient id="targetBarGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill:'#94a3b8', fontSize:9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor:'rgba(15, 23, 42, 0.95)', borderColor:'#6366f1', borderRadius:12, backdropFilter: 'blur(8px)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                        />
                        <Legend wrapperStyle={{ fontSize:11, paddingTop: 8 }} />
                        <Bar dataKey="Baseline" fill="url(#baseBarGrad)" stroke="#475569" strokeWidth={1} radius={[4,4,0,0]} animationDuration={1000} />
                        <Bar dataKey="Target" fill="url(#targetBarGrad)" stroke="#6366f1" strokeWidth={1} radius={[4,4,0,0]} animationDuration={1200} />
                        <Line type="monotone" dataKey="Aktual" stroke="#10b981" strokeWidth={3} dot={{ r:5, fill:'#10b981', strokeWidth: 2, stroke: '#0f172a' }} activeDot={{ r: 7 }} animationDuration={1500} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )
              }
            </div>

            {/* ── Dampak Ekonomi (konsultan only edit) ── */}
            {actionPlans.length > 0 && (() => {
              const totalSaving    = actionPlans.reduce((a, act) => a + (act.cost_saving_manual ?? 0), 0)
              const totalInvestment= actionPlans.reduce((a, act) => a + (act.investment_manual  ?? 0), 0)
              const roiTotal       = totalInvestment > 0 ? totalSaving / totalInvestment : 0
              const hasManual      = actionPlans.some(a => (a.cost_saving_manual ?? 0) > 0 || (a.investment_manual ?? 0) > 0)
              return (
                <div className="space-y-4 border-t border-slate-850 pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2"><DollarSign className="h-4 w-4 text-amber-400" /> Dampak Ekonomi &amp; ROI per Program</h3>
                      {!isKonsultan && <p className="text-[10px] text-amber-400/70 mt-0.5 flex items-center gap-1"><Lock className="h-3 w-3" /> Input nilai dikelola oleh konsultan</p>}
                    </div>
                    {hasManual && (
                      <div className="text-right bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total ROI</span>
                        <span className="text-lg font-black text-amber-400">{roiTotal > 0 ? `${roiTotal.toFixed(1)}× Lipat` : '—'}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Saving: Rp {totalSaving.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {actionPlans.map(act => (
                      <div key={act.id} className="bg-slate-950/50 border border-slate-850 rounded-2xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-200 truncate">{act.title}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">KPI: {act.kpi_baseline} → {act.kpi_target} {act.kpi_unit}
                              {(act.verified_kpi_actual ?? act.kpi_actual) !== undefined && (
                                <span className="text-emerald-400 ml-2">Aktual: {act.verified_kpi_actual ?? act.kpi_actual}</span>
                              )}
                            </p>
                          </div>
                          {isKonsultan && editingEconId !== act.id && (
                            <button onClick={() => { setEditingEconId(act.id); setEditCostSaving(act.cost_saving_manual ?? 0); setEditInvestment(act.investment_manual ?? 0) }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold rounded-lg text-indigo-400 cursor-pointer">
                              <Edit3 className="h-3 w-3" /> Edit
                            </button>
                          )}
                        </div>
                        {isKonsultan && editingEconId === act.id ? (
                          <div className="mt-3 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Cost Saving (Rp)</label>
                                <input type="number" min="0" value={editCostSaving || ''} onChange={(e) => setEditCostSaving(Number(e.target.value))}
                                  placeholder="Misal: 15000000" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250 focus:outline-none" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Investasi (Rp)</label>
                                <input type="number" min="0" value={editInvestment || ''} onChange={(e) => setEditInvestment(Number(e.target.value))}
                                  placeholder="Misal: 3500000" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250 focus:outline-none" />
                              </div>
                            </div>
                            {editCostSaving > 0 && editInvestment > 0 && (
                              <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5 flex justify-between">
                                <span>ROI program ini:</span>
                                <span className="font-black">{(editCostSaving / editInvestment).toFixed(1)}× Lipat</span>
                              </div>
                            )}
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditingEconId(null)} className="px-3 py-1.5 text-[10px] text-slate-400 cursor-pointer">Batal</button>
                              <button onClick={() => handleSaveEconEdit(act.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold rounded-lg text-white cursor-pointer">
                                <Save className="h-3 w-3" /> Simpan
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 flex gap-4 text-[10px]">
                            <span className="text-slate-500">Cost Saving: {act.cost_saving_manual ? <span className="text-emerald-400 font-semibold">Rp {act.cost_saving_manual.toLocaleString('id-ID')}</span> : <span className="text-slate-700 italic">Belum diinput</span>}</span>
                            <span className="text-slate-500">Investasi: {act.investment_manual ? <span className="text-slate-300 font-semibold">Rp {act.investment_manual.toLocaleString('id-ID')}</span> : <span className="text-slate-700 italic">Belum diinput</span>}</span>
                            {act.cost_saving_manual && act.investment_manual && (
                              <span className="text-amber-400 font-bold">ROI: {(act.cost_saving_manual / act.investment_manual).toFixed(1)}×</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* ── CATATAN KONSULTAN ── */}
            <div className="space-y-4 border-t border-slate-850 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-indigo-400" /> Catatan Konsultan</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Catatan, rekomendasi, atau peringatan dari konsultan untuk perusahaan</p>
                </div>
              </div>

              {/* form input — hanya konsultan */}
              {isKonsultan && (
                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Catatan</label>
                      <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2} placeholder="Tulis catatan, rekomendasi, atau peringatan untuk perusahaan..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-250 focus:outline-none resize-none" />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tipe Catatan</label>
                        <select value={noteType} onChange={(e) => setNoteType(e.target.value as ConsultantControlNote['note_type'])}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none">
                          <option value="general">Umum</option>
                          <option value="kpi_comment">Komentar KPI</option>
                          <option value="warning">Peringatan</option>
                          <option value="recommendation">Rekomendasi</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Terkait Program (opsional)</label>
                        <select value={noteActionId} onChange={(e) => setNoteActionId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none">
                          <option value="">— Umum / keseluruhan proyek —</option>
                          {actionPlans.map(a => <option key={a.id} value={a.id}>{a.title.substring(0,40)}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={handleAddNote} disabled={!noteText.trim() || noteSaving}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white cursor-pointer disabled:opacity-50">
                      <Send className="h-3.5 w-3.5" />
                      {noteSaving ? 'Menyimpan...' : 'Tambah Catatan'}
                    </button>
                  </div>
                </div>
              )}

              {/* daftar catatan — visible semua role */}
              {notes.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-slate-800 rounded-2xl text-xs text-slate-600">
                  {isKonsultan ? 'Belum ada catatan. Tambahkan catatan untuk perusahaan di atas.' : 'Belum ada catatan dari konsultan untuk proyek ini.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map(note => {
                    const badge     = NOTE_TYPE_LABELS[note.note_type]
                    const relAction = note.action_plan_id ? actionPlans.find(a => a.id === note.action_plan_id) : null
                    return (
                      <div key={note.id} className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-2 group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
                            {relAction && <span className="text-[9px] text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">Re: {relAction.title.substring(0,30)}...</span>}
                            <span className="text-[9px] text-slate-600">{note.created_by_name ?? 'Konsultan'} · {new Date(note.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}</span>
                          </div>
                          {isKonsultan && (
                            <button onClick={() => handleDeleteNote(note.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 p-1 rounded cursor-pointer transition-all">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{note.note_text}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )}


        {/* ══ TAB 2: PRODUCTIVITY AUDIT ══ */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="border-b border-slate-850 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-200">Audit Kepatuhan Implementasi</h2>
                <p className="text-xs text-slate-500">Periksa kepatuhan standardisasi di lapangan pasca perbaikan</p>
              </div>
              {/* perusahaan: badge read-only */}
              {!isKonsultan && (
                <span className="inline-flex items-center gap-1.5 text-[10px] text-amber-400/70 bg-amber-400/5 border border-amber-400/15 rounded-lg px-2.5 py-1.5">
                  <Lock className="h-3 w-3" /> Hanya bisa dilihat
                </span>
              )}
            </div>

            {/* form tambah — konsultan only */}
            {isKonsultan && (
              <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tambah Item Checklist</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select value={newAuditCategory} onChange={(e) => setNewAuditCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none w-full sm:w-40 shrink-0">
                    {['Production','Quality','Cost','Safety','Morale','Delivery','Lainnya'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="text" value={newAuditTask} onChange={(e) => setNewAuditTask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAudit()}
                    placeholder="Deskripsi item audit... (Enter untuk simpan)"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-250 focus:outline-none" />
                  <button onClick={handleAddAudit}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white cursor-pointer shrink-0">
                    <Plus className="h-3.5 w-3.5" /> Tambah
                  </button>
                </div>
              </div>
            )}

            {/* statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Kepatuhan Total</span>
                  <span className="text-2xl font-black text-white mt-1 block">
                    {Math.round((auditItems.filter(i => i.completed).length / (auditItems.length || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all"
                    style={{ width:`${(auditItems.filter(i => i.completed).length / (auditItems.length || 1)) * 100}%` }} />
                </div>
              </div>
              {categoryCompliance.map((catInfo, idx) => (
                <div key={idx} className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{catInfo.category}</span>
                    <span className="text-xl font-bold text-slate-200 mt-1 block">{catInfo.percentage}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                    <span>{catInfo.completed}/{catInfo.total}</span>
                    <div className="w-16 bg-slate-900 h-1 rounded-full overflow-hidden ml-2">
                      <div className="bg-emerald-500 h-full transition-all" style={{ width:`${catInfo.percentage}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* checklist items */}
            {auditItems.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
                Belum ada item checklist.
              </div>
            ) : (
              <div className="space-y-2">
                {auditItems.map(item => (
                  <div key={item.id}
                    className={`flex items-center justify-between p-4 bg-slate-950/40 border border-slate-850 rounded-2xl transition-colors group ${isKonsultan ? 'hover:bg-slate-900/40' : ''}`}>
                    <div
                      className={`flex items-center gap-3 flex-1 ${isKonsultan ? 'cursor-pointer' : 'cursor-default'}`}
                      onClick={() => isKonsultan && handleToggleAudit(item.id)}
                    >
                      <div className={`h-5 w-5 rounded border flex items-center justify-center transition-all shrink-0 ${
                        item.completed ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700'
                      } ${!isKonsultan ? 'opacity-70' : ''}`}>
                        {item.completed && <Check className="h-3 w-3" />}
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-400">{item.category}</span>
                        <p className={`text-sm font-semibold mt-1 ${item.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.task}</p>
                      </div>
                    </div>
                    {/* hapus — konsultan only */}
                    {isKonsultan && (
                      <button onClick={() => handleDeleteAudit(item.id)}
                        className="ml-3 text-slate-700 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ TAB 3: SUSTAINABILITY INDEX (PSI) ══ */}
        {activeTab === 'sustainability' && (
          <div className="space-y-6">
            <div className="border-b border-slate-850 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-200">Productivity Sustainability Index (PSI)</h2>
                <p className="text-xs text-slate-500">Kalkulasi indeks keberlanjutan program peningkatan produktivitas</p>
              </div>
              <div className="flex items-center gap-3">
                {/* perusahaan: badge read-only */}
                {!isKonsultan && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-amber-400/70 bg-amber-400/5 border border-amber-400/15 rounded-lg px-2.5 py-1.5">
                    <Lock className="h-3 w-3" /> Hanya bisa dilihat
                  </span>
                )}
                <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Total PSI Score</span>
                  <span className="text-xl font-bold text-indigo-400">{psiTotal}%</span>
                </div>
              </div>
            </div>

            {/* dimensi PSI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'People — Keterlibatan SDM & Organisasi',    val: peopleScore,  set: setPeopleScore },
                { label: 'Process — Kematangan SOP & Kontrol Lini',   val: processScore, set: setProcessScore },
                { label: 'System — Ketersediaan Platform & Dokumentasi', val: systemScore,  set: setSystemScore },
                { label: 'Result — Dampak Finansial & Output Aktual',  val: resultScore,  set: setResultScore },
              ].map((dim, idx) => (
                <div key={idx} className="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                    <span>{dim.label}</span>
                    <span className="text-indigo-400">{dim.val}%</span>
                  </div>
                  {isKonsultan ? (
                    <input type="range" min="0" max="100" value={dim.val} onChange={(e) => dim.set(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                  ) : (
                    /* perusahaan: progress bar static */
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full transition-all" style={{ width:`${dim.val}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* tombol simpan — konsultan only */}
            <div className="pt-4 flex justify-end border-t border-slate-850">
              {isKonsultan ? (
                <button onClick={handleSavePSI}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-sm font-bold rounded-xl text-white cursor-pointer shadow-md">
                  <Save className="h-4 w-4" /> Simpan PSI
                </button>
              ) : (
                <span className="text-xs text-slate-500 italic">Nilai PSI ditetapkan oleh konsultan berdasarkan evaluasi program.</span>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
