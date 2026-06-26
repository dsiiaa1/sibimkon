'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getProjects, getAssessments, saveAssessments, updateProjectPhase, getVom, saveVom } from '@/lib/db'
import { Project, Assessment } from '@/lib/mockData'
import {
  TrendingUp,
  Save,
  MessageSquareQuote,
  Plus,
  Trash2,
  ArrowRight,
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
  Tooltip,
} from 'recharts'
import { PQCDSM_LABELS } from '@/lib/utils'

export default function MeasurePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [activeDimension, setActiveDimension] = useState<
    'productivity' | 'quality' | 'cost' | 'delivery' | 'safety' | 'morale'
  >('productivity')
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // VOM state
  const [vomList, setVomList] = useState<any[]>([])
  const [vomDimension, setVomDimension] = useState('productivity')
  const [vomProblem, setVomProblem] = useState('')
  const [vomImpact, setVomImpact] = useState('')
  const [showVomPanel, setShowVomPanel] = useState(false)

  // Default assessment template (struktur pertanyaan saja, skor mulai dari 3)
  const DEFAULT_QUESTIONS: Record<string, Array<{ id: string; question: string; max_score: number }>> = {
    productivity: [
      { id: 'P1', question: 'Kelancaran proses produksi', max_score: 5 },
      { id: 'P2', question: 'Ketersediaan bahan baku', max_score: 5 },
      { id: 'P3', question: 'Kondisi dan kerusakan mesin/peralatan', max_score: 5 },
      { id: 'P4', question: 'Pencapaian target produksi', max_score: 5 },
      { id: 'P5', question: 'Efisiensi penggunaan waktu produksi', max_score: 5 },
    ],
    quality: [
      { id: 'Q1', question: 'Tingkat reject/cacat produk', max_score: 5 },
      { id: 'Q2', question: 'Keluhan pelanggan/customer', max_score: 5 },
      { id: 'Q3', question: 'Ketersediaan SOP mutu', max_score: 5 },
      { id: 'Q4', question: 'Sistem Quality Control', max_score: 5 },
      { id: 'Q5', question: 'Pencapaian KPI mutu', max_score: 5 },
    ],
    cost: [
      { id: 'C1', question: 'Efisiensi penggunaan bahan/material', max_score: 5 },
      { id: 'C2', question: 'Efisiensi penggunaan energi', max_score: 5 },
      { id: 'C3', question: 'Kerugian akibat kerusakan mesin', max_score: 5 },
      { id: 'C4', question: 'Tingkat overproduction/pemborosan', max_score: 5 },
      { id: 'C5', question: 'Biaya maintenance dan perbaikan', max_score: 5 },
    ],
    delivery: [
      { id: 'D1', question: 'Ketepatan waktu pengiriman', max_score: 5 },
      { id: 'D2', question: 'Lead time produksi', max_score: 5 },
      { id: 'D3', question: 'Keterlambatan penerimaan bahan', max_score: 5 },
      { id: 'D4', question: 'Keterlambatan proses produksi', max_score: 5 },
      { id: 'D5', question: 'Ketersediaan stok/inventory', max_score: 5 },
    ],
    safety: [
      { id: 'S1', question: 'Tingkat kecelakaan kerja', max_score: 5 },
      { id: 'S2', question: 'Ketersediaan dan penggunaan APD', max_score: 5 },
      { id: 'S3', question: 'Keberadaan dan fungsi P2K3', max_score: 5 },
      { id: 'S4', question: 'Implementasi SMK3', max_score: 5 },
      { id: 'S5', question: 'Penilaian risiko K3 berkala', max_score: 5 },
    ],
    morale: [
      { id: 'M1', question: 'Tingkat absensi karyawan', max_score: 5 },
      { id: 'M2', question: 'Tingkat turnover karyawan', max_score: 5 },
      { id: 'M3', question: 'Program pelatihan dan pengembangan', max_score: 5 },
      { id: 'M4', question: 'Kompetensi dan sertifikasi pekerja', max_score: 5 },
      { id: 'M5', question: 'Sistem reward dan penghargaan', max_score: 5 },
    ],
  }

  const buildBlankAssessments = (): Assessment[] =>
    (Object.keys(DEFAULT_QUESTIONS) as Array<keyof typeof DEFAULT_QUESTIONS>).map((dim) => ({
      project_id: projectId,
      dimension: dim as Assessment['dimension'],
      percentage_score: 60, // skor awal netral 60%
      responses: DEFAULT_QUESTIONS[dim].map((q) => ({
        id: q.id,
        question: q.question,
        score: 3,
        max_score: q.max_score,
        notes: '',
      })),
    }))

  useEffect(() => {
    async function loadData() {
      const projects = await getProjects()
      const proj = projects.find((p: Project) => p.id === projectId)
      if (!proj) { router.push('/dashboard'); return }
      setProject(proj)

      // Muat assessment dari db.ts (Supabase → fallback mockDB)
      const existingAssessments = await getAssessments(projectId)
      setAssessments(
        existingAssessments.length > 0 ? existingAssessments : buildBlankAssessments()
      )

      // Muat VOM dari Supabase (atau mock)
      const dbVom = await getVom(projectId)
      setVomList(dbVom)
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const showSave = (msg: string) => {
    setSaveMsg(msg)
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const handleScoreChange = (dimension: string, questionId: string, value: number) => {
    const updated = assessments.map((assess) => {
      if (assess.dimension !== dimension) return assess
      const updatedResponses = assess.responses.map((resp) =>
        resp.id === questionId ? { ...resp, score: value } : resp
      )
      const total = updatedResponses.reduce((acc, r) => acc + r.score, 0)
      const max = updatedResponses.reduce((acc, r) => acc + r.max_score, 0)
      return { ...assess, responses: updatedResponses, percentage_score: Math.round((total / max) * 100) }
    })
    setAssessments(updated)
  }

  const handleSaveAssessments = async () => {
    setSaving(true)
    try {
      // saveAssessments di db.ts sudah handle: sync mockDB + sync skor ke Supabase
      await saveAssessments(projectId, assessments)

      // Update local project state agar Productivity Index di header ikut update
      const avgIndex = Math.round(
        assessments.reduce((acc, a) => acc + a.percentage_score, 0) / assessments.length
      )
      setProject((prev) => prev
        ? { ...prev, baseline_score: prev.baseline_score || avgIndex, current_score: avgIndex }
        : prev
      )
      showSave('Assessment PQCDSM berhasil disimpan!')
    } finally {
      setSaving(false)
    }
  }

  const handleAdvanceToAnalyze = async () => {
    if (!project) return

    // Validasi: pastikan semua assessment sudah disimpan (setidaknya ada skor yang bukan default 60)
    const hasRealScores = assessments.some(a => a.percentage_score !== 60)
    if (!hasRealScores) {
      alert('Harap isi dan simpan Assessment PQCDSM terlebih dahulu sebelum melanjutkan ke fase ANALYZE. Minimal satu dimensi harus memiliki skor yang berbeda dari nilai awal.')
      return
    }

    setSaving(true)
    try {
      if (project.status === 'measure' || project.status === 'define') {
        await updateProjectPhase(projectId, 'analyze')
      }
      router.push(`/projects/${projectId}/analyze`)
    } finally {
      setSaving(false)
    }
  }

  const handleAddVom = () => {
    if (!vomProblem.trim()) return
    const newItem = {
      id: 'vom-' + Math.random().toString(36).substr(2, 9),
      dimension: vomDimension,
      problem: vomProblem,
      impact: vomImpact,
      priority: vomList.length + 1,
    }
    const updated = [...vomList, newItem]
    setVomList(updated)
    saveVom(projectId, updated).catch(console.error)
    setVomProblem('')
    setVomImpact('')
  }

  const handleDeleteVom = (id: string) => {
    if (!window.confirm('Hapus item VOM ini? Tindakan tidak dapat dibatalkan.')) return
    const updated = vomList.filter((item: any) => item.id !== id)
    setVomList(updated)
    saveVom(projectId, updated).catch(console.error)
  }

  if (!project || assessments.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <p>Mempersiapkan baseline assessment...</p>
      </div>
    )
  }

  const chartData = assessments.map((a) => {
    const labelInfo = PQCDSM_LABELS[a.dimension] || { label: a.dimension }
    return { subject: labelInfo.label, Score: a.percentage_score, fullMark: 100 }
  })

  const currentDimensionAssessment = assessments.find((a) => a.dimension === activeDimension)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Fase MEASURE: Baseline Assessment PQCDSM &amp; Productivity Index
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowVomPanel((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              showVomPanel
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquareQuote className="h-4 w-4" />
            Voice of Management
            {vomList.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400">
                {vomList.length}
              </span>
            )}
          </button>
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-right">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Productivity Index</span>
            <span className="text-xl font-bold text-indigo-400">{project.current_score || 0}%</span>
          </div>
          <button
            onClick={handleSaveAssessments}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-650 hover:bg-indigo-600 text-sm font-semibold rounded-xl text-white transition-colors cursor-pointer shadow-md disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Menyimpan...' : 'Simpan Assessment'}
          </button>
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
          <p className="text-xs font-semibold text-indigo-300">Fase Saat Ini: <span className="uppercase font-black">MEASURE</span></p>
          <p className="text-[10px] text-slate-500 mt-0.5">Simpan assessment terlebih dahulu, lalu lanjutkan ke tahap ANALYZE.</p>
        </div>
        <button onClick={handleAdvanceToAnalyze} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50">
          Lanjut ke ANALYZE <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* VOM Panel */}
      {showVomPanel && (
        <div className="bg-amber-950/10 border border-amber-800/30 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-amber-800/20 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquareQuote className="h-5 w-5 text-amber-400" />
              <h2 className="font-bold text-amber-300 text-base">Voice of Management (VOM)</h2>
            </div>
            <span className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
              Gunakan sebagai konteks penilaian kuesioner
            </span>
          </div>

          {/* VOM Input */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">
                Dimensi PQCDSM
              </label>
              <select
                value={vomDimension}
                onChange={(e) => setVomDimension(e.target.value)}
                className="w-full bg-slate-900 border border-amber-800/30 rounded-lg py-2 px-3 text-sm text-slate-300"
              >
                {['productivity', 'quality', 'cost', 'delivery', 'safety', 'morale'].map((d) => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">
                Keluhan / Prioritas Masalah
              </label>
              <input
                type="text"
                value={vomProblem}
                onChange={(e) => setVomProblem(e.target.value)}
                placeholder="Deskripsi keluhan manajemen..."
                className="w-full bg-slate-900 border border-amber-800/30 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">
                Dampak (Impact)
              </label>
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
          {vomList.length === 0 ? (
            <div className="text-center py-6 text-sm text-amber-700 border border-dashed border-amber-800/30 rounded-2xl">
              Belum ada catatan Voice of Management. Tambahkan masalah prioritas dari perspektif manajemen di atas.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vomList.map((item: any, idx: number) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between bg-amber-950/20 border border-amber-800/30 rounded-2xl p-4 gap-3"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-900/30 border border-amber-700/30 px-2 py-0.5 rounded text-amber-400">
                        {item.dimension}
                      </span>
                      <span className="text-[10px] text-amber-600 font-mono">#{idx + 1}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-200 leading-snug">{item.problem}</p>
                    {item.impact && (
                      <p className="text-xs text-slate-400">Dampak: {item.impact}</p>
                    )}
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
          )}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Questionnaire */}
        <div className="lg:col-span-7 space-y-6">
          {/* Dimension Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-850">
            {(['productivity', 'quality', 'cost', 'delivery', 'safety', 'morale'] as const).map((dim) => {
              const labelInfo = PQCDSM_LABELS[dim] || { label: dim, icon: '📝' }
              const active = activeDimension === dim
              const score = assessments.find((a) => a.dimension === dim)?.percentage_score || 0
              return (
                <button
                  key={dim}
                  onClick={() => setActiveDimension(dim)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-905 border border-slate-800 text-indigo-400 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span>{labelInfo.icon}</span>
                    <span>{labelInfo.label}</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300">
                    {score}%
                  </span>
                </button>
              )
            })}
          </div>

          {/* Questions */}
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
              {currentDimensionAssessment?.responses.map((q) => (
                <div key={q.id} className="space-y-3 p-4 rounded-2xl bg-slate-950/30 border border-slate-850">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs font-mono font-bold text-indigo-400">{q.id}</span>
                    <p className="text-sm font-semibold text-slate-200 flex-1 leading-normal">{q.question}</p>
                    <span className="text-xs font-bold text-indigo-300 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded">
                      {q.score} / {q.max_score}
                    </span>
                  </div>
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
                  {/* Keterangan skala */}
                  <div className="grid grid-cols-5 gap-2 pt-1">
                    {[
                      { val: 1, label: 'Sangat Buruk' },
                      { val: 2, label: 'Buruk' },
                      { val: 3, label: 'Cukup' },
                      { val: 4, label: 'Baik' },
                      { val: 5, label: 'Sangat Baik' },
                    ].map(({ val, label }) => (
                      <div key={val} className="text-center">
                        <span className={`text-[10px] leading-tight block ${q.score === val ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Charts */}
        <div className="lg:col-span-5 space-y-6">
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

          <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6">
            <h3 className="font-bold text-slate-200 mb-4">Grafik Batang Skor</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                  />
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
