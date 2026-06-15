'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getMockDB, updateMockDB, Project, ActionPlan } from '@/lib/mockData'
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  HelpCircle,
  FileCheck,
  Save,
  Check
} from 'lucide-react'
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

  // Audit Checklist state
  const [auditItems, setAuditItems] = useState<any[]>([])
  
  // Sustainability Index (PSI) state
  const [peopleScore, setPeopleScore] = useState(70)
  const [processScore, setProcessScore] = useState(65)
  const [systemScore, setSystemScore] = useState(60)
  const [resultScore, setResultScore] = useState(75)

  useEffect(() => {
    const db = getMockDB()
    const proj = db.projects.find((p: Project) => p.id === projectId)
    if (!proj) {
      router.push('/dashboard')
      return
    }
    setProject(proj)
    setActionPlans(db.actionPlans[projectId] || [])

    // Load audit checklist
    const savedAudit = localStorage.getItem(`sibimkon_audit_${projectId}`)
    if (savedAudit) {
      setAuditItems(JSON.parse(savedAudit))
    } else {
      const defaultAudit = [
        { id: 'aud-1', category: 'Production', task: 'SOP Lini Jahit dipasang di setiap mesin', completed: true },
        { id: 'aud-2', category: 'Production', task: 'Layout penyeimbangan stasiun sewing dipatuhi', completed: false },
        { id: 'aud-3', category: 'Quality', task: 'QC inline melakukan inspeksi hourly', completed: true },
        { id: 'aud-4', category: 'Safety', task: 'Operator memakai masker jahit jernih', completed: true },
        { id: 'aud-5', category: 'Morale', task: 'Sistem reward produktivitas dijalankan bulanan', completed: false }
      ]
      setAuditItems(defaultAudit)
      localStorage.setItem(`sibimkon_audit_${projectId}`, JSON.stringify(defaultAudit))
    }

    // Load PSI
    const savedPsi = localStorage.getItem(`sibimkon_psi_${projectId}`)
    if (savedPsi) {
      const parsed = JSON.parse(savedPsi)
      setPeopleScore(parsed.people || 70)
      setProcessScore(parsed.process || 65)
      setSystemScore(parsed.system || 60)
      setResultScore(parsed.result || 75)
    }
  }, [projectId, router])

  const handleToggleAudit = (auditId: string) => {
    const updated = auditItems.map(item =>
      item.id === auditId ? { ...item, completed: !item.completed } : item
    )
    setAuditItems(updated)
    localStorage.setItem(`sibimkon_audit_${projectId}`, JSON.stringify(updated))
  }

  const handleSavePSI = () => {
    const psiObj = {
      people: peopleScore,
      process: processScore,
      system: systemScore,
      result: resultScore
    }
    localStorage.setItem(`sibimkon_psi_${projectId}`, JSON.stringify(psiObj))

    // Update project state status to completed
    const db = getMockDB()
    const updatedProjects = db.projects.map((p: Project) =>
      p.id === projectId && p.status === 'control' ? { ...p, status: 'completed' } : p
    )
    updateMockDB('projects', updatedProjects)
    setProject({ ...project!, status: project!.status === 'control' ? 'completed' : project!.status })

    alert('Productivity Sustainability Index (PSI) berhasil direkam! Proyek sekarang ditandai sebagai SELESAI.')
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fase CONTROL: KPI Dashboard, Audit Kepatuhan, dan Sustainability Index</p>
        </div>
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
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
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

            <div className="space-y-3">
              {auditItems.map(item => (
                <div 
                  key={item.id}
                  onClick={() => handleToggleAudit(item.id)}
                  className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-850 rounded-2xl hover:bg-slate-900/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded border flex items-center justify-center transition-all ${
                      item.completed 
                        ? 'bg-indigo-600 border-indigo-500 text-white' 
                        : 'border-slate-800'
                    }`}>
                      {item.completed && <Check className="h-3 w-3" />}
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-400">
                        {item.category}
                      </span>
                      <p className="text-sm font-semibold text-slate-200 mt-1">{item.task}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                Simpan & Selesaikan Proyek
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
