'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  getProjects,
  updateProjectPhase, getMeasureProblems, getProjectCharter,
  getAnalyzeResult, saveAnalyzeResult, getMeasureDataRequirements
} from '@/lib/db'
import {
  Project, AnalyzeRecommendation, MeasureProblem, AnalyzeResult, MeasureDataRequirement, PriorityItem, ActionPlanStep
} from '@/lib/mockData'
import {
  Sparkles, Plus, AlertCircle, ArrowRight, Trash2, Save, CheckCircle, Edit3,
  Loader2, RefreshCw, X
} from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'

// --- Generic Analyze Component (EDITABLE) ---
function GenericAnalyzeComponent({
  recommendation,
  onDataChange
}: {
  recommendation: AnalyzeRecommendation
  onDataChange?: (newData: any) => void
}) {
  const { structure_type, data } = recommendation

  if (!structure_type || !data) {
    return <div className="text-xs text-slate-500 italic mt-2">Data analisis belum di-generate. Silakan klik "Generate Ulang Rekomendasi" di atas.</div>
  }

  const uid = () => Math.random().toString(36).substr(2, 9)

  // ── Category List (Fishbone) ──
  if (structure_type === 'category_list') {
    const addItem = (catIdx: number) => {
      const cats = [...(data.categories || [])]
      cats[catIdx] = { ...cats[catIdx], items: [...(cats[catIdx].items || []), { id: 'fb-' + uid(), text: '' }] }
      onDataChange?.({ ...data, categories: cats })
    }
    const updateItem = (catIdx: number, itemIdx: number, text: string) => {
      const cats = [...(data.categories || [])]
      const items = [...cats[catIdx].items]
      items[itemIdx] = { ...items[itemIdx], text }
      cats[catIdx] = { ...cats[catIdx], items }
      onDataChange?.({ ...data, categories: cats })
    }
    const deleteItem = (catIdx: number, itemIdx: number) => {
      const cats = [...(data.categories || [])]
      const items = [...cats[catIdx].items]
      items.splice(itemIdx, 1)
      cats[catIdx] = { ...cats[catIdx], items }
      onDataChange?.({ ...data, categories: cats })
    }
    const updateCategoryName = (catIdx: number, name: string) => {
      const cats = [...(data.categories || [])]
      cats[catIdx] = { ...cats[catIdx], name }
      onDataChange?.({ ...data, categories: cats })
    }
    const addCategory = () => {
      const cats = [...(data.categories || []), { name: 'Kategori Baru', items: [{ id: 'fb-' + uid(), text: '' }] }]
      onDataChange?.({ ...data, categories: cats })
    }
    const deleteCategory = (catIdx: number) => {
      const cats = [...(data.categories || [])]
      cats.splice(catIdx, 1)
      onDataChange?.({ ...data, categories: cats })
    }

    return (
      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.categories?.map((cat: any, cIdx: number) => (
            <div key={cIdx} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <input
                  type="text" value={cat.name}
                  onChange={(e) => updateCategoryName(cIdx, e.target.value)}
                  className="text-sm font-bold text-slate-300 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded px-1 flex-1"
                />
                <button onClick={() => deleteCategory(cIdx)} className="p-1 text-slate-600 hover:text-rose-400 transition-colors cursor-pointer" title="Hapus kategori">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <ul className="space-y-2">
                {(cat.items || []).map((item: any, iIdx: number) => (
                  <li key={item.id || iIdx} className="flex items-center gap-2 text-xs bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <input
                      type="text"
                      value={item.text || item.name || ''}
                      onChange={(e) => updateItem(cIdx, iIdx, e.target.value)}
                      placeholder="Isi penyebab..."
                      className="flex-1 text-slate-400 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded px-1"
                    />
                    <button onClick={() => deleteItem(cIdx, iIdx)} className="p-0.5 text-slate-600 hover:text-rose-400 transition-colors cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
              <button onClick={() => addItem(cIdx)} className="w-full text-center text-[10px] text-slate-500 hover:text-indigo-400 border border-dashed border-slate-800 hover:border-indigo-500/30 rounded-lg py-1.5 transition-colors cursor-pointer flex items-center justify-center gap-1">
                <Plus className="w-3 h-3" /> Tambah Item
              </button>
            </div>
          ))}
        </div>
        <button onClick={addCategory} className="w-full text-center text-xs text-slate-500 hover:text-indigo-400 border border-dashed border-slate-700 hover:border-indigo-500/30 rounded-xl py-2.5 transition-colors cursor-pointer flex items-center justify-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Tambah Kategori Baru
        </button>
      </div>
    )
  }

  // ── Ranked List (Pareto) ──
  if (structure_type === 'ranked_list') {
    const updateRankedItem = (idx: number, field: 'name' | 'score', value: string) => {
      const items = [...(data.items || [])]
      items[idx] = { ...items[idx], [field]: field === 'score' ? Number(value) || 0 : value }
      onDataChange?.({ ...data, items })
    }
    const addRankedItem = () => {
      const items = [...(data.items || []), { id: 'p-' + uid(), name: '', score: 0 }]
      onDataChange?.({ ...data, items })
    }
    const deleteRankedItem = (idx: number) => {
      const items = [...(data.items || [])]
      items.splice(idx, 1)
      onDataChange?.({ ...data, items })
    }

    return (
      <div className="mt-4 space-y-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold">
              <tr>
                <th className="px-4 py-3 w-12">No</th>
                {(data.columns || []).map((col: string, idx: number) => (
                  <th key={idx} className="px-4 py-3">{col}</th>
                ))}
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {(data.items || []).map((item: any, idx: number) => (
                <tr key={item.id || idx} className="hover:bg-slate-800/20">
                  <td className="px-4 py-3 text-slate-500 font-bold">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <input type="text" value={item.name || item.problem_name || ''} onChange={(e) => updateRankedItem(idx, 'name', e.target.value)}
                      placeholder="Nama masalah..." className="w-full bg-transparent text-slate-300 border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded px-1 text-xs" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" value={item.score || item.value || 0} onChange={(e) => updateRankedItem(idx, 'score', e.target.value)}
                      className="w-20 bg-transparent text-indigo-400 font-bold border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded px-1 text-xs" />
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteRankedItem(idx)} className="p-0.5 text-slate-600 hover:text-rose-400 transition-colors cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addRankedItem} className="w-full text-center text-xs text-slate-500 hover:text-indigo-400 border border-dashed border-slate-700 hover:border-indigo-500/30 rounded-xl py-2.5 transition-colors cursor-pointer flex items-center justify-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Tambah Baris
        </button>
      </div>
    )
  }

  // ── Nested List (5 Whys) ──
  if (structure_type === 'nested_list') {
    const updateProblem = (value: string) => {
      onDataChange?.({ ...data, problem: value })
    }
    const updateWhyItem = (idx: number, field: 'question' | 'answer', value: string) => {
      const items = [...(data.items || [])]
      items[idx] = { ...items[idx], [field]: value }
      onDataChange?.({ ...data, items })
    }
    const addWhyItem = () => {
      const currentItems = data.items || []
      const nextLevel = currentItems.length > 0 ? currentItems[currentItems.length - 1].level + 1 : 1
      const items = [...currentItems, { id: 'w-' + uid(), level: nextLevel, question: '', answer: '' }]
      onDataChange?.({ ...data, items })
    }
    const deleteWhyItem = (idx: number) => {
      const items = [...(data.items || [])]
      items.splice(idx, 1)
      // Re-number levels
      items.forEach((it: any, i: number) => { it.level = i + 1 })
      onDataChange?.({ ...data, items })
    }

    return (
      <div className="mt-4 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <h5 className="text-sm font-bold text-slate-200 whitespace-nowrap">Masalah:</h5>
          <input type="text" value={data.problem || ''} onChange={(e) => updateProblem(e.target.value)}
            className="flex-1 text-sm text-indigo-400 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded px-2" />
        </div>
        <div className="space-y-3 pl-4 border-l-2 border-slate-800">
          {(data.items || []).map((item: any, idx: number) => (
            <div key={item.id || idx} className="relative group/why">
              <span className="absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-slate-900"></span>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Why {item.level}:</span>
                      <input type="text" value={item.question || ''} onChange={(e) => updateWhyItem(idx, 'question', e.target.value)}
                        placeholder="Mengapa...?" className="flex-1 text-xs text-slate-300 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded px-1" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-emerald-500 whitespace-nowrap">Jawaban:</span>
                      <input type="text" value={item.answer || ''} onChange={(e) => updateWhyItem(idx, 'answer', e.target.value)}
                        placeholder="Karena..." className="flex-1 text-xs text-emerald-300 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50 rounded px-1" />
                    </div>
                  </div>
                  <button onClick={() => deleteWhyItem(idx)} className="p-0.5 text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover/why:opacity-100 cursor-pointer mt-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addWhyItem} className="w-full text-center text-xs text-slate-500 hover:text-indigo-400 border border-dashed border-slate-700 hover:border-indigo-500/30 rounded-xl py-2.5 transition-colors cursor-pointer flex items-center justify-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Tambah Why Level
        </button>
      </div>
    )
  }

  // Fallback for key_value or generic
  return (
    <div className="mt-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-300">
      <pre className="whitespace-pre-wrap font-mono">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}

export default function AnalyzePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  useUserRole()

  /* ── no tabs needed, single view ── */

  /* ── core data ── */
  const [project, setProject] = useState<Project | null>(null)

  /* ── AI Analyze Recommendation ── */
  const [dataRequirements, setDataRequirements] = useState<MeasureDataRequirement[]>([])
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSaveMsg, setAiSaveMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editReasoning, setEditReasoning] = useState('')
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customMethod, setCustomMethod] = useState('')
  const [customReasoning, setCustomReasoning] = useState('')
  
  const [priorityResult, setPriorityResult] = useState<PriorityItem[] | null>(null)
  const [isGeneratingPriority, setIsGeneratingPriority] = useState(false)
  const [priorityError, setPriorityError] = useState<string | null>(null)
  const priorityTriggered = useRef(false)
  const [expandedPriority, setExpandedPriority] = useState<number | null>(null)
  
  const aiTriggered = useRef(false)

  const [measureProblems, setMeasureProblems] = useState<MeasureProblem[]>([])
  const [projectCharter, setProjectCharter] = useState<any>(null)

  /* ── load ── */
  useEffect(() => {
    async function loadData() {
      const projects = await getProjects()
      const proj = projects.find((p: Project) => p.id === projectId)
      if (!proj) { router.push('/dashboard'); return }
      setProject(proj)

      const [mProblems, charter, dataReqs, resultAI] = await Promise.all([
        getMeasureProblems(projectId),
        getProjectCharter(projectId),
        getMeasureDataRequirements(projectId),
        getAnalyzeResult(projectId)
      ])
      setMeasureProblems(mProblems)
      setProjectCharter(charter)
      setDataRequirements(dataReqs)
      if (resultAI) {
        setAnalyzeResult(resultAI)
        setPriorityResult(resultAI.priority_result || null)
      }


    }
    loadData()
  }, [projectId, router])



  /* ── AI Analyze Recommendation ── */
  const CLOSED_METHODS = [
    '5 Whys',
    'Fishbone Diagram',
    'Pareto Analysis',
    'FMEA (Failure Mode and Effects Analysis)'
  ]

  const isMeasureSaved = !!projectCharter?.measure_summary

  const handleTriggerAnalyzeAI = useCallback(async () => {
    if (!isMeasureSaved) return
    setAiLoading(true)
    setAiError(null)
    setAiSaveMsg(null)
    try {
      const response = await fetch('/api/analyze-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charter: projectCharter,
          dataCollected: {
            requirements: dataRequirements,
            problems: measureProblems,
            measure_summary: projectCharter?.measure_summary
          }
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `Server error (${response.status})`)
      
      const recs = Array.isArray(result) ? result : []

      const newResult: AnalyzeResult = {
        project_id: projectId,
        recommendations: recs.map((r, i) => ({
          method: r.method,
          reasoning: r.reasoning,
          priority: r.priority || (i + 1),
          source: r.source || 'ai',
          structure_type: r.structure_type,
          data: r.data
        })),
        status: 'draft'
      }

      setAnalyzeResult(newResult)
    } catch (err: any) {
      setAiError(err.message || 'Gagal melakukan analisis otomatis.')
    } finally {
      setAiLoading(false)
    }
  }, [isMeasureSaved, projectCharter, dataRequirements, measureProblems, projectId])

  // Auto trigger AI on first open if no result
  useEffect(() => {
    if (isMeasureSaved && !analyzeResult && !aiLoading && !aiError && !aiTriggered.current) {
      aiTriggered.current = true
      handleTriggerAnalyzeAI()
    }
  }, [isMeasureSaved, analyzeResult, aiLoading, aiError, handleTriggerAnalyzeAI])

  const handleGeneratePriority = useCallback(async () => {
    if (!analyzeResult || (analyzeResult.recommendations || []).length === 0) return
    setIsGeneratingPriority(true)
    setPriorityError(null)
    try {
      const response = await fetch('/api/analyze-priority-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charter: projectCharter,
          dataCollected: {
            requirements: dataRequirements,
            problems: measureProblems,
            measure_summary: projectCharter?.measure_summary
          },
          rcaResults: analyzeResult.recommendations
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `Server error`)
      
      const parsed = Array.isArray(result) ? result : []
      setPriorityResult(parsed)
      
      const updatedResult = { ...analyzeResult, priority_result: parsed, status: 'draft' as const }
      setAnalyzeResult(updatedResult)
      await saveAnalyzeResult(projectId, updatedResult)
    } catch(err: any) {
      setPriorityError(err.message || 'Gagal generate prioritas.')
    } finally {
      setIsGeneratingPriority(false)
    }
  }, [analyzeResult, projectCharter, dataRequirements, measureProblems, projectId])

  useEffect(() => {
    if (analyzeResult && (analyzeResult.recommendations || []).length > 0) {
      const allDone = (analyzeResult.recommendations || []).every(r => r.data)
      if (allDone && !priorityResult && !isGeneratingPriority && !priorityError && !priorityTriggered.current) {
        priorityTriggered.current = true
        handleGeneratePriority()
      }
    }
  }, [analyzeResult, priorityResult, isGeneratingPriority, priorityError, handleGeneratePriority])

  const handleSaveAnalyzeAI = async () => {
    if (!analyzeResult) return
    setSaving(true)
    setAiSaveMsg(null)
    try {
      const toSave: AnalyzeResult = {
        ...analyzeResult,
        priority_result: priorityResult || analyzeResult.priority_result,
        status: 'saved'
      }
      await saveAnalyzeResult(projectId, toSave)
      setAnalyzeResult(toSave)
      setAiSaveMsg('Hasil analisis berhasil disimpan!')
      setTimeout(() => setAiSaveMsg(null), 3000)
    } catch (err: any) {
      alert(`Gagal menyimpan hasil analisis: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const updateActionPlan = (priorityIndex: number, planIndex: number, field: keyof ActionPlanStep, value: string) => {
    if (!priorityResult) return
    const newPr = [...priorityResult]
    newPr[priorityIndex].action_plan[planIndex] = { ...newPr[priorityIndex].action_plan[planIndex], [field]: value }
    setPriorityResult(newPr)
    setAnalyzeResult(prev => prev ? { ...prev, priority_result: newPr, status: 'draft' } : null)
  }

  const addActionPlan = (priorityIndex: number) => {
    if (!priorityResult) return
    const newPr = [...priorityResult]
    newPr[priorityIndex].action_plan.push({ id: 'ap-' + Math.random().toString(36).substr(2,9), action: '', pic: '', timeline: '' })
    setPriorityResult(newPr)
    setAnalyzeResult(prev => prev ? { ...prev, priority_result: newPr, status: 'draft' } : null)
  }

  const removeActionPlan = (priorityIndex: number, planIndex: number) => {
    if (!priorityResult) return
    const newPr = [...priorityResult]
    newPr[priorityIndex].action_plan.splice(planIndex, 1)
    setPriorityResult(newPr)
    setAnalyzeResult(prev => prev ? { ...prev, priority_result: newPr, status: 'draft' } : null)
  }

  const handleDeleteRecommendation = (index: number) => {
    if (!analyzeResult) return
    if (!window.confirm('Hapus rekomendasi ini?')) return
    const newRecs = [...(analyzeResult.recommendations || [])]
    newRecs.splice(index, 1)
    setAnalyzeResult({ ...analyzeResult, recommendations: newRecs, status: 'draft' })
  }

  const handleSaveEditReasoning = (index: number) => {
    if (!analyzeResult) return
    const newRecs = [...(analyzeResult.recommendations || [])]
    newRecs[index].reasoning = editReasoning
    setAnalyzeResult({ ...analyzeResult, recommendations: newRecs, status: 'draft' })
    setEditingIndex(null)
    setEditReasoning('')
  }

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!analyzeResult || !customMethod || !customReasoning) return
    const newRecs = [...(analyzeResult.recommendations || []), {
      method: customMethod,
      reasoning: customReasoning,
      priority: (analyzeResult.recommendations || []).length + 1,
      source: 'custom' as const
    }]
    setAnalyzeResult({ ...analyzeResult, recommendations: newRecs, status: 'draft' })
    setShowAddCustom(false)
    setCustomMethod('')
    setCustomReasoning('')
  }


  if (!project) return null



  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fase ANALYZE: Analisis Akar Penyebab &amp; Kebutuhan Implementasi</p>
        </div>
      </div>

      {/* ── Phase banner ── */}
      <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 phase-banner">
        <div>
          <p className="text-xs font-semibold text-indigo-300">Fase Saat Ini: <span className="uppercase font-black">ANALYZE</span></p>
          <p className="text-[10px] text-slate-500 mt-0.5">Selesaikan analisis otomatis dan identifikasi kebutuhan sebelum lanjut ke IMPROVE.</p>
        </div>
        <button
          onClick={async () => {
            if (project.status === 'analyze') await updateProjectPhase(projectId, 'improve')
            router.push(`/projects/${projectId}/improve`)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl text-white cursor-pointer"
        >
          Lanjut ke IMPROVE <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Content ── */}
      <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 md:p-8">

        {/* ══ AI RECOMMENDATION & GENERIC COMPONENT ══ */}
        {(
          <div className="space-y-6">
            <div className="border-b border-slate-850 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-200">Rekomendasi & Analisis Akar Masalah</h2>
                <p className="text-xs text-slate-500">
                  Sistem merekomendasikan metode sekaligus melakukan generate struktur datanya secara otomatis.
                </p>
              </div>

              {/* Save & Status Message */}
              {analyzeResult && (
                <div className="flex items-center gap-3">
                  {aiSaveMsg && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold animate-pulse">
                      <CheckCircle className="h-3.5 w-3.5" /> {aiSaveMsg}
                    </span>
                  )}
                  <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border ${
                    analyzeResult.status === 'saved'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    {analyzeResult.status}
                  </span>
                  <button
                    onClick={handleSaveAnalyzeAI}
                    disabled={saving}
                    className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" /> {saving ? 'Menyimpan...' : 'Simpan Analisis'}
                  </button>
                </div>
              )}
            </div>

            {/* AI Error Alert */}
            {aiError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-400">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
                <button
                  onClick={handleTriggerAnalyzeAI}
                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-lg font-bold border border-red-500/30 transition-all shrink-0 cursor-pointer"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {/* AI Loading View */}
            {aiLoading && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                <h3 className="text-sm font-bold text-slate-300">Menjalankan Analisis...</h3>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  Menganalisis data, merekomendasikan metode, dan menyusun data RCA Anda...
                </p>
              </div>
            )}

            {/* Empty State / Trigger View */}
            {!analyzeResult && !aiLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-5 bg-slate-950/40 border border-slate-850 rounded-3xl p-6">
                <Sparkles className="w-12 h-12 text-indigo-400 opacity-60" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-200">Mulai Analisis Akar Masalah Otomatis</h3>
                  <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                    Sistem akan membuat rekomendasi Root Cause Analysis beserta simulasinya (Fishbone/Pareto/5Whys) dalam satu langkah.
                  </p>
                </div>

                <div className="relative group">
                  <button
                    onClick={handleTriggerAnalyzeAI}
                    disabled={!isMeasureSaved}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                      isMeasureSaved
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer hover:shadow-lg hover:shadow-indigo-500/10'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Jalankan Analisis Otomatis
                  </button>

                  {!isMeasureSaved && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-slate-900 border border-slate-800 text-slate-300 text-xs px-3 py-2 rounded-xl shadow-xl w-64 z-50 text-center">
                      Selesaikan dan simpan tahap Measure terlebih dahulu.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Result View */}
            {analyzeResult && !aiLoading && (
              <div className="space-y-6">
                
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200">Rekomendasi & Hasil RCA</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowAddCustom(!showAddCustom)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-300 transition-all cursor-pointer"
                    >
                      {showAddCustom ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {showAddCustom ? 'Batal' : 'Tambah Manual'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Generate ulang akan menimpa semua data analisis saat ini. Lanjutkan?')) {
                          handleTriggerAnalyzeAI()
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold rounded-lg text-indigo-400 border border-indigo-500/20 transition-all cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Generate Ulang Rekomendasi
                    </button>
                  </div>
                </div>

                {showAddCustom && (
                  <form onSubmit={handleAddCustom} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-300">Tambah Metode Manual</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={customMethod}
                        onChange={(e) => setCustomMethod(e.target.value)}
                        required
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="">-- Pilih Metode --</option>
                        {CLOSED_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        <option value="Lainnya">Lainnya (Custom)</option>
                      </select>
                      {customMethod === 'Lainnya' && (
                        <input
                          type="text"
                          required
                          placeholder="Nama Metode..."
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                          onChange={(e) => setCustomMethod(e.target.value)}
                        />
                      )}
                    </div>
                    <textarea
                      value={customReasoning}
                      onChange={(e) => setCustomReasoning(e.target.value)}
                      required
                      placeholder="Alasan / Hasil manual..."
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none resize-none"
                    />
                    <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer">
                      Simpan Metode
                    </button>
                  </form>
                )}

                <div className="space-y-6">
                  {(analyzeResult.recommendations || []).map((rec, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-950/40 border border-slate-850 flex flex-col gap-3 relative group">
                      
                      {/* Badge Source & Priority */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            rec.source === 'ai' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {rec.source === 'ai' ? <><Sparkles className="w-3 h-3 inline mr-1" /> Auto Generated</> : 'Manual'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Prioritas {rec.priority}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingIndex !== idx && (
                            <button onClick={() => { setEditingIndex(idx); setEditReasoning(rec.reasoning) }} className="p-1.5 text-slate-400 hover:text-indigo-400 bg-slate-900 rounded-lg cursor-pointer">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => handleDeleteRecommendation(idx)} className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 rounded-lg cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Method Name */}
                      <h4 className="text-lg font-black text-slate-200">{rec.method}</h4>

                      {/* Reasoning */}
                      {editingIndex === idx ? (
                        <div className="space-y-2 mt-2">
                          <textarea
                            value={editReasoning}
                            onChange={(e) => setEditReasoning(e.target.value)}
                            rows={3}
                            className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none resize-none"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveEditReasoning(idx)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg cursor-pointer">
                              Simpan
                            </button>
                            <button onClick={() => setEditingIndex(null)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer">
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                          {rec.reasoning}
                        </p>
                      )}

                      <GenericAnalyzeComponent recommendation={rec} onDataChange={(newData) => {
                        if (!analyzeResult) return
                        const newRecs = [...(analyzeResult.recommendations || [])]
                        newRecs[idx] = { ...newRecs[idx], data: newData }
                        setAnalyzeResult({ ...analyzeResult, recommendations: newRecs, status: 'draft' })
                      }} />
                    </div>
                  ))}
                </div>

                {(analyzeResult.recommendations || []).length === 0 && (
                  <div className="text-center py-10 text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                    Belum ada data analisis. Klik "Tambah Manual" atau "Generate Ulang Rekomendasi".
                  </div>
                )}

                {/* --- Priority Result Table --- */}
                {(analyzeResult.recommendations || []).length > 0 && (
                  <div className="mt-8 border-t border-slate-800 pt-8">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-200">Skala Prioritas Masalah</h3>
                        <p className="text-xs text-slate-400">Daftar prioritas masalah disintesis otomatis dari hasil RCA di atas</p>
                      </div>
                      <button onClick={handleGeneratePriority} disabled={isGeneratingPriority} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-300 transition-colors disabled:opacity-50">
                        {isGeneratingPriority ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Generate Ulang Prioritas
                      </button>
                    </div>

                    {isGeneratingPriority ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-slate-900/30 rounded-2xl border border-slate-800">
                        <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
                        <p className="text-sm font-semibold animate-pulse">Menyintesis skala prioritas dan action plan...</p>
                      </div>
                    ) : priorityError ? (
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-xs">
                        <AlertCircle className="h-4 w-4 inline mr-1.5" /> {priorityError}
                      </div>
                    ) : priorityResult && priorityResult.length > 0 ? (
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950 text-slate-400 font-bold uppercase">
                            <tr>
                              <th className="px-4 py-3 w-12 text-center">No</th>
                              <th className="px-4 py-3">Masalah Prioritas</th>
                              <th className="px-4 py-3 text-center">Skor</th>
                              <th className="px-4 py-3 text-center">Level</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {(priorityResult || []).map((pr: any, pIdx: number) => (
                              <React.Fragment key={pIdx}>
                                <tr onClick={() => setExpandedPriority(expandedPriority === pIdx ? null : pIdx)} className="hover:bg-slate-800/30 cursor-pointer transition-colors group">
                                  <td className="px-4 py-4 text-center font-bold text-slate-500">{pr.no}</td>
                                  <td className="px-4 py-4">
                                    <div className="font-bold text-slate-200 text-sm group-hover:text-indigo-400 transition-colors">{pr.problem}</div>
                                    <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">{pr.justification}</div>
                                  </td>
                                  <td className="px-4 py-4 text-center font-black text-indigo-400">{pr.priority_score}</td>
                                  <td className="px-4 py-4 text-center">
                                    <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase ${pr.priority_level.toLowerCase() === 'tinggi' ? 'bg-red-500/10 text-red-400' : pr.priority_level.toLowerCase() === 'sedang' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                      {pr.priority_level}
                                    </span>
                                  </td>
                                </tr>
                                {expandedPriority === pIdx && (
                                  <tr className="bg-slate-950 border-t border-slate-800/50">
                                    <td colSpan={4} className="px-6 py-4">
                                      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                                        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-amber-400" /> Draft Action Plan</h4>
                                        <button onClick={() => addActionPlan(pIdx)} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded font-semibold transition-colors flex items-center gap-1"><Plus className="h-3 w-3"/> Tambah Langkah</button>
                                      </div>
                                      <div className="space-y-2">
                                        {pr.action_plan?.length === 0 && <p className="text-xs text-slate-500 italic">Belum ada langkah action plan.</p>}
                                        {(pr.action_plan || []).map((ap: any, apIdx: number) => (
                                          <div key={ap.id || apIdx} className="flex items-center gap-3 bg-slate-900 p-2 rounded-lg border border-slate-800">
                                            <input type="text" value={ap.action} onChange={(e) => updateActionPlan(pIdx, apIdx, 'action', e.target.value)} placeholder="Langkah tindakan..." className="flex-1 bg-transparent border-none text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded px-2" />
                                            <input type="text" value={ap.pic} onChange={(e) => updateActionPlan(pIdx, apIdx, 'pic', e.target.value)} placeholder="PIC / Penanggung Jawab" className="w-1/4 bg-slate-800/50 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded px-2 py-1" />
                                            <input type="text" value={ap.timeline} onChange={(e) => updateActionPlan(pIdx, apIdx, 'timeline', e.target.value)} placeholder="Timeline" className="w-1/5 bg-slate-800/50 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded px-2 py-1" />
                                            <button onClick={() => removeActionPlan(pIdx, apIdx)} className="p-1 text-slate-500 hover:text-red-400 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        Tidak ada data prioritas.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
