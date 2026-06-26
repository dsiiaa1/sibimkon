'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getProjects, getAssessments, getActionPlans, saveActionPlans, getFishbones, saveFishbones, getFiveWhys, saveFiveWhys, updateProjectPhase } from '@/lib/db'
import { Project, FishboneNode, WhyNode, ActionPlan, Assessment } from '@/lib/mockData'
import { Sparkles, Plus, AlertCircle, ArrowRight } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ComposedChart, Line } from 'recharts'
import { PQCDSM_LABELS } from '@/lib/utils'
import { useUserRole } from '@/hooks/useUserRole'

export default function AnalyzePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [activeTab, setActiveTab] = useState<'fishbone' | '5why' | 'pareto' | 'ai'>('fishbone')
  const [project, setProject] = useState<Project | null>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])

  // Fishbone
  const [fishboneItems, setFishboneItems] = useState<FishboneNode[]>([])
  const [newFbText, setNewFbText] = useState('')
  const [newFbCategory, setNewFbCategory] = useState<'man' | 'machine' | 'method' | 'material' | 'measurement' | 'environment'>('man')

  // 5Why
  const [whys, setWhys] = useState<WhyNode[]>([])

  // AI
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  // Role-based permission — diverifikasi dari server via useUserRole()
  // verified=true berarti role sudah dikonfirmasi dari Supabase session (tidak bisa dimanipulasi)
  const { userInfo } = useUserRole()
  const userRole = userInfo?.role ?? 'perusahaan'
  // Perusahaan = satu-satunya role yang dibatasi. Semua role lain (konsultan, admin, dll) dapat akses penuh.
  const isKonsultan = userRole.toLowerCase() !== 'perusahaan'

  useEffect(() => {
    async function loadData() {
      const projects = await getProjects()
      const proj = projects.find((p: Project) => p.id === projectId)
      if (!proj) { router.push('/dashboard'); return }
      setProject(proj)

      // Load assessments via db.ts untuk pareto otomatis
      const existingAssessments = await getAssessments(projectId)
      setAssessments(existingAssessments)

      // Load fishbone dan 5why dari Supabase (fallback mockDB)
      const [fishbones, fiveWhys] = await Promise.all([
        getFishbones(projectId),
        getFiveWhys(projectId),
      ])
      setFishboneItems(fishbones)
      setWhys(fiveWhys)
    }
    loadData()
  }, [projectId, router])

  // ── Pareto: hitung otomatis dari skor assessment ──
  // Dimensi dengan skor terendah = kontributor masalah terbesar
  const paretoData = (() => {
    if (assessments.length === 0) return []
    // Urutkan dari skor terendah (masalah paling besar) ke tertinggi
    const sorted = [...assessments].sort((a, b) => a.percentage_score - b.percentage_score)
    const totalGap = sorted.reduce((acc, a) => acc + (100 - a.percentage_score), 0) || 1
    let cumulative = 0
    return sorted.map((a) => {
      const gap = 100 - a.percentage_score // gap dari skor ideal = ukuran masalah
      const percentage = Math.round((gap / totalGap) * 100)
      cumulative += percentage
      const labelInfo = PQCDSM_LABELS[a.dimension] || { label: a.dimension, icon: '' }
      return {
        name: `${labelInfo.icon} ${labelInfo.label}`,
        value: gap,
        skor: a.percentage_score,
        percentage,
        cumulative: Math.min(cumulative, 100),
      }
    })
  })()

  const top2Labels = paretoData.slice(0, 2).map((d) => d.name).join(' dan ')

  const handleAddFishbone = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFbText) return
    const newItem: FishboneNode = {
      id: 'fb-' + Math.random().toString(36).substr(2, 9),
      category: newFbCategory,
      text: newFbText,
    }
    const updated = [...fishboneItems, newItem]
    setFishboneItems(updated)
    saveFishbones(projectId, updated).catch(console.error)
    setNewFbText('')
  }

  const handleDeleteFb = (id: string) => {
    if (!window.confirm('Hapus item fishbone ini?')) return
    const updated = fishboneItems.filter((item) => item.id !== id)
    setFishboneItems(updated)
    saveFishbones(projectId, updated).catch(console.error)
  }

  const handleSave5Why = (
    index: number, field: 'why' | 'answer', value: string,
    l2?: number, l3?: number, l4?: number, l5?: number
  ) => {
    const updated = [...whys]
    let node = updated[index]
    if (l2 !== undefined) node = node.children![l2]
    if (l3 !== undefined) node = node.children![l3]
    if (l4 !== undefined) node = node.children![l4]
    if (l5 !== undefined) node = node.children![l5]
    if (node) node[field] = value
    setWhys(updated)
    saveFiveWhys(projectId, updated).catch(console.error)
  }

  const handleAddWhyNode = () => {
    const blank: WhyNode = {
      level: 1, why: 'Mengapa masalah ini terjadi?', answer: '',
      children: [{ level: 2, why: 'Mengapa demikian?', answer: '',
        children: [{ level: 3, why: 'Mengapa demikian?', answer: '',
          children: [{ level: 4, why: 'Mengapa demikian?', answer: '',
            children: [{ level: 5, why: 'Mengapa demikian?', answer: '' }]
          }]
        }]
      }]
    }
    const updated = [...whys, blank]
    setWhys(updated)
    saveFiveWhys(projectId, updated).catch(console.error)
  }

  const handleDeleteWhyNode = (index: number) => {
    if (!window.confirm('Hapus analisis 5-Why ini?')) return
    const updated = whys.filter((_, i) => i !== index)
    setWhys(updated)
    saveFiveWhys(projectId, updated).catch(console.error)
  }

  const handleTriggerAI = async () => {
    setAiLoading(true)
    try {
      // Always derive scores from the ACTIVE projectId — never fall back to a global/default query
      const scores = (await getAssessments(projectId)).reduce((acc: any, curr: any) => {
        acc[curr.dimension] = curr.percentage_score
        return acc
      }, {})

      // VOM entries dari Supabase (sudah load di db.ts getVom)
      const { getVom } = await import('@/lib/db')
      const vomData = await getVom(projectId)
      const vomList = vomData.map((v: any) => v.problem || v.problem_description || '')

      // fishboneItems and whys are already loaded from getMockDB()[projectId] in useEffect
      const response = await fetch('/api/ai-consultant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: project?.title,
          companyName: project?.company_name,
          vomList: vomList,
          pqcdsmScores: scores,
          whyTree: whys,
          fishboneItems,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || `Server error (${response.status})`)
      }
      setAiResult(result)
    } catch (err: any) {
      alert(`Gagal memanggil AI Consultant: ${err.message}`)
    } finally {
      setAiLoading(false)
    }
  }

  const handleApplyAiRecommendations = async () => {
    if (!aiResult) return
    try {
      // Fetch current action plans dari Supabase
      const current = await getActionPlans(projectId)
      const newActions: ActionPlan[] = aiResult.priority_recommendations.map((rec: any) => ({
        // Biarkan ID kosong/dummy — saveActionPlans akan insert tanpa id,
        // sehingga Supabase yang generate UUID
        id: 'new-' + Math.random().toString(36).substr(2, 9),
        project_id: projectId,
        title: rec.program,
        description: rec.description,
        methodology: rec.program,
        dimension: 'productivity' as const,
        kpi_name: 'Dampak Perbaikan',
        kpi_baseline: 0, kpi_target: 100, kpi_unit: '%',
        pic_name: 'Supervisor',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'belum_mulai' as const,
        progress_percentage: 0,
      }))
      const merged = [...current, ...newActions]
      await saveActionPlans(projectId, merged)
      alert('Rekomendasi AI berhasil diterapkan ke Action Plan!')
    } catch (err: any) {
      alert(`Gagal menerapkan rekomendasi: ${err.message}`)
    }
  }

  if (!project) return null

  const categories = [
    { id: 'man', label: 'Man (Manusia)', color: '#ec4899' },
    { id: 'machine', label: 'Machine (Mesin)', color: '#f59e0b' },
    { id: 'method', label: 'Method (Metode)', color: '#6366f1' },
    { id: 'material', label: 'Material (Bahan)', color: '#10b981' },
    { id: 'measurement', label: 'Measurement (Alat Ukur)', color: '#8b5cf6' },
    { id: 'environment', label: 'Environment (Lingkungan)', color: '#06b6d4' },
  ] as const

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fase ANALYZE: Analisis Akar Penyebab (RCA) &amp; AI Consultant</p>
        </div>
      </div>

      {/* Advance phase banner */}
      <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 phase-banner">
        <div>
          <p className="text-xs font-semibold text-indigo-300">Fase Saat Ini: <span className="uppercase font-black">ANALYZE</span></p>
          <p className="text-[10px] text-slate-500 mt-0.5">Lengkapi Fishbone, 5-Why, dan analisis AI sebelum lanjut ke IMPROVE.</p>
        </div>
        <button
          onClick={async () => {
            // Validasi: minimal ada 1 item fishbone atau 1 analisis 5-why sebelum lanjut ke IMPROVE
            if (fishboneItems.length === 0 && whys.length === 0) {
              alert('Harap isi minimal satu item Fishbone atau satu analisis 5-Why sebelum melanjutkan ke fase IMPROVE.')
              return
            }
            if (project.status === 'analyze') {
              await updateProjectPhase(projectId, 'improve')
            }
            router.push(`/projects/${projectId}/improve`)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer">
          Lanjut ke IMPROVE <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 overflow-x-auto pb-1">
        {[
          { id: 'fishbone', name: 'Ishikawa Fishbone' },
          { id: '5why', name: '5-Why Analysis' },
          { id: 'pareto', name: 'Pareto Chart' },
          // Tab AI hanya muncul untuk konsultan
          ...(isKonsultan ? [{ id: 'ai', name: '🤖 Gemini AI Consultant' }] : []),
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-b-2 bg-amber-50 text-amber-800'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            style={activeTab === tab.id ? { borderBottomColor: 'var(--gold-400)', borderBottomWidth: '2px' } : {}}>
            {tab.name}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 md:p-8">

        {/* ── FISHBONE ── */}
        {activeTab === 'fishbone' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-850 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-200">Diagram Fishbone (RCA)</h2>
                <p className="text-xs text-slate-500">Petakan potensi penyebab masalah berdasarkan kategori 6M</p>
              </div>
              <form onSubmit={handleAddFishbone} className="flex flex-wrap gap-2">
                <select value={newFbCategory} onChange={(e) => setNewFbCategory(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none">
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <input type="text" required placeholder="Detail kendala..." value={newFbText}
                  onChange={(e) => setNewFbText(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250 focus:outline-none w-48" />
                <button type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> Tambah
                </button>
              </form>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {categories.map((cat) => {
                const items = fishboneItems.filter((item) => item.category === cat.id)
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
                        items.map((item) => (
                          <div key={item.id} className="flex justify-between items-start bg-slate-900/60 border border-slate-850 p-2.5 rounded-lg text-xs">
                            <span className="text-slate-300 leading-normal">{item.text}</span>
                            <button onClick={() => handleDeleteFb(item.id)} className="text-slate-600 hover:text-red-400 ml-2">✕</button>
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

        {/* ── 5-WHY ── */}
        {activeTab === '5why' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-850 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-200">5-Why Analysis</h2>
                <p className="text-xs text-slate-500">Mencari akar terdalam dari kendala yang terjadi</p>
              </div>
              <button onClick={handleAddWhyNode}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-xs font-bold rounded-xl text-white cursor-pointer">
                <Plus className="h-3.5 w-3.5" /> Tambah Analisis
              </button>
            </div>
            {whys.length === 0 ? (
              <div className="text-center py-10 text-sm text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                Belum ada analisis 5-Why. Klik "Tambah Analisis" untuk memulai.
              </div>
            ) : (
              <div className="space-y-8 max-w-3xl mx-auto">
                {whys.map((w, idx) => (
                  <div key={idx} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Analisis #{idx + 1}</span>
                      <button onClick={() => handleDeleteWhyNode(idx)} className="text-xs text-red-400 hover:text-red-300">Hapus</button>
                    </div>
                    {/* Level 1 */}
                    <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl relative">
                      <span className="absolute -left-3 top-4 h-6 w-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold flex items-center justify-center text-indigo-400">1</span>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 ml-4">Why #1</label>
                      <input type="text" value={w.why} onChange={(e) => handleSave5Why(idx, 'why', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-350 focus:outline-none" />
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 ml-4">Jawaban</label>
                      <input type="text" value={w.answer} onChange={(e) => handleSave5Why(idx, 'answer', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250 focus:outline-none" />
                    </div>
                    {/* Level 2-5 */}
                    {w.children?.map((c1, i1) => (
                      <div key={i1} className="pl-6 border-l border-slate-800 space-y-4">
                        <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl relative">
                          <span className="absolute -left-3 top-4 h-6 w-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold flex items-center justify-center text-indigo-400">2</span>
                          <input type="text" value={c1.why} onChange={(e) => handleSave5Why(idx, 'why', e.target.value, i1)}
                            placeholder="Why #2" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-350 focus:outline-none" />
                          <input type="text" value={c1.answer} onChange={(e) => handleSave5Why(idx, 'answer', e.target.value, i1)}
                            placeholder="Jawaban #2" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250 focus:outline-none" />
                        </div>
                        {c1.children?.map((c2, i2) => (
                          <div key={i2} className="pl-6 border-l border-slate-800 space-y-4">
                            <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl relative">
                              <span className="absolute -left-3 top-4 h-6 w-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold flex items-center justify-center text-indigo-400">3</span>
                              <input type="text" value={c2.why} onChange={(e) => handleSave5Why(idx, 'why', e.target.value, i1, i2)}
                                placeholder="Why #3" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-350 focus:outline-none" />
                              <input type="text" value={c2.answer} onChange={(e) => handleSave5Why(idx, 'answer', e.target.value, i1, i2)}
                                placeholder="Jawaban #3" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250 focus:outline-none" />
                            </div>
                            {c2.children?.map((c3, i3) => (
                              <div key={i3} className="pl-6 border-l border-slate-800 space-y-4">
                                <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl relative">
                                  <span className="absolute -left-3 top-4 h-6 w-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold flex items-center justify-center text-indigo-400">4</span>
                                  <input type="text" value={c3.why} onChange={(e) => handleSave5Why(idx, 'why', e.target.value, i1, i2, i3)}
                                    placeholder="Why #4" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-350 focus:outline-none" />
                                  <input type="text" value={c3.answer} onChange={(e) => handleSave5Why(idx, 'answer', e.target.value, i1, i2, i3)}
                                    placeholder="Jawaban #4" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250 focus:outline-none" />
                                </div>
                                {c3.children?.map((c4, i4) => (
                                  <div key={i4} className="pl-6 border-l border-slate-800">
                                    <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl relative">
                                      <span className="absolute -left-3 top-4 h-6 w-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold flex items-center justify-center text-emerald-400">5</span>
                                      <input type="text" value={c4.why} onChange={(e) => handleSave5Why(idx, 'why', e.target.value, i1, i2, i3, i4)}
                                        placeholder="Why #5" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-350 focus:outline-none" />
                                      <input type="text" value={c4.answer} onChange={(e) => handleSave5Why(idx, 'answer', e.target.value, i1, i2, i3, i4)}
                                        placeholder="Jawaban #5 (Akar masalah sesungguhnya)" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250 focus:outline-none" />
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
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PARETO — dihitung dari data assessment ── */}
        {activeTab === 'pareto' && (
          <div className="space-y-6">
            <div className="border-b border-slate-850 pb-4">
              <h2 className="text-lg font-bold text-slate-200">Analisis Pareto (80/20 Rule)</h2>
              <p className="text-xs text-slate-500">
                Dihitung otomatis dari gap skor PQCDSM — dimensi dengan skor terendah = masalah terbesar
              </p>
            </div>

            {paretoData.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
                Belum ada data assessment. Selesaikan fase MEASURE terlebih dahulu untuk melihat Pareto.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-8 bg-slate-950/40 border border-slate-850 p-4 rounded-3xl h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={paretoData}>
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: 'Gap Skor', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 9 }} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: 'Kumulatif %', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 9 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8 }}
                        formatter={(val: any, name: any) => [name === 'cumulative' ? `${val}%` : val, name === 'cumulative' ? 'Kumulatif' : 'Gap Skor']} />
                      <Bar yAxisId="left" dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#ec4899" strokeWidth={2.5} dot={{ r: 4, fill: '#ec4899' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="lg:col-span-4 space-y-4">
                  {paretoData.slice(0, 2).length > 0 && (
                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                      <div className="flex items-center gap-1 text-xs font-bold text-indigo-400">
                        <AlertCircle className="h-4 w-4" />
                        Prioritas Utama
                      </div>
                      <p className="text-xs text-slate-400 leading-normal">
                        Fokus perbaikan pada dimensi <span className="text-indigo-400 font-semibold">{top2Labels}</span> untuk menyelesaikan{' '}
                        <span className="text-indigo-400 font-bold">{paretoData[1]?.cumulative || paretoData[0]?.cumulative}%</span> dari total gap produktivitas.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {paretoData.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-950/60 border border-slate-850 px-3.5 py-2 rounded-xl text-xs">
                        <span className="font-semibold text-slate-350 truncate">{item.name}</span>
                        <div className="flex items-center gap-3 ml-2 shrink-0">
                          <span className="text-slate-500">Skor: <span className="text-slate-300">{item.skor}%</span></span>
                          <span className="font-bold text-indigo-400">{item.cumulative}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GEMINI AI CONSULTANT — hanya untuk konsultan ── */}
        {activeTab === 'ai' && isKonsultan && (
          <div className="space-y-6">
            <div className="border-b border-slate-850 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-200">Gemini AI Productivity Consultant</h2>
                <p className="text-xs text-slate-500">
                  Didukung Google Gemini AI — analisis data PQCDSM, Fishbone, dan 5-Why secara otomatis
                </p>
              </div>
              <button onClick={handleTriggerAI} disabled={aiLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-sm font-semibold rounded-xl text-white transition-all cursor-pointer disabled:opacity-50">
                <Sparkles className="h-4 w-4" />
                {aiLoading ? 'Menganalisis...' : 'Analisis Dengan Gemini AI'}
              </button>
            </div>

            {aiLoading && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                <p className="text-xs text-slate-400">Gemini AI sedang memproses data assessment &amp; analisis RCA...</p>
              </div>
            )}

            {!aiLoading && aiResult && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                  <h3 className="text-sm font-bold text-indigo-400 mb-2">Executive Summary</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{aiResult.summary}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Akar Penyebab Utama (RCA)</h3>
                    <ul className="list-disc pl-4 space-y-2 text-xs text-slate-300 leading-normal">
                      {aiResult.root_causes?.map((rc: string, i: number) => <li key={i}>{rc}</li>)}
                    </ul>
                  </div>
                  <div className="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Realistis Baru</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Productivity', val: aiResult.realistic_targets?.productivity, color: 'text-indigo-400' },
                        { label: 'Quality', val: aiResult.realistic_targets?.quality, color: 'text-cyan-400' },
                        { label: 'Cost', val: aiResult.realistic_targets?.cost, color: 'text-emerald-400' },
                      ].map((t) => (
                        <div key={t.label} className="bg-slate-900 border border-slate-850 p-3 rounded-xl text-center">
                          <span className="text-[9px] text-slate-500 block uppercase font-bold">{t.label}</span>
                          <span className={`text-lg font-bold ${t.color}`}>{t.val || 0}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Rekomendasi Action Plan</h3>
                  {aiResult.priority_recommendations?.map((rec: any, idx: number) => (
                    <div key={idx} className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl">
                      <h4 className="text-sm font-bold text-slate-200">{rec.program}</h4>
                      <p className="text-xs text-slate-400 mt-1">{rec.description}</p>
                      <span className="inline-block text-[10px] text-indigo-300 font-semibold mt-2">Estimasi Dampak: {rec.impact}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 flex justify-end">
                  <button onClick={handleApplyAiRecommendations}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-650 hover:bg-indigo-600 text-sm font-bold rounded-xl text-white cursor-pointer shadow-md">
                    Terapkan Rekomendasi ke Action Plan
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {!aiLoading && !aiResult && (
              <div className="p-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-3xl space-y-4">
                <div className="text-5xl">🤖</div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-sm font-bold text-slate-350">Gemini AI Consultant Siap Menganalisis</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Gemini AI akan menggabungkan skor PQCDSM, Voice of Management, Fishbone, dan 5-Why
                    untuk menghasilkan strategi prioritas spesifik yang dapat Anda edit sebelum diterapkan.
                  </p>
                </div>
                <button onClick={handleTriggerAI}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white cursor-pointer">
                  <Sparkles className="h-3.5 w-3.5" />
                  Mulai Analisis Gemini AI
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
