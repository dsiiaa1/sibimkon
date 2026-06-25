'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Project, ActionPlan } from '@/lib/mockData'
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  FileCheck,
  Save,
  Check,
  ArrowRight,
  Plus,
  Trash2,
} from 'lucide-react'
import { updateProjectPhase, getProjects, getActionPlans, getControlAudit, saveControlAudit, getControlPsi, saveControlPsi } from '@/lib/db'
import { 
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

export default function ControlPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([])
  const [activeTab, setActiveTab] = useState<'kpi' | 'audit' | 'sustainability'>('kpi')
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Audit Checklist state
  const [auditItems, setAuditItems] = useState<any[]>([])
  const [newAuditTask, setNewAuditTask] = useState('')
  const [newAuditCategory, setNewAuditCategory] = useState('Production')

  // Sustainability Index (PSI) state
  const [peopleScore, setPeopleScore] = useState(70)
  const [processScore, setProcessScore] = useState(65)
  const [systemScore, setSystemScore] = useState(60)
  const [resultScore, setResultScore] = useState(75)

  useEffect(() => {
    async function loadData() {
      const [projects, actions] = await Promise.all([
        getProjects(),
        getActionPlans(projectId)
      ])
      const proj = projects.find((p: Project) => p.id === projectId)
      if (!proj) {
        router.push('/dashboard')
        return
      }
      setProject(proj)
      setActionPlans(actions)
    }
    loadData()

    // Load audit checklist dari Supabase (fallback localStorage)
    getControlAudit(projectId).then((items) => {
      if (items && items.length > 0) {
        setAuditItems(items)
      } else {
        const savedAudit = localStorage.getItem(`sibimkon_audit_${projectId}`)
        if (savedAudit) {
          setAuditItems(JSON.parse(savedAudit))
        } else {
          const defaultAudit = [
            { id: 'aud-1', category: 'Production', task: 'SOP proses produksi dipasang dan dipatuhi di lapangan', completed: false },
            { id: 'aud-2', category: 'Quality', task: 'Sistem inspeksi mutu (inline/final) berjalan rutin', completed: false },
            { id: 'aud-3', category: 'Safety', task: 'APD tersedia dan digunakan seluruh operator', completed: false },
            { id: 'aud-4', category: 'Morale', task: 'Program pelatihan dan reward karyawan berjalan', completed: false },
          ]
          setAuditItems(defaultAudit)
          saveControlAudit(projectId, defaultAudit).catch(console.error)
        }
      }
    }).catch(console.error)

    // Load PSI dari Supabase (fallback localStorage)
    getControlPsi(projectId).then((psi) => {
      if (psi) {
        setPeopleScore(psi.people)
        setProcessScore(psi.process)
        setSystemScore(psi.system)
        setResultScore(psi.result)
      }
    }).catch(console.error)
  }, [projectId, router])

  const handleToggleAudit = (auditId: string) => {
    const updated = auditItems.map(item =>
      item.id === auditId ? { ...item, completed: !item.completed } : item
    )
    setAuditItems(updated)
    saveControlAudit(projectId, updated).catch(console.error)
  }

  const handleAddAudit = () => {
    if (!newAuditTask.trim()) return
    const newItem = {
      id: 'aud-' + Math.random().toString(36).substr(2, 9),
      category: newAuditCategory,
      task: newAuditTask.trim(),
      completed: false,
    }
    const updated = [...auditItems, newItem]
    setAuditItems(updated)
    saveControlAudit(projectId, updated).catch(console.error)
    setNewAuditTask('')
  }

  const handleDeleteAudit = (auditId: string) => {
    if (!window.confirm('Hapus item checklist ini?')) return
    const updated = auditItems.filter(item => item.id !== auditId)
    setAuditItems(updated)
    saveControlAudit(projectId, updated).catch(console.error)
  }

  const handleSavePSI = async () => {
    const psiObj = { people: peopleScore, process: processScore, system: systemScore, result: resultScore }
    await saveControlPsi(projectId, psiObj)
    setSaveMsg('Productivity Sustainability Index (PSI) berhasil direkam!')
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const handleCompleteProject = async () => {
    await updateProjectPhase(projectId, 'completed')
    router.push(`/projects/${projectId}/reports`)
  }

  if (!project) return null

  // Calculate Productivity Sustainability Index (PSI)
  const psiTotal = Math.round((peopleScore + processScore + systemScore + resultScore) / 4)

  // Formatting chart data: Baseline vs Target vs Actual per KPI
  const kpiData = actionPlans.map(act => ({
    name: act.title.substring(0, 15) + '...',
    Baseline: act.kpi_baseline,
    Target: act.kpi_target,
    Aktual: act.kpi_actual || 0
  }))

  const earlyWarnings = actionPlans.filter(act => {
    if (act.kpi_actual !== undefined) {
      // If the actual KPI is worse than target (assuming higher is better or lower is better)
      const isSlip = act.kpi_target > act.kpi_baseline 
        ? act.kpi_actual < act.kpi_baseline // higher target, but actual slipped below baseline
        : act.kpi_actual > act.kpi_baseline // lower target, but actual rose above baseline
      return isSlip
    }
    return false
  })

  // Group compliance by category
  const categories = Array.from(new Set(auditItems.map(item => item.category)))
  const categoryCompliance = categories.map(cat => {
    const items = auditItems.filter(item => item.category === cat)
    const completed = items.filter(item => item.completed).length
    const percentage = Math.round((completed / items.length) * 100) || 0
    return { category: cat, percentage, completed, total: items.length }
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fase CONTROL: KPI Dashboard, Audit Kepatuhan, dan Sustainability Index</p>
        </div>
      </div>

      {/* Save notification */}
      {saveMsg && (
        <div className="px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-sm text-emerald-400 animate-fade-in">
          ✅ {saveMsg}
        </div>
      )}

      {/* Advance phase banner */}
      <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 phase-banner">
        <div>
          <p className="text-xs font-semibold text-indigo-300">Fase Saat Ini: <span className="uppercase font-black">CONTROL</span></p>
          <p className="text-[10px] text-slate-500 mt-0.5">Simpan PSI, lalu selesaikan proyek dan cetak laporan akhir.</p>
        </div>
        <button onClick={handleCompleteProject}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer">
          Selesaikan &amp; Buka Laporan <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 overflow-x-auto pb-1">
        {[
          { id: 'kpi', name: 'KPI Dashboard & Warning' },
          { id: 'audit', name: 'Productivity Audit' },
          { id: 'sustainability', name: 'Sustainability Index (PSI)' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-amber-50 text-amber-800'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            style={activeTab === tab.id ? { borderBottomColor: 'var(--gold-400)', borderBottomWidth: '2px' } : {}}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Panel contents */}
      <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 md:p-8">
        
        {/* TAB 1: KPI TRACKING & WARNINGS */}
        {activeTab === 'kpi' && (
          <div className="space-y-6">
            <div className="border-b border-slate-850 pb-4">
              <h2 className="text-lg font-bold text-slate-200">Perbandingan Titik KPI</h2>
              <p className="text-xs text-slate-500">Analisis perbandingan Baseline vs Target vs Nilai Aktual terverifikasi</p>
            </div>

            {/* Warning banner */}
            {earlyWarnings.length > 0 && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 text-xs text-red-400">
                <ShieldAlert className="h-5 w-5 flex-shrink-0" />
                <div className="space-y-1">
                  <span className="font-bold">Early Warning Alert!</span>
                  <p className="text-slate-300">Terdeteksi degradasi performa pada program berikut:</p>
                  <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-350">
                    {earlyWarnings.map(w => (
                      <li key={w.id}>{w.title}: Aktual ({w.kpi_actual}) meleset dari baseline ({w.kpi_baseline})</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* KPI chart comparison */}
            {kpiData.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-500">Belum ada data KPI dari action plan.</p>
            ) : (
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-3xl h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={kpiData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Baseline" fill="#475569" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Target" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    <Line type="monotone" dataKey="Aktual" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRODUCTIVITY AUDIT */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="border-b border-slate-850 pb-4">
              <h2 className="text-lg font-bold text-slate-200">Audit Kepatuhan Implementasi</h2>
              <p className="text-xs text-slate-500">Periksa kepatuhan standardisasi di lapangan pasca perbaikan</p>
            </div>

            {/* ── Form tambah item checklist custom ── */}
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tambah Item Checklist</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={newAuditCategory}
                  onChange={(e) => setNewAuditCategory(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 w-full sm:w-40 shrink-0"
                >
                  {['Production', 'Quality', 'Cost', 'Safety', 'Morale', 'Delivery', 'Lainnya'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newAuditTask}
                  onChange={(e) => setNewAuditTask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAudit()}
                  placeholder="Deskripsi item audit... (Enter untuk simpan)"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-250 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAddAudit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white cursor-pointer shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah
                </button>
              </div>
            </div>

            {/* Compliance Statistics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Kepatuhan Total</span>
                  <span className="text-2xl font-black text-white mt-1 block">
                    {Math.round((auditItems.filter(i => i.completed).length / (auditItems.length || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${(auditItems.filter(i => i.completed).length / (auditItems.length || 1)) * 100}%` }}
                  />
                </div>
              </div>

              {categoryCompliance.map((catInfo, idx) => (
                <div key={idx} className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{catInfo.category}</span>
                    <span className="text-xl font-bold text-slate-200 mt-1 block">{catInfo.percentage}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                    <span>{catInfo.completed}/{catInfo.total} Selesai</span>
                    <div className="w-16 bg-slate-900 h-1 rounded-full overflow-hidden ml-2">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${catInfo.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Checklist items */}
            {auditItems.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
                Belum ada item checklist. Tambahkan di atas.
              </div>
            ) : (
              <div className="space-y-2">
                {auditItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-850 rounded-2xl hover:bg-slate-900/40 transition-colors group"
                  >
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => handleToggleAudit(item.id)}
                    >
                      <div className={`h-5 w-5 rounded border flex items-center justify-center transition-all shrink-0 ${
                        item.completed
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-slate-700'
                      }`}>
                        {item.completed && <Check className="h-3 w-3" />}
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-400">
                          {item.category}
                        </span>
                        <p className={`text-sm font-semibold mt-1 transition-colors ${item.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                          {item.task}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAudit(item.id)}
                      className="ml-3 text-slate-700 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                      title="Hapus item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SUSTAINABILITY INDEX */}
        {activeTab === 'sustainability' && (
          <div className="space-y-6">
            <div className="border-b border-slate-850 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-200">Productivity Sustainability Index (PSI)</h2>
                <p className="text-xs text-slate-500">Kalkulasi indeks keberlanjutan program peningkatan produktivitas</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Total PSI Score</span>
                <span className="text-xl font-bold text-indigo-400">{psiTotal}%</span>
              </div>
            </div>

            {/* Sliders for 4 dimensions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'People (Keterlibatan SDM & Organisasi)', val: peopleScore, set: setPeopleScore },
                { label: 'Process (Kematangan SOP & Kontrol Lini)', val: processScore, set: setProcessScore },
                { label: 'System (Ketersediaan Platform & Dokumentasi)', val: systemScore, set: setSystemScore },
                { label: 'Result (Dampak Finansial & Output Aktual)', val: resultScore, set: setResultScore }
              ].map((dim, idx) => (
                <div key={idx} className="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                    <span>{dim.label}</span>
                    <span className="text-indigo-400">{dim.val}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={dim.val}
                    onChange={(e) => dim.set(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-end border-t border-slate-850">
              <button
                onClick={handleSavePSI}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-650 hover:bg-indigo-600 text-sm font-bold rounded-xl text-white transition-colors cursor-pointer shadow-md"
              >
                <Save className="h-4 w-4" />
                Simpan PSI
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
