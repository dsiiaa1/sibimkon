'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getMockDB, updateMockDB, Project, FishboneNode, WhyNode, ActionPlan } from '@/lib/mockData'
import { Sparkles, Plus, Trash, HelpCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ComposedChart, Line } from 'recharts'
import { PQCDSM_LABELS } from '@/lib/utils'

export default function AnalyzePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [activeTab, setActiveTab] = useState<'fishbone' | '5why' | 'pareto' | 'ai'>('fishbone')
  const [project, setProject] = useState<Project | null>(null)
  
  // Fishbone states
  const [fishboneItems, setFishboneItems] = useState<FishboneNode[]>([])
  const [newFbText, setNewFbText] = useState('')
  const [newFbCategory, setNewFbCategory] = useState<'man' | 'machine' | 'method' | 'material' | 'measurement' | 'environment'>('man')

  // 5Why states
  const [whys, setWhys] = useState<WhyNode[]>([])

  // AI consultant states
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  useEffect(() => {
    const db = getMockDB()
    const proj = db.projects.find((p: Project) => p.id === projectId)
    if (!proj) {
      router.push('/dashboard')
      return
    }
    setProject(proj)

    // Load fishbone
    setFishboneItems(db.fishbones[projectId] || [])

    // Load 5-Why
    setWhys(db.fiveWhys[projectId] || [])
  }, [projectId, router])

  const handleAddFishbone = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFbText) return

    const newItem: FishboneNode = {
      id: 'fb-' + Math.random().toString(36).substr(2, 9),
      category: newFbCategory,
      text: newFbText
    }

    const updated = [...fishboneItems, newItem]
    setFishboneItems(updated)
    
    const db = getMockDB()
    db.fishbones[projectId] = updated
    updateMockDB('fishbones', db.fishbones)
    
    setNewFbText('')
  }

  const handleDeleteFb = (id: string) => {
    const updated = fishboneItems.filter(item => item.id !== id)
    setFishboneItems(updated)
    const db = getMockDB()
    db.fishbones[projectId] = updated
    updateMockDB('fishbones', db.fishbones)
  }

  const handleSave5Why = (index: number, field: 'why' | 'answer', value: string, level2Index?: number, level3Index?: number, level4Index?: number, level5Index?: number) => {
    const updatedWhys = [...whys]
    
    let targetNode = updatedWhys[index]
    if (level2Index !== undefined) targetNode = targetNode.children![level2Index]
    if (level3Index !== undefined) targetNode = targetNode.children![level3Index]
    if (level4Index !== undefined) targetNode = targetNode.children![level4Index]
    if (level5Index !== undefined) targetNode = targetNode.children![level5Index]

    if (targetNode) {
      targetNode[field] = value
    }

    setWhys(updatedWhys)
    const db = getMockDB()
    db.fiveWhys[projectId] = updatedWhys
    updateMockDB('fiveWhys', db.fiveWhys)
  }

  const handleAddWhyNode = () => {
    const defaultNode: WhyNode = {
      level: 1,
      why: 'Mengapa defect jahit tinggi?',
      answer: 'Karena operator terburu-buru.',
      children: [
        {
          level: 2,
          why: 'Mengapa operator terburu-buru?',
          answer: 'Karena beban lini tidak seimbang.',
          children: [
            {
              level: 3,
              why: 'Mengapa beban lini tidak seimbang?',
              answer: 'Karena supervisor tidak punya SOP balancing.',
              children: [
                {
                  level: 4,
                  why: 'Mengapa tidak ada SOP balancing?',
                  answer: 'Karena belum pernah dilakukan Time Study.'
                }
              ]
            }
          ]
        }
      ]
    }
    const updated = [...whys, defaultNode]
    setWhys(updated)
    const db = getMockDB()
    db.fiveWhys[projectId] = updated
    updateMockDB('fiveWhys', db.fiveWhys)
  }

  const handleTriggerAI = async () => {
    setAiLoading(true)
    try {
      const db = getMockDB()
      
      // Build dummy scores if they are missing
      const scores = (db.assessments[projectId] || []).reduce((acc: any, curr: any) => {
        acc[curr.dimension] = curr.percentage_score
        return acc
      }, {})

      const response = await fetch('/api/ai-consultant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: project?.title,
          companyName: project?.company_name,
          vomList: localStorage.getItem(`sibimkon_vom_${projectId}`) ? JSON.parse(localStorage.getItem(`sibimkon_vom_${projectId}`)!) : [],
          pqcdsmScores: scores,
          whyTree: whys
        })
      })

      if (!response.ok) throw new Error('AI consultation API error')
      const result = await response.json()
      setAiResult(result)
    } catch (err: any) {
      alert(`Gagal memanggil AI Consultant: ${err.message}`)
    } finally {
      setAiLoading(false)
    }
  }

  const handleApplyAiRecommendations = () => {
    if (!aiResult) return

    const db = getMockDB()
    const currentActions = db.actionPlans[projectId] || []

    const newActions = aiResult.priority_recommendations.map((rec: any, idx: number) => {
      const isProductivity = rec.program.toLowerCase().includes('preventive') || rec.program.toLowerCase().includes('5s')
      return {
        id: 'act-ai-' + Math.random().toString(36).substr(2, 9),
        project_id: projectId,
        title: rec.program,
        description: rec.description,
        methodology: rec.program,
        dimension: isProductivity ? 'productivity' : 'quality',
        kpi_name: 'Dampak Perbaikan',
        kpi_baseline: 0,
        kpi_target: 100,
        kpi_unit: '%',
        kpi_actual: 0,
        pic_name: 'Supervisor',
        start_date: '2026-06-20',
        end_date: '2026-08-20',
        status: 'belum_mulai',
        progress_percentage: 0
      }
    })

    const updatedActions = [...currentActions, ...newActions]
    db.actionPlans[projectId] = updatedActions
    updateMockDB('actionPlans', db.actionPlans)

    // Update project state status to improve
    const updatedProjects = db.projects.map((p: Project) =>
      p.id === projectId && p.status === 'analyze' ? { ...p, status: 'improve' } : p
    )
    updateMockDB('projects', updatedProjects)
    setProject({ ...project!, status: project!.status === 'analyze' ? 'improve' : project!.status })

    alert('Rekomendasi AI berhasil diterapkan ke Action Plan! Proyek diperbarui ke fase IMPROVE.')
  }

  if (!project) return null

  // Pareto mockup data
  const paretoData = [
    { name: 'Keterlambatan Balancing', value: 45, percentage: 37.5, cumulative: 37.5 },
    { name: 'Kerusakan Mesin Obras', value: 35, percentage: 29.2, cumulative: 66.7 },
    { name: 'Defect Jahit Kerut', value: 20, percentage: 16.7, cumulative: 83.4 },
    { name: 'Kerusakan Kompresor', value: 12, percentage: 10.0, cumulative: 93.4 },
    { name: 'Keterlambatan Bahan', value: 8, percentage: 6.6, cumulative: 100.0 }
  ]

  const categories = [
    { id: 'man', label: 'Man (Manusia)', color: '#ec4899' },
    { id: 'machine', label: 'Machine (Mesin)', color: '#f59e0b' },
    { id: 'method', label: 'Method (Metode)', color: '#6366f1' },
    { id: 'material', label: 'Material (Bahan)', color: '#10b981' },
    { id: 'measurement', label: 'Measurement (Alat Ukur)', color: '#8b5cf6' },
    { id: 'environment', label: 'Environment (Lingkungan)', color: '#06b6d4' }
  ] as const

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fase ANALYZE: Analisis Akar Penyebab (RCA) & AI Consultant</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 overflow-x-auto pb-1">
        {[
          { id: 'fishbone', name: 'Ishikawa Fishbone' },
          { id: '5why', name: '5-Why Analysis' },
          { id: 'pareto', name: 'Pareto Chart' },
          { id: 'ai', name: 'AI Consultant 🤖' }
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

      {/* Panel Content */}
      <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 md:p-8">
        
        {/* TAB 1: FISHBONE DIAGRAM */}
        {activeTab === 'fishbone' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-850 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-200">Diagram Fishbone (RCA)</h2>
                <p className="text-xs text-slate-500">Petakan potensi penyebab masalah berdasarkan kategori 6M</p>
              </div>
              
              {/* Form Input */}
              <form onSubmit={handleAddFishbone} className="flex flex-wrap gap-2">
                <select
                  value={newFbCategory}
                  onChange={(e) => setNewFbCategory(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none"
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <input
                  type="text"
                  required
                  placeholder="Detail kendala..."
                  value={newFbText}
                  onChange={(e) => setNewFbText(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250 focus:outline-none w-48"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah
                </button>
              </form>
            </div>

            {/* Fishbone visual mapping */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {categories.map(cat => {
                const items = fishboneItems.filter(item => item.category === cat.id)
                return (
                  <div key={cat.id} className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                      <span className="text-xs font-bold" style={{ color: cat.color }}>{cat.label}</span>
                      <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded font-mono text-slate-500">{items.length}</span>
                    </div>

                    <div className="space-y-2">
                      {items.length === 0 ? (
                        <p className="text-[11px] text-slate-600 italic">Belum ada input</p>
                      ) : (
                        items.map(item => (
                          <div key={item.id} className="flex justify-between items-start bg-slate-900/60 border border-slate-850 p-2.5 rounded-lg text-xs">
                            <span className="text-slate-300 leading-normal">{item.text}</span>
                            <button
                              onClick={() => handleDeleteFb(item.id)}
                              className="text-slate-600 hover:text-red-400 transition-colors ml-2"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 2: 5-WHY TREE */}
        {activeTab === '5why' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-850 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-200">5-Why Analysis</h2>
                <p className="text-xs text-slate-500">Mencari akar terdalam dari kendala yang terjadi</p>
              </div>
              
              {whys.length === 0 && (
                <button
                  onClick={handleAddWhyNode}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Mulai Analisis 5-Why
                </button>
              )}
            </div>

            <div className="space-y-6 max-w-3xl mx-auto">
              {whys.map((w, idx) => (
                <div key={idx} className="space-y-4">
                  {/* Why 1 */}
                  <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl relative">
                    <span className="absolute -left-3 top-4 h-6 w-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold flex items-center justify-center text-indigo-400">1</span>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 ml-4">Why #1 (Pertanyaan)</label>
                    <input
                      type="text"
                      value={w.why}
                      onChange={(e) => handleSave5Why(idx, 'why', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-350"
                    />
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 ml-4 mt-2">Answer (Jawaban)</label>
                    <input
                      type="text"
                      value={w.answer}
                      onChange={(e) => handleSave5Why(idx, 'answer', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250"
                    />
                  </div>

                  {/* Cascading levels (Why 2-5) */}
                  {w.children?.map((child1, idx1) => (
                    <div key={idx1} className="pl-6 border-l border-slate-800 space-y-4">
                      <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl relative">
                        <span className="absolute -left-3 top-4 h-6 w-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold flex items-center justify-center text-indigo-400">2</span>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 ml-4">Why #2</label>
                        <input
                          type="text"
                          value={child1.why}
                          onChange={(e) => handleSave5Why(idx, 'why', e.target.value, idx1)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-350"
                        />
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 ml-4">Answer</label>
                        <input
                          type="text"
                          value={child1.answer}
                          onChange={(e) => handleSave5Why(idx, 'answer', e.target.value, idx1)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250"
                        />
                      </div>

                      {child1.children?.map((child2, idx2) => (
                        <div key={idx2} className="pl-6 border-l border-slate-800 space-y-4">
                          <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl relative">
                            <span className="absolute -left-3 top-4 h-6 w-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold flex items-center justify-center text-indigo-400">3</span>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 ml-4">Why #3</label>
                            <input
                              type="text"
                              value={child2.why}
                              onChange={(e) => handleSave5Why(idx, 'why', e.target.value, idx1, idx2)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-350"
                            />
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 ml-4">Answer</label>
                            <input
                              type="text"
                              value={child2.answer}
                              onChange={(e) => handleSave5Why(idx, 'answer', e.target.value, idx1, idx2)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250"
                            />
                          </div>

                          {child2.children?.map((child3, idx3) => (
                            <div key={idx3} className="pl-6 border-l border-slate-800 space-y-4">
                              <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl relative">
                                <span className="absolute -left-3 top-4 h-6 w-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold flex items-center justify-center text-indigo-400">4</span>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 ml-4">Why #4</label>
                                <input
                                  type="text"
                                  value={child3.why}
                                  onChange={(e) => handleSave5Why(idx, 'why', e.target.value, idx1, idx2, idx3)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-350"
                                />
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 ml-4">Answer</label>
                                <input
                                  type="text"
                                  value={child3.answer}
                                  onChange={(e) => handleSave5Why(idx, 'answer', e.target.value, idx1, idx2, idx3)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PARETO CHART */}
        {activeTab === 'pareto' && (
          <div className="space-y-6">
            <div className="border-b border-slate-850 pb-4">
              <h2 className="text-lg font-bold text-slate-200">Analisis Pareto (80/20 Rule)</h2>
              <p className="text-xs text-slate-500">Pilih 20% penyebab teratas yang memicu 80% defect/kendala</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Pareto chart (8 cols) */}
              <div className="lg:col-span-8 bg-slate-950/40 border border-slate-850 p-4 rounded-3xl h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={paretoData}>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8 }} />
                    <Bar yAxisId="left" dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#ec4899" strokeWidth={2.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Data checklist explanation (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                  <div className="flex items-center gap-1 text-xs font-bold text-indigo-400">
                    <AlertCircle className="h-4 w-4" />
                    Prioritas Utama
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    Fokus pada 2 kendala teratas: **Keterlambatan Balancing** dan **Kerusakan Mesin Obras** untuk menyelesaikan 66.7% dari seluruh total kendala.
                  </p>
                </div>

                <div className="space-y-2">
                  {paretoData.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-950/60 border border-slate-850 px-3.5 py-2 rounded-xl text-xs">
                      <span className="font-semibold text-slate-350">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{item.value}x</span>
                        <span className="font-bold text-indigo-400">{item.cumulative}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AI CONSULTANT */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="border-b border-slate-850 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-200">AI Productivity Consultant</h2>
                <p className="text-xs text-slate-500">Konsultasi otomatis didukung Google Gemini AI</p>
              </div>

              <button
                onClick={handleTriggerAI}
                disabled={aiLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-650 hover:to-cyan-650 text-sm font-semibold rounded-xl text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {aiLoading ? 'Menganalisis data...' : 'Analisis Dengan AI'}
              </button>
            </div>

            {aiLoading && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                <p className="text-xs text-slate-400">AI sedang memproses hasil assessment & analisis RCA perusahaan Anda...</p>
              </div>
            )}

            {!aiLoading && aiResult && (
              <div className="space-y-6 animate-fade-in">
                {/* Executive Summary */}
                <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                  <h3 className="text-sm font-bold text-indigo-400">Executive Summary</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{aiResult.summary}</p>
                </div>

                {/* Grid Causes and Recs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Root causes */}
                  <div className="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Akar Penyebab Utama (RCA)</h3>
                    <ul className="list-disc pl-4 space-y-2 text-xs text-slate-300 leading-normal">
                      {aiResult.root_causes.map((rc: string, i: number) => (
                        <li key={i}>{rc}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggestions targets */}
                  <div className="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Rekomendasi Target Baru</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl text-center">
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Productivity</span>
                        <span className="text-lg font-bold text-indigo-400">+{aiResult.realistic_targets?.productivity || 80}%</span>
                      </div>
                      <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl text-center">
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Quality</span>
                        <span className="text-lg font-bold text-cyan-400">+{aiResult.realistic_targets?.quality || 90}%</span>
                      </div>
                      <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl text-center">
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Cost</span>
                        <span className="text-lg font-bold text-emerald-400">-{aiResult.realistic_targets?.cost || 85}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Priority action plans */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Rekomendasi Action Plan</h3>
                  <div className="space-y-3">
                    {aiResult.priority_recommendations.map((rec: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-950/60 border border-slate-850 p-4 rounded-xl">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-200">{rec.program}</h4>
                          <p className="text-xs text-slate-400">{rec.description}</p>
                          <span className="inline-block text-[10px] text-indigo-300 font-semibold mt-1">Estimasi Dampak: {rec.impact}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleApplyAiRecommendations}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-650 hover:bg-indigo-600 text-sm font-bold rounded-xl text-white transition-colors cursor-pointer shadow-md"
                  >
                    Terapkan Rekomendasi AI Ke Action Plan
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {!aiLoading && !aiResult && (
              <div className="p-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-3xl space-y-4">
                <div className="text-5xl">🤖</div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-sm font-bold text-slate-350">AI Consultant Siap Menganalisis</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    AI akan menggabungkan data Profil, Voice of Management, skor kuesioner PQCDSM, dan akar masalah Fishbone/5-Why untuk menghasilkan strategi prioritas yang spesifik.
                  </p>
                </div>
                <button
                  onClick={handleTriggerAI}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Mulai Analisis AI
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
