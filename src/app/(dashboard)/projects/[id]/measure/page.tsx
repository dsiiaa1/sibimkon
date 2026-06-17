'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getMockDB, updateMockDB, Project, Assessment } from '@/lib/mockData'
import { 
  TrendingUp, 
  Save, 
  HelpCircle,
  FileCheck,
  MessageSquareQuote,
  Plus,
  Trash2
} from 'lucide-react'
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts'
import { PQCDSM_LABELS } from '@/lib/utils'

export default function MeasurePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [activeDimension, setActiveDimension] = useState<'productivity' | 'quality' | 'cost' | 'delivery' | 'safety' | 'morale'>('productivity')
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [isSaved, setIsSaved] = useState(false)

  // VOM State
  const [vomList, setVomList] = useState<any[]>([])
  const [vomDimension, setVomDimension] = useState('productivity')
  const [vomProblem, setVomProblem] = useState('')
  const [vomImpact, setVomImpact] = useState('')
  const [showVomPanel, setShowVomPanel] = useState(false)

  useEffect(() => {
    const db = getMockDB()
    const proj = db.projects.find((p: Project) => p.id === projectId)
    if (!proj) {
      router.push('/dashboard')
      return
    }
    setProject(proj)

    // Load or initialize assessments
    const projectAssessments = db.assessments[projectId] || []
    setAssessments(projectAssessments)

    // Load VOM from localStorage
    const storedVom = localStorage.getItem(`sibimkon_vom_${projectId}`)
    if (storedVom) {
      setVomList(JSON.parse(storedVom))
    } else {
      // Default seed data when no VOM captured yet
      const defaultVom = [
        { id: 'vom-1', dimension: 'productivity', problem: 'Bottleneck di stasiun sewing line 3', impact: 'OPH turun 15% dari target', priority: 1 },
        { id: 'vom-2', dimension: 'quality', problem: 'Tingkat defect jahit kerut tinggi', impact: 'Biaya re-work mencapai Rp 25jt/bulan', priority: 2 }
      ]
      setVomList(defaultVom)
      localStorage.setItem(`sibimkon_vom_${projectId}`, JSON.stringify(defaultVom))
    }
  }, [projectId, router])

  const handleScoreChange = (dimension: string, questionId: string, value: number) => {
    const updatedAssessments = assessments.map(assess => {
      if (assess.dimension === dimension) {
        const updatedResponses = assess.responses.map(resp => 
          resp.id === questionId ? { ...resp, score: value } : resp
        )
        const total = updatedResponses.reduce((acc, r) => acc + r.score, 0)
        const max = updatedResponses.reduce((acc, r) => acc + r.max_score, 0)
        const pct = Math.round((total / max) * 100)
        return {
          ...assess,
          responses: updatedResponses,
          percentage_score: pct
        }
      }
      return assess
    })
    setAssessments(updatedAssessments)
    setIsSaved(false)
  }

  const handleSaveAssessments = () => {
    const db = getMockDB()
    db.assessments[projectId] = assessments

    // Compute average productivity index
    const totalPercentage = assessments.reduce((acc, a) => acc + a.percentage_score, 0)
    const avgIndex = Math.round(totalPercentage / assessments.length)

    // Update project index
    const updatedProjects = db.projects.map((p: Project) =>
      p.id === projectId 
        ? { 
            ...p, 
            baseline_score: p.baseline_score || avgIndex, 
            current_score: avgIndex,
            status: p.status === 'measure' ? 'analyze' : p.status
          } 
        : p
    )

    updateMockDB('assessments', db.assessments)
    updateMockDB('projects', updatedProjects)
    setProject({ ...project!, current_score: avgIndex, status: project!.status === 'measure' ? 'analyze' : project!.status })
    setIsSaved(true)
    alert('Assessment PQCDSM berhasil disimpan! Fase proyek diperbarui ke ANALYZE.')
  }

  const handleAddVom = () => {
    if (!vomProblem) return
    const newItem = {
      id: 'vom-' + Math.random().toString(36).substr(2, 9),
      dimension: vomDimension,
      problem: vomProblem,
      impact: vomImpact,
      priority: vomList.length + 1
    }
    const updated = [...vomList, newItem]
    setVomList(updated)
    localStorage.setItem(`sibimkon_vom_${projectId}`, JSON.stringify(updated))
    setVomProblem('')
    setVomImpact('')
  }

  const handleDeleteVom = (id: string) => {
    const updated = vomList.filter((item: any) => item.id !== id)
    setVomList(updated)
    localStorage.setItem(`sibimkon_vom_${projectId}`, JSON.stringify(updated))
  }

  if (!project || assessments.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="text-center">
          <p>Mempersiapkan baseline assessment...</p>
        </div>
      </div>
    )
  }

  // Formatting data for Radar and Bar charts
  const chartData = assessments.map(a => {
    const labelInfo = PQCDSM_LABELS[a.dimension] || { label: a.dimension }
    return {
      subject: labelInfo.label,
      Score: a.percentage_score,
      fullMark: 100
    }
  })

  const currentDimensionAssessment = assessments.find(a => a.dimension === activeDimension)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fase MEASURE: Baseline Assessment PQCDSM &amp; Productivity Index</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowVomPanel(v => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              showVomPanel
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquareQuote className="h-4 w-4" />
            Voice of Management
          </button>
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-right">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Productivity Index</span>
            <span className="text-xl font-bold text-indigo-400">{project.current_score || 0}%</span>
          </div>
          <button
            onClick={handleSaveAssessments}
            className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-650 hover:bg-indigo-600 text-sm font-semibold rounded-xl text-white transition-colors cursor-pointer shadow-md"
          >
            <Save className="h-4 w-4" />
            Simpan Assessment
          </button>
        </div>
      </div>

      {/* VOM Collapsible Panel */}
      {showVomPanel && (
        <div className="bg-amber-950/10 border border-amber-800/30 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-amber-800/20 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquareQuote className="h-5 w-5 text-amber-400" />
              <h2 className="font-bold text-amber-300 text-base">Voice of Management (VOM)</h2>
            </div>
            <span className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">Gunakan sebagai konteks penilaian kuesioner</span>
          </div>

          {/* VOM Input Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">Dimensi PQCDSM</label>
              <select
                value={vomDimension}
                onChange={(e) => setVomDimension(e.target.value)}
                className="w-full bg-slate-900 border border-amber-800/30 rounded-lg py-2 px-3 text-sm text-slate-300"
              >
                <option value="productivity">Productivity</option>
                <option value="quality">Quality</option>
                <option value="cost">Cost</option>
                <option value="delivery">Delivery</option>
                <option value="safety">Safety</option>
                <option value="morale">Morale</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">Keluhan / Prioritas Masalah</label>
              <input
                type="text"
                value={vomProblem}
                onChange={(e) => setVomProblem(e.target.value)}
                placeholder="Deskripsi keluhan manajemen..."
                className="w-full bg-slate-900 border border-amber-800/30 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">Dampak (Impact)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vomImpact}
                  onChange={(e) => setVomImpact(e.target.value)}
                  placeholder="Dampak finansial / operasional"
                  className="flex-1 bg-slate-900 border border-amber-800/30 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleAddVom}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-xs font-bold rounded-lg text-white cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* VOM List */}
          {vomList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vomList.map((item: any, idx: number) => (
                <div key={item.id} className="flex items-start justify-between bg-amber-950/20 border border-amber-800/30 rounded-2xl p-4 gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-900/30 border border-amber-700/30 px-2 py-0.5 rounded text-amber-400">
                        {item.dimension}
                      </span>
                      <span className="text-[10px] text-amber-600 font-mono">#{idx + 1}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-200 leading-snug">{item.problem}</p>
                    {item.impact && <p className="text-xs text-slate-400">Dampak: {item.impact}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteVom(item.id)}
                    className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-900/20 transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-sm text-amber-700">Belum ada catatan Voice of Management. Tambahkan di atas.</p>
          )}
        </div>
      )}

      {/* Main Grid: Forms and Chart Side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: Questionnaire (8 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Dimension Selector Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-850">
            {(['productivity', 'quality', 'cost', 'delivery', 'safety', 'morale'] as const).map(dim => {
              const labelInfo = PQCDSM_LABELS[dim] || { label: dim, color: '#fff', icon: '📝' }
              const active = activeDimension === dim
              const score = assessments.find(a => a.dimension === dim)?.percentage_score || 0
              return (
                <button
                  key={dim}
                  onClick={() => setActiveDimension(dim)}
                  className={`flex-1 min-w-[100px] flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-905 border border-slate-800 text-indigo-400 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span>{labelInfo.icon}</span>
                    <span>{labelInfo.label}</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300">{score}%</span>
                </button>
              )
            })}
          </div>

          {/* Questionnaire list */}
          <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h3 className="font-bold text-slate-200 capitalize">
                Kuesioner Baseline: {PQCDSM_LABELS[activeDimension]?.label}
              </h3>
              <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                Bobot: 1.0 (Standard)
              </span>
            </div>

            <div className="space-y-6">
              {currentDimensionAssessment?.responses.map((q, idx) => (
                <div key={q.id} className="space-y-3 p-4 rounded-2xl bg-slate-950/30 border border-slate-850">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs font-mono font-bold text-indigo-400">{q.id}</span>
                    <p className="text-sm font-semibold text-slate-200 flex-1 leading-normal">{q.question}</p>
                    <span className="text-xs font-bold text-indigo-300 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded">
                      Skor: {q.score} / {q.max_score}
                    </span>
                  </div>

                  {/* Rating Selector */}
                  <div className="flex items-center gap-2 pt-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        onClick={() => handleScoreChange(activeDimension, q.id, val)}
                        className={`flex-1 h-9 rounded-lg font-bold text-xs transition-all border cursor-pointer ${
                          q.score === val
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                            : 'bg-slate-950/45 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <HelpCircle className="h-3 w-3" />
                    <span>1 = Sangat Buruk · 5 = Sangat Baik</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Charts and Scorecard (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Radar Chart */}
          <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6">
            <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              Radar Chart Produktivitas
            </h3>

            <div className="h-64 flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569' }} />
                  <Radar name="Skor" dataKey="Score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart Summary */}
          <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6">
            <h3 className="font-bold text-slate-200 mb-4">Grafik Batang Skor</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff' }} />
                  <Bar dataKey="Score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
