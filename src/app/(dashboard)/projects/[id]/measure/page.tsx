'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  getProjects, getProjectCharter, getCompanies,
  getMeasureProblems, saveMeasureProblems, updateProjectPhase,
} from '@/lib/db'
import { Project, ProjectCharter, MeasureProblem, MethodRecommendation } from '@/lib/mockData'
import {
  ArrowRight, Sparkles, AlertCircle, CheckCircle2,
  Lightbulb, ChevronDown, ChevronUp, Plus, Trash2, RefreshCw, Loader2,
} from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'

/* ── metadata tampilan per dimensi ── */
const DIM_META: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  productivity: { label: 'Productivity (P)', icon: '⚙️', color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/30' },
  quality:      { label: 'Quality (Q)',      icon: '✅', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  cost:         { label: 'Cost (C)',         icon: '💰', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
  delivery:     { label: 'Delivery (D)',     icon: '🚚', color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30' },
  safety:       { label: 'Safety (S)',       icon: '🦺', color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30' },
  morale:       { label: 'Morale (M)',       icon: '👥', color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/30' },
}

const ALL_DIMS = ['productivity', 'quality', 'cost', 'delivery', 'safety', 'morale']

export default function MeasurePage() {
  const router    = useRouter()
  const params    = useParams()
  const projectId = params.id as string

  const { userInfo } = useUserRole()
  const isKonsultan  = (userInfo?.role ?? 'perusahaan').toLowerCase() !== 'perusahaan'

  const [project,    setProject]    = useState<Project | null>(null)
  const [charter,    setCharter]    = useState<ProjectCharter | null>(null)
  const [problems,   setProblems]   = useState<MeasureProblem[]>([])
  const [saving,     setSaving]     = useState(false)
  const [analyzing,  setAnalyzing]  = useState(false)
  const [saveMsg,    setSaveMsg]    = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')

  /* ── form tambah masalah manual ── */
  const [showForm,   setShowForm]   = useState(false)
  const [formText,   setFormText]   = useState('')
  const [formImpact, setFormImpact] = useState('')

  useEffect(() => {
    async function loadData() {
      const projects = await getProjects()
      const proj = projects.find((p: Project) => p.id === projectId)
      if (!proj) { router.push('/dashboard'); return }
      setProject(proj)

      /* nama perusahaan untuk konteks AI */
      let cName = ''
      if (proj.company_id) {
        const companies = await getCompanies()
        const comp = companies.find((c: any) => c.id === proj.company_id)
        cName = comp?.name ?? ''
        if (cName) setCompanyName(cName)
      }

      const [ch, saved] = await Promise.all([
        getProjectCharter(projectId),
        getMeasureProblems(projectId),
      ])
      setCharter(ch)

      // Cek apakah data yang tersimpan sudah dari AI (ada dimension_reason / ai_analyzed)
      // Jika belum → data lama dari keyword matching → paksa analisis ulang dengan AI
      const hasAiData = saved.length > 0 && saved.every(
        (p: MeasureProblem) => p.ai_analyzed === true
      )

      if (hasAiData) {
        // Data sudah dari AI, langsung tampilkan
        setProblems(saved)
      } else {
        // Data lama / belum ada → hapus dan analisis ulang dengan AI
        if (saved.length > 0) {
          // Ada data lama — hapus dari Supabase dan localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`sibimkon_measure_problems_${projectId}`)
          }
          try {
            const { createClient } = await import('@/lib/supabase/client')
            const sb = createClient()
            await sb.from('measure_problems').delete().eq('project_id', projectId)
          } catch (e) {
            console.warn('[loadData] Could not delete old data:', e)
          }
        }

        if (ch?.problem_statement) {
          await runAiAnalysis(ch, proj.title, cName)
        }
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const showToast = (msg: string) => { setSaveMsg(msg); setTimeout(() => setSaveMsg(null), 3000) }

  /* ── inti: panggil AI untuk analisis ── */
  async function runAiAnalysis(
    ch: ProjectCharter,
    projectTitle: string,
    compName: string,
  ) {
    setAnalyzing(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/measure-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_statement:   ch.problem_statement,
          objectives:          ch.objectives,
          productivity_target: ch.productivity_target,
          scope:               ch.scope,
          company_name:        compName || 'Perusahaan',
          project_title:       projectTitle,
        }),
      })

      const data = await res.json()

      // Jika API return error, lempar agar masuk catch
      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      if (!data.problems || !Array.isArray(data.problems) || data.problems.length === 0) {
        throw new Error('AI tidak mengembalikan data problems yang valid')
      }

      /* Konversi ke MeasureProblem dan HAPUS data lama sebelum simpan */
      const aiProblems: MeasureProblem[] = data.problems.map((p: any, idx: number) => ({
        id: `prob-ai-${idx}-${Math.random().toString(36).substr(2, 6)}`,
        project_id:         projectId,
        problem_text:       p.problem_text,
        source:             'charter' as const,
        pqcdsm_dimension:   p.pqcdsm_dimension,
        dimension_reason:   p.dimension_reason,
        recommended_methods: (p.recommended_methods ?? []).map((m: any, ri: number) => ({
          method:   m.method,
          reason:   m.reason,
          priority: m.priority ?? ri + 1,
        })) as MethodRecommendation[],
        priority_rank: idx + 1,
        ai_analyzed: true,   // ← penanda data ini dari AI
      }))

      setProblems(aiProblems)

      // Hapus cache localStorage lama agar tidak pakai data keyword-matching
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`sibimkon_measure_problems_${projectId}`)
      }

      // Simpan ke Supabase
      await saveMeasureProblems(projectId, aiProblems)
      showToast('✨ Analisis selesai!')

    } catch (err: any) {
      console.error('[measure-analyze]', err)
      setSaveMsg(`❌ Analisis gagal: ${err.message}. Pastikan koneksi internet aktif.`)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleReanalyze = async () => {
    if (!charter || !project) return
    if (!window.confirm('Analisis ulang akan menghapus hasil saat ini dan menjalankan AI dari awal. Lanjutkan?')) return

    // Hapus data lama dari localStorage dulu
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`sibimkon_measure_problems_${projectId}`)
    }

    // Hapus data lama dari Supabase agar tidak terbaca lagi
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      await sb.from('measure_problems').delete().eq('project_id', projectId)
    } catch (e) {
      console.warn('[handleReanalyze] Could not delete from Supabase:', e)
    }

    setProblems([])
    await runAiAnalysis(charter, project.title, companyName)
  }

  const handleSave = async () => {
    setSaving(true)
    try { await saveMeasureProblems(projectId, problems); showToast('Data berhasil disimpan!') }
    finally { setSaving(false) }
  }

  const handleAdvance = async () => {
    if (problems.length === 0) {
      alert('Belum ada hasil analisis. Pastikan Project Charter sudah diisi.')
      return
    }
    setSaving(true)
    try {
      await saveMeasureProblems(projectId, problems)
      if (project?.status === 'measure' || project?.status === 'define') {
        await updateProjectPhase(projectId, 'analyze')
      }
      router.push(`/projects/${projectId}/analyze`)
    } finally { setSaving(false) }
  }

  /* ── tambah masalah manual (AI analisis dimensinya) ── */
  const handleAddManual = async () => {
    if (!formText.trim()) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/measure-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_statement: formText.trim(),
          company_name:      companyName || 'Perusahaan',
          project_title:     project?.title ?? '',
        }),
      })
      const data = await res.json()
      const p    = data.problems?.[0]

      const newProb: MeasureProblem = {
        id: 'prob-' + Math.random().toString(36).substr(2, 9),
        project_id: projectId,
        problem_text:       formText.trim(),
        source:             'manual',
        pqcdsm_dimension:   p?.pqcdsm_dimension ?? 'productivity',
        dimension_reason:   p?.dimension_reason ?? '',
        recommended_methods: (p?.recommended_methods ?? []).map((m: any, ri: number) => ({
          method: m.method, reason: m.reason, priority: ri + 1,
        })),
        impact:       formImpact.trim() || undefined,
        priority_rank: problems.length + 1,
      }
      const updated = [...problems, newProb]
      setProblems(updated)
      await saveMeasureProblems(projectId, updated)
      setFormText(''); setFormImpact(''); setShowForm(false)
      showToast('Masalah dianalisis dan ditambahkan!')
    } catch {
      showToast('Gagal menganalisis. Coba lagi.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('Hapus masalah ini?')) return
    const updated = problems.filter(p => p.id !== id)
    setProblems(updated)
    saveMeasureProblems(projectId, updated).catch(console.error)
  }

  if (!project) return null

  const dimCount = ALL_DIMS.map(d => ({
    dim: d,
    count: problems.filter(p => p.pqcdsm_dimension === d).length,
  }))

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Fase MEASURE — Groq AI menganalisis charter dan mengklasifikasikan masalah ke PQCDSM
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isKonsultan && (
            <button onClick={handleReanalyze} disabled={analyzing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded-xl text-slate-300 cursor-pointer disabled:opacity-50">
              {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Analisis Ulang
            </button>
          )}
          <span className="text-[10px] bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-400 font-mono">
            {problems.length} masalah teridentifikasi
          </span>
        </div>
      </div>

      {saveMsg && (
        <div className={`px-4 py-3 rounded-xl text-sm ${saveMsg.startsWith('❌') ? 'bg-red-500/15 border border-red-500/30 text-red-400' : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'}`}>
          {saveMsg}
        </div>
      )}

      {/* ── Phase banner ── */}
      <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 phase-banner">
        <div>
          <p className="text-xs font-semibold text-indigo-300">Fase Saat Ini: <span className="uppercase font-black">MEASURE</span></p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            AI menganalisis teks charter dan menentukan dimensi PQCDSM serta metode penanganan yang relevan.
          </p>
        </div>
        <button onClick={handleAdvance} disabled={saving || analyzing}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl text-white cursor-pointer disabled:opacity-50">
          Lanjut ke ANALYZE <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Kutipan Charter ── */}
      {charter?.problem_statement && (
        <div className="p-5 rounded-2xl bg-amber-950/15 border border-amber-800/30 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Sumber Analisis: Problem Statement dari Project Charter</p>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{charter.problem_statement}</p>
          {charter.objectives && (
            <p className="text-xs text-slate-500 border-t border-amber-800/20 pt-2">
              <span className="font-bold text-amber-500/70">Tujuan:</span> {charter.objectives}
            </p>
          )}
        </div>
      )}

      {/* ── Loading state ── */}
      {analyzing && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-indigo-500/30 rounded-3xl bg-indigo-500/5">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <p className="text-sm font-semibold text-indigo-300">Groq AI sedang menganalisis charter...</p>
          <p className="text-xs text-slate-500">Mengidentifikasi masalah, dimensi PQCDSM, dan metode penanganan yang relevan</p>
        </div>
      )}

      {/* ── Tidak ada charter ── */}
      {!analyzing && !charter?.problem_statement && problems.length === 0 && (
        <div className="py-12 text-center border border-dashed border-amber-800/30 rounded-2xl bg-amber-950/5 space-y-2">
          <AlertCircle className="h-8 w-8 mx-auto text-amber-600" />
          <p className="text-sm font-semibold text-amber-400">Project Charter belum diisi</p>
          <p className="text-xs text-slate-500">Analisis AI membutuhkan Problem Statement dari Project Charter.</p>
          <button onClick={() => router.push(`/projects/${projectId}/define`)}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-xs font-bold rounded-xl text-white cursor-pointer">
            Ke Halaman DEFINE
          </button>
        </div>
      )}

      {/* ── Distribusi PQCDSM ── */}
      {!analyzing && problems.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {dimCount.map(({ dim, count }) => {
            const m = DIM_META[dim]
            return (
              <div key={dim} className={`p-3 rounded-2xl border text-center transition-all ${count > 0 ? `${m.bg} ${m.border}` : 'bg-slate-950/30 border-slate-800'}`}>
                <span className="text-lg block">{m.icon}</span>
                <span className={`text-[10px] font-bold block mt-1 ${count > 0 ? m.color : 'text-slate-600'}`}>{m.label.split(' ')[0]}</span>
                <span className={`text-xl font-black block ${count > 0 ? m.color : 'text-slate-700'}`}>{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Daftar hasil analisis AI ── */}
      {!analyzing && problems.length > 0 && (
        <div className="space-y-4">
          {/* label sumber analisis */}
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Hasil Analisis Groq AI</span>
            <span className="text-[9px] text-slate-600 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
              Berdasarkan teks Project Charter
            </span>
          </div>

          {problems.map((prob, idx) => {
            const meta       = DIM_META[prob.pqcdsm_dimension] ?? DIM_META['productivity']
            const isExpanded = expandedId === prob.id
            return (
              <div key={prob.id} className="rounded-2xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all">

                {/* ── Baris utama ── */}
                <div className="flex items-start gap-3 p-5 bg-slate-950/30">
                  <span className="h-7 w-7 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>

                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Teks masalah */}
                    <p className="text-sm font-semibold text-slate-200 leading-relaxed">{prob.problem_text}</p>

                    {/* Badge sumber + dampak */}
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500 font-semibold">
                        {prob.source === 'charter' ? '📋 Dari Charter' : '✍️ Input Manual'}
                      </span>
                      {prob.impact && (
                        <span className="px-2 py-0.5 rounded bg-amber-900/20 border border-amber-800/30 text-amber-400">
                          Dampak: {prob.impact}
                        </span>
                      )}
                    </div>

                    {/* Dimensi PQCDSM — hasil AI, read-only */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Dimensi:</span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold ${meta.bg} ${meta.border} ${meta.color}`}>
                        {meta.icon} {meta.label}
                      </span>
                      {(prob as any).dimension_reason && (
                        <span className="text-[10px] text-slate-500 italic">— {(prob as any).dimension_reason}</span>
                      )}
                    </div>
                  </div>

                  {/* Expand rekomendasi + hapus */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : prob.id)}
                      className={`p-2 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${isExpanded ? `${meta.bg} ${meta.color}` : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'}`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {isKonsultan && (
                      <button onClick={() => handleDelete(prob.id)}
                        className="p-2 text-slate-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Panel rekomendasi ── */}
                {isExpanded && (
                  <div className={`border-t border-slate-800 p-5 ${meta.bg} space-y-4`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Rekomendasi Metode — {meta.label}
                      </span>
                      <span className="text-[9px] text-slate-600 bg-slate-950/60 border border-slate-800 px-2 py-0.5 rounded">
                        Dianalisis Groq AI berdasarkan konteks masalah
                      </span>
                    </div>

                    {prob.recommended_methods.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">Belum ada rekomendasi. Coba analisis ulang.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {prob.recommended_methods.map((rec: MethodRecommendation, ri: number) => (
                          <div key={ri} className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 space-y-1">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${meta.color}`} />
                              <span className={`text-xs font-bold ${meta.color}`}>#{rec.priority} {rec.method}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed pl-5">{rec.reason}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
                      <Lightbulb className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Rekomendasi ini menjadi acuan di fase{' '}
                        <strong className="text-slate-400">ANALYZE</strong> (analisis kebutuhan) dan{' '}
                        <strong className="text-slate-400">IMPROVE</strong> (action plan).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Tambah masalah manual ── */}
      {!analyzing && (
        <div className="space-y-3">
          <button onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-semibold rounded-xl text-slate-300 cursor-pointer">
            <Plus className="h-4 w-4" />
            Tambah Masalah Lain
          </button>
          <p className="text-[10px] text-slate-600 pl-1">
            Opsional — jika ada masalah di luar charter. AI akan menganalisis dimensi PQCDSM dan rekomendasi metodenya secara otomatis.
          </p>

          {showForm && (
            <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Masalah Tambahan</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Deskripsi Masalah *</label>
                  <textarea value={formText} onChange={(e) => setFormText(e.target.value)} rows={3}
                    placeholder="Deskripsikan masalah. AI akan menganalisis masuk ke dimensi PQCDSM mana dan merekomendasikan metode yang relevan."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-250 focus:outline-none focus:border-indigo-500 resize-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Dampak (opsional)</label>
                  <input type="text" value={formImpact} onChange={(e) => setFormImpact(e.target.value)}
                    placeholder="Misal: Kerugian Rp 15jt/bulan"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250 focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-3">
                <button onClick={() => { setShowForm(false); setFormText(''); setFormImpact('') }}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">Batal</button>
                <button onClick={handleAddManual} disabled={!formText.trim() || analyzing}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white cursor-pointer disabled:opacity-40">
                  {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Analisis &amp; Tambahkan
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Simpan + Lanjut ── */}
      {problems.length > 0 && !analyzing && (
        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-sm font-semibold rounded-xl text-slate-200 cursor-pointer disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button onClick={handleAdvance} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer disabled:opacity-50">
            Lanjut ke ANALYZE <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
