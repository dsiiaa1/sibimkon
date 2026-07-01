'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  getProjects, getAssessments, getActionPlans, saveActionPlans,
  getFishbones, saveFishbones, getFiveWhys, saveFiveWhys,
  updateProjectPhase, getMeasureProblems, getAnalyzeNeeds, saveAnalyzeNeeds,
} from '@/lib/db'
import {
  Project, FishboneNode, WhyNode, ActionPlan, Assessment,
  MeasureProblem, AnalyzeNeed,
} from '@/lib/mockData'
import {
  Sparkles, Plus, AlertCircle, ArrowRight,
  PackageCheck, Trash2, CheckCircle2, Download,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  ComposedChart, Line,
} from 'recharts'
import { PQCDSM_LABELS } from '@/lib/utils'
import { useUserRole } from '@/hooks/useUserRole'

export default function AnalyzePage() {
  const router    = useRouter()
  const params    = useParams()
  const projectId = params.id as string

  const { userInfo } = useUserRole()
  const isKonsultan   = (userInfo?.role ?? 'perusahaan').toLowerCase() !== 'perusahaan'

  /* ── tab state ── */
  const [activeTab, setActiveTab] = useState<'fishbone' | '5why' | 'pareto' | 'needs' | 'ai'>('fishbone')

  /* ── core data ── */
  const [project,     setProject]     = useState<Project | null>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])

  /* ── fishbone ── */
  const [fishboneItems, setFishboneItems] = useState<FishboneNode[]>([])
  const [newFbText,     setNewFbText]     = useState('')
  const [newFbCategory, setNewFbCategory] =
    useState<'man'|'machine'|'method'|'material'|'measurement'|'environment'>('man')

  /* ── 5-why ── */
  const [whys, setWhys] = useState<WhyNode[]>([])

  /* ── AI ── */
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult,  setAiResult]  = useState<any>(null)

  /* ── kebutuhan implementasi ── */
  const [measureProblems, setMeasureProblems] = useState<MeasureProblem[]>([])
  const [analyzeNeeds,    setAnalyzeNeeds]    = useState<AnalyzeNeed[]>([])
  const [needSaveMsg,     setNeedSaveMsg]     = useState<string | null>(null)
  const [showNeedForm,    setShowNeedForm]    = useState(false)
  const [needMethod,      setNeedMethod]      = useState('')
  const [needDimension,   setNeedDimension]   = useState('')
  const [needCategory,    setNeedCategory]    = useState<AnalyzeNeed['need_category']>('sdm')
  const [needItem,        setNeedItem]        = useState('')
  const [needQuantity,    setNeedQuantity]    = useState('')
  const [needCost,        setNeedCost]        = useState<number | ''>('')
  const [needResponsible, setNeedResponsible] = useState('')
  const [needNotes,       setNeedNotes]       = useState('')
  const [needAvailable,   setNeedAvailable]   = useState(false)

  /* ── load ── */
  useEffect(() => {
    async function loadData() {
      const projects = await getProjects()
      const proj = projects.find((p: Project) => p.id === projectId)
      if (!proj) { router.push('/dashboard'); return }
      setProject(proj)

      const [existingAssessments, fishbones, fiveWhys, mProblems, aNeeds] = await Promise.all([
        getAssessments(projectId),
        getFishbones(projectId),
        getFiveWhys(projectId),
        getMeasureProblems(projectId),
        getAnalyzeNeeds(projectId),
      ])
      setAssessments(existingAssessments)
      setFishboneItems(fishbones)
      setWhys(fiveWhys)
      setMeasureProblems(mProblems)
      setAnalyzeNeeds(aNeeds)

      if (mProblems.length > 0 && mProblems[0].recommended_methods?.length > 0) {
        setNeedMethod(mProblems[0].recommended_methods[0].method)
        setNeedDimension(mProblems[0].pqcdsm_dimension)
      }
    }
    loadData()
  }, [projectId, router])

  /* ── pareto (computed) ── */
  const paretoData = (() => {
    if (assessments.length === 0) return []
    const sorted = [...assessments].sort((a, b) => a.percentage_score - b.percentage_score)
    const totalGap = sorted.reduce((acc, a) => acc + (100 - a.percentage_score), 0) || 1
    let cumulative = 0
    return sorted.map((a) => {
      const gap  = 100 - a.percentage_score
      const pct  = Math.round((gap / totalGap) * 100)
      cumulative += pct
      const info = PQCDSM_LABELS[a.dimension] || { label: a.dimension, icon: '' }
      return { name: `${info.icon} ${info.label}`, value: gap, skor: a.percentage_score, percentage: pct, cumulative: Math.min(cumulative, 100) }
    })
  })()
  const top2Labels = paretoData.slice(0, 2).map((d) => d.name).join(' dan ')

  /* ── computed for needs tab ── */
  const needMethods        = Array.from(new Set(analyzeNeeds.map((n) => n.method_name)))
  const needTotalCost      = analyzeNeeds.reduce((a, n) => a + (n.estimated_cost || 0), 0)
  const needAvailableCount = analyzeNeeds.filter((n) => n.is_available).length

  /* ── fishbone handlers ── */
  const handleAddFishbone = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFbText) return
    const item: FishboneNode = { id: 'fb-' + Math.random().toString(36).substr(2,9), category: newFbCategory, text: newFbText }
    const updated = [...fishboneItems, item]
    setFishboneItems(updated)
    saveFishbones(projectId, updated).catch(console.error)
    setNewFbText('')
  }
  const handleDeleteFb = (id: string) => {
    if (!window.confirm('Hapus item fishbone ini?')) return
    const updated = fishboneItems.filter((i) => i.id !== id)
    setFishboneItems(updated)
    saveFishbones(projectId, updated).catch(console.error)
  }

  /* ── 5-why handlers ── */
  const handleSave5Why = (index: number, field: 'why'|'answer', value: string, l2?: number, l3?: number, l4?: number, l5?: number) => {
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
    const blank: WhyNode = { level:1, why:'Mengapa masalah ini terjadi?', answer:'', children:[{ level:2, why:'Mengapa demikian?', answer:'', children:[{ level:3, why:'Mengapa demikian?', answer:'', children:[{ level:4, why:'Mengapa demikian?', answer:'', children:[{ level:5, why:'Mengapa demikian?', answer:'' }] }] }] }] }
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

  /* ── AI handlers ── */
  const handleTriggerAI = async () => {
    setAiLoading(true)
    try {
      const scores = (await getAssessments(projectId)).reduce((acc: any, curr: any) => { acc[curr.dimension] = curr.percentage_score; return acc }, {})
      const { getVom } = await import('@/lib/db')
      const vomData   = await getVom(projectId)
      const vomList   = vomData.map((v: any) => v.problem || v.problem_description || '')
      const response  = await fetch('/api/ai-consultant', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectTitle: project?.title, companyName: project?.company_name, vomList, pqcdsmScores: scores, whyTree: whys, fishboneItems }) })
      const result    = await response.json()
      if (!response.ok) throw new Error(result?.error || `Server error (${response.status})`)
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
      const current    = await getActionPlans(projectId)
      const newActions: ActionPlan[] = aiResult.priority_recommendations.map((rec: any) => ({
        id: 'new-' + Math.random().toString(36).substr(2,9), project_id: projectId,
        title: rec.program, description: rec.description, methodology: rec.program,
        dimension: 'productivity' as const, kpi_name: 'Dampak Perbaikan',
        kpi_baseline: 0, kpi_target: 100, kpi_unit: '%', pic_name: 'Supervisor',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0],
        status: 'belum_mulai' as const, progress_percentage: 0,
      }))
      await saveActionPlans(projectId, [...current, ...newActions])
      alert('Rekomendasi AI berhasil diterapkan ke Action Plan!')
    } catch (err: any) {
      alert(`Gagal menerapkan rekomendasi: ${err.message}`)
    }
  }

  /* ── needs handlers ── */
  const showNeedToast = (msg: string) => { setNeedSaveMsg(msg); setTimeout(() => setNeedSaveMsg(null), 3000) }
  const handleAddNeed = () => {
    if (!needItem.trim() || !needMethod.trim()) return
    const newNeed: AnalyzeNeed = {
      id: 'need-' + Math.random().toString(36).substr(2,9), project_id: projectId,
      method_name: needMethod.trim(), pqcdsm_dimension: needDimension || undefined,
      need_category: needCategory, need_item: needItem.trim(),
      quantity: needQuantity.trim() || undefined,
      estimated_cost: needCost !== '' ? Number(needCost) : undefined,
      responsible: needResponsible.trim() || undefined,
      notes: needNotes.trim() || undefined, is_available: needAvailable,
    }
    const updated = [...analyzeNeeds, newNeed]
    setAnalyzeNeeds(updated)
    saveAnalyzeNeeds(projectId, updated).catch(console.error)
    setNeedItem(''); setNeedQuantity(''); setNeedCost(''); setNeedResponsible(''); setNeedNotes(''); setNeedAvailable(false); setShowNeedForm(false)
    showNeedToast('Kebutuhan berhasil ditambahkan!')
  }
  const handleToggleAvailable = (id: string) => {
    const updated = analyzeNeeds.map((n) => n.id === id ? { ...n, is_available: !n.is_available } : n)
    setAnalyzeNeeds(updated)
    saveAnalyzeNeeds(projectId, updated).catch(console.error)
  }
  const handleDeleteNeed = (id: string) => {
    if (!window.confirm('Hapus item kebutuhan ini?')) return
    const updated = analyzeNeeds.filter((n) => n.id !== id)
    setAnalyzeNeeds(updated)
    saveAnalyzeNeeds(projectId, updated).catch(console.error)
  }

  const handleExportNeeds = () => {
    if (analyzeNeeds.length === 0) {
      alert('Tidak ada data kebutuhan untuk diekspor.')
      return
    }

    const headers = [
      'Metode/Program',
      'Kategori',
      'Item Kebutuhan',
      'Jumlah/Kapasitas',
      'Estimasi Biaya (Rp)',
      'PIC Penanggung Jawab',
      'Status Ketersediaan',
      'Catatan'
    ]

    const rows = analyzeNeeds.map(n => [
      n.method_name,
      n.need_category.toUpperCase(),
      n.need_item,
      n.quantity || '-',
      n.estimated_cost != null ? String(n.estimated_cost) : '0',
      n.responsible || '-',
      n.is_available ? 'Tersedia' : 'Belum Tersedia',
      n.notes || '-'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const escaped = String(val).replace(/"/g, '""')
        return `"${escaped}"`
      }).join(','))
    ].join('\r\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Kebutuhan_Implementasi_${project?.project_code || 'Proyek'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!project) return null

  const fbCategories = [
    { id: 'man',         label: 'Man (Manusia)',          color: '#ec4899' },
    { id: 'machine',     label: 'Machine (Mesin)',         color: '#f59e0b' },
    { id: 'method',      label: 'Method (Metode)',         color: '#6366f1' },
    { id: 'material',    label: 'Material (Bahan)',        color: '#10b981' },
    { id: 'measurement', label: 'Measurement (Alat Ukur)', color: '#8b5cf6' },
    { id: 'environment', label: 'Environment (Lingkungan)', color: '#06b6d4' },
  ] as const

  const needCategoryLabels: Record<AnalyzeNeed['need_category'], string> = {
    sdm: '👤 SDM / Tenaga Ahli', alat: '🔧 Alat & Mesin', bahan: '📦 Bahan & Material',
    sop: '📋 SOP & Prosedur', pelatihan: '🎓 Pelatihan', anggaran: '💰 Anggaran', lainnya: '🗂️ Lainnya',
  }

  const tabs = [
    { id: 'fishbone', name: 'Ishikawa Fishbone' },
    { id: '5why',     name: '5-Why Analysis' },
    { id: 'pareto',   name: 'Pareto Chart' },
    { id: 'needs',    name: '📦 Kebutuhan Implementasi' },
  ]

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
          <p className="text-[10px] text-slate-500 mt-0.5">Lengkapi Fishbone, 5-Why, dan kebutuhan implementasi sebelum lanjut ke IMPROVE.</p>
        </div>
        <button
          onClick={async () => {
            if (fishboneItems.length === 0 && whys.length === 0) {
              alert('Harap isi minimal satu item Fishbone atau satu analisis 5-Why sebelum melanjutkan ke IMPROVE.')
              return
            }
            if (project.status === 'analyze') await updateProjectPhase(projectId, 'improve')
            router.push(`/projects/${projectId}/improve`)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl text-white cursor-pointer"
        >
          Lanjut ke IMPROVE <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b border-slate-800 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-amber-50 text-amber-800'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            style={activeTab === tab.id ? { borderBottomColor: 'var(--gold-400,#d97706)', borderBottomWidth: '2px' } : {}}>
            {tab.name}
          </button>
        ))}
      </div>

      {/* ── Tab panels ── */}
      <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 md:p-8">


        {/* ══ FISHBONE ══ */}
        {activeTab === 'fishbone' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-850 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-200">Diagram Fishbone (RCA)</h2>
                <p className="text-xs text-slate-500">Petakan potensi penyebab masalah berdasarkan kategori 6M</p>
              </div>
              <form onSubmit={handleAddFishbone} className="flex flex-wrap gap-2">
                <select value={newFbCategory} onChange={(e) => setNewFbCategory(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none">
                  {fbCategories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <input type="text" required placeholder="Detail kendala..." value={newFbText} onChange={(e) => setNewFbText(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250 focus:outline-none w-48" />
                <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> Tambah
                </button>
              </form>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {fbCategories.map((cat) => {
                const items = fishboneItems.filter((i) => i.category === cat.id)
                return (
                  <div key={cat.id} className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                      <span className="text-xs font-bold" style={{ color: cat.color }}>{cat.label}</span>
                      <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded font-mono text-slate-500">{items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.length === 0
                        ? <p className="text-[11px] text-slate-600 italic">Belum ada input</p>
                        : items.map((item) => (
                          <div key={item.id} className="flex justify-between items-start bg-slate-900/60 border border-slate-850 p-2.5 rounded-lg text-xs">
                            <span className="text-slate-300 leading-normal">{item.text}</span>
                            <button onClick={() => handleDeleteFb(item.id)} className="text-slate-600 hover:text-red-400 ml-2 cursor-pointer">✕</button>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}


        {/* ══ 5-WHY ══ */}
        {activeTab === '5why' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-850 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-200">5-Why Analysis</h2>
                <p className="text-xs text-slate-500">Mencari akar terdalam dari kendala yang terjadi</p>
              </div>
              <button onClick={handleAddWhyNode}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white cursor-pointer">
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
                      <button onClick={() => handleDeleteWhyNode(idx)} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">Hapus</button>
                    </div>
                    {/* Level 1 */}
                    <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl relative">
                      <span className="absolute -left-3 top-4 h-6 w-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold flex items-center justify-center text-indigo-400">1</span>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 ml-4">Why #1</label>
                      <input type="text" value={w.why} onChange={(e) => handleSave5Why(idx,'why',e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-350 focus:outline-none" />
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 ml-4">Jawaban</label>
                      <input type="text" value={w.answer} onChange={(e) => handleSave5Why(idx,'answer',e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250 focus:outline-none" />
                    </div>
                    {w.children?.map((c1,i1) => (
                      <div key={i1} className="pl-6 border-l border-slate-800 space-y-4">
                        <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl relative">
                          <span className="absolute -left-3 top-4 h-6 w-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold flex items-center justify-center text-indigo-400">2</span>
                          <input type="text" value={c1.why}    onChange={(e) => handleSave5Why(idx,'why',e.target.value,i1)}    placeholder="Why #2"     className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-350 focus:outline-none" />
                          <input type="text" value={c1.answer} onChange={(e) => handleSave5Why(idx,'answer',e.target.value,i1)} placeholder="Jawaban #2" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250 focus:outline-none" />
                        </div>
                        {c1.children?.map((c2,i2) => (
                          <div key={i2} className="pl-6 border-l border-slate-800 space-y-4">
                            <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl relative">
                              <span className="absolute -left-3 top-4 h-6 w-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold flex items-center justify-center text-indigo-400">3</span>
                              <input type="text" value={c2.why}    onChange={(e) => handleSave5Why(idx,'why',e.target.value,i1,i2)}    placeholder="Why #3"     className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-350 focus:outline-none" />
                              <input type="text" value={c2.answer} onChange={(e) => handleSave5Why(idx,'answer',e.target.value,i1,i2)} placeholder="Jawaban #3" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250 focus:outline-none" />
                            </div>
                            {c2.children?.map((c3,i3) => (
                              <div key={i3} className="pl-6 border-l border-slate-800 space-y-4">
                                <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl relative">
                                  <span className="absolute -left-3 top-4 h-6 w-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold flex items-center justify-center text-indigo-400">4</span>
                                  <input type="text" value={c3.why}    onChange={(e) => handleSave5Why(idx,'why',e.target.value,i1,i2,i3)}    placeholder="Why #4"     className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-350 focus:outline-none" />
                                  <input type="text" value={c3.answer} onChange={(e) => handleSave5Why(idx,'answer',e.target.value,i1,i2,i3)} placeholder="Jawaban #4" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250 focus:outline-none" />
                                </div>
                                {c3.children?.map((c4,i4) => (
                                  <div key={i4} className="pl-6 border-l border-slate-800">
                                    <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl relative">
                                      <span className="absolute -left-3 top-4 h-6 w-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold flex items-center justify-center text-emerald-400">5</span>
                                      <input type="text" value={c4.why}    onChange={(e) => handleSave5Why(idx,'why',e.target.value,i1,i2,i3,i4)}    placeholder="Why #5"                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-350 focus:outline-none" />
                                      <input type="text" value={c4.answer} onChange={(e) => handleSave5Why(idx,'answer',e.target.value,i1,i2,i3,i4)} placeholder="Jawaban #5 (Akar masalah sesungguhnya)" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250 focus:outline-none" />
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


        {/* ══ PARETO ══ */}
        {activeTab === 'pareto' && (
          <div className="space-y-6">
            <div className="border-b border-slate-850 pb-4">
              <h2 className="text-lg font-bold text-slate-200">Analisis Pareto (80/20 Rule)</h2>
              <p className="text-xs text-slate-500">Dihitung otomatis dari gap skor PQCDSM — dimensi dengan skor terendah = masalah terbesar</p>
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
                      <defs>
                        <linearGradient id="paretoBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.85} />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.15} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fill:'#94a3b8', fontSize:10 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} label={{ value:'Gap Skor', angle:-90, position:'insideLeft', fill:'#64748b', fontSize:9, offset: -5 }} />
                      <YAxis yAxisId="right" orientation="right" domain={[0,100]} tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} label={{ value:'Kumulatif %', angle:90, position:'insideRight', fill:'#64748b', fontSize:9, offset: -5 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor:'rgba(15, 23, 42, 0.95)', borderColor:'#4f46e5', borderRadius:12, backdropFilter: 'blur(8px)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                        formatter={(val:any, name:any) => [name==='cumulative' ? `${val}%` : val, name==='cumulative' ? 'Kumulatif' : 'Gap Skor']} 
                      />
                      <Bar yAxisId="left" dataKey="value" fill="url(#paretoBarGrad)" stroke="#6366f1" strokeWidth={1} radius={[4,4,0,0]} animationDuration={1200} />
                      <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#ec4899" strokeWidth={3} dot={{ r:4, fill:'#ec4899', strokeWidth: 2, stroke: '#0f172a' }} activeDot={{ r: 6 }} animationDuration={1500} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="lg:col-span-4 space-y-4">
                  {paretoData.slice(0,2).length > 0 && (
                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                      <div className="flex items-center gap-1 text-xs font-bold text-indigo-400">
                        <AlertCircle className="h-4 w-4" /> Prioritas Utama
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


        {/* ══ KEBUTUHAN IMPLEMENTASI ══ */}
        {activeTab === 'needs' && (
          <div className="space-y-6">
            <div className="border-b border-slate-850 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-200">Analisis Kebutuhan Implementasi</h2>
                <p className="text-xs text-slate-500">Identifikasi SDM, alat, bahan, SOP, pelatihan, dan anggaran yang diperlukan untuk menjalankan metode yang direkomendasikan</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={handleExportNeeds}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold rounded-xl text-slate-300 cursor-pointer transition-all">
                  <Download className="h-3.5 w-3.5" /> Ekspor CSV
                </button>
                <button onClick={() => setShowNeedForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> Tambah Kebutuhan
                </button>
              </div>
            </div>

            {needSaveMsg && (
              <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                ✅ {needSaveMsg}
              </div>
            )}

            {/* Chip metode dari Measure */}
            {measureProblems.length > 0 && (
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 space-y-2">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Metode Direkomendasikan dari Fase MEASURE</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(
                    measureProblems.flatMap((p) => p.recommended_methods.slice(0,3).map((m) => m.method))
                  )).map((method, i) => (
                    <button key={i} onClick={() => { setNeedMethod(method); setShowNeedForm(true) }}
                      className="px-2.5 py-1 text-[10px] font-bold bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 rounded-lg hover:bg-indigo-500/20 cursor-pointer transition-all">
                      + {method}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-600">Klik metode untuk langsung mengisi kebutuhan implementasinya</p>
              </div>
            )}

            {/* Form tambah */}
            {showNeedForm && (
              <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Detail Kebutuhan Baru</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Metode / Program *</label>
                    <input type="text" value={needMethod} onChange={(e) => setNeedMethod(e.target.value)} placeholder="Misal: Lean Manufacturing"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-250 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Kategori Kebutuhan *</label>
                    <select value={needCategory} onChange={(e) => setNeedCategory(e.target.value as AnalyzeNeed['need_category'])}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500">
                      {(Object.entries(needCategoryLabels) as [AnalyzeNeed['need_category'], string][]).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Item Kebutuhan *</label>
                    <input type="text" value={needItem} onChange={(e) => setNeedItem(e.target.value)} placeholder="Misal: Pelatih Time Study bersertifikat, Stopwatch digital 5 unit"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-250 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Jumlah / Kapasitas</label>
                    <input type="text" value={needQuantity} onChange={(e) => setNeedQuantity(e.target.value)} placeholder="Misal: 2 orang, 5 unit, 3 hari"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-250 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Estimasi Biaya (Rp)</label>
                    <input type="number" min="0" value={needCost} onChange={(e) => setNeedCost(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Misal: 5000000"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-250 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Penanggung Jawab</label>
                    <input type="text" value={needResponsible} onChange={(e) => setNeedResponsible(e.target.value)} placeholder="Nama / Departemen"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-250 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div className="flex items-center gap-3 pt-4">
                    <button onClick={() => setNeedAvailable((v) => !v)}
                      className={`h-5 w-5 rounded border flex items-center justify-center cursor-pointer transition-all shrink-0 ${needAvailable ? 'bg-emerald-600 border-emerald-500' : 'border-slate-700'}`}>
                      {needAvailable && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </button>
                    <span className="text-xs text-slate-400">Sudah tersedia / terpenuhi</span>
                  </div>
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-800 pt-3">
                  <button onClick={() => setShowNeedForm(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">Batal</button>
                  <button onClick={handleAddNeed} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white cursor-pointer">
                    Simpan Kebutuhan
                  </button>
                </div>
              </div>
            )}

            {/* Daftar kebutuhan */}
            {analyzeNeeds.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm space-y-2">
                <PackageCheck className="h-8 w-8 mx-auto text-slate-700" />
                <p>Belum ada data kebutuhan implementasi.</p>
                <p className="text-xs text-slate-600">Tambahkan kebutuhan SDM, alat, bahan, atau anggaran untuk setiap metode yang akan dijalankan.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-950/50 border border-slate-850 rounded-2xl text-center">
                    <span className="text-xl font-black text-slate-200">{analyzeNeeds.length}</span>
                    <span className="text-[10px] text-slate-500 block font-bold mt-0.5">Total Kebutuhan</span>
                  </div>
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl text-center">
                    <span className="text-xl font-black text-emerald-400">{needAvailableCount}</span>
                    <span className="text-[10px] text-slate-500 block font-bold mt-0.5">Sudah Tersedia</span>
                  </div>
                  <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-2xl text-center">
                    <span className="text-sm font-black text-amber-400">{needTotalCost > 0 ? `Rp ${needTotalCost.toLocaleString('id-ID')}` : '—'}</span>
                    <span className="text-[10px] text-slate-500 block font-bold mt-0.5">Est. Total Biaya</span>
                  </div>
                </div>
                {/* Per metode */}
                {needMethods.map((method) => {
                  const items      = analyzeNeeds.filter((n) => n.method_name === method)
                  const methodCost = items.reduce((a: number, n) => a + (n.estimated_cost || 0), 0)
                  return (
                    <div key={method} className="bg-slate-950/30 border border-slate-800 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 bg-slate-950/60 border-b border-slate-800">
                        <span className="text-sm font-bold text-indigo-300">{method}</span>
                        <div className="flex items-center gap-3 text-[10px]">
                          <span className="text-slate-500">{items.length} item</span>
                          {methodCost > 0 && <span className="text-amber-400 font-bold">Rp {methodCost.toLocaleString('id-ID')}</span>}
                        </div>
                      </div>
                      <div className="divide-y divide-slate-800/50">
                        {items.map((n) => (
                          <div key={n.id} className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-slate-900/30 transition-all group">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <button onClick={() => handleToggleAvailable(n.id)}
                                className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center cursor-pointer shrink-0 transition-all ${n.is_available ? 'bg-emerald-600 border-emerald-500' : 'border-slate-700 hover:border-emerald-600'}`}
                                title={n.is_available ? 'Tandai belum tersedia' : 'Tandai sudah tersedia'}>
                                {n.is_available && <CheckCircle2 className="h-3 w-3 text-white" />}
                              </button>
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">{n.need_category}</span>
                                  {n.is_available && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">✓ Tersedia</span>}
                                </div>
                                <p className={`text-sm font-semibold leading-snug ${n.is_available ? 'text-slate-400 line-through' : 'text-slate-200'}`}>{n.need_item}</p>
                                <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
                                  {n.quantity       && <span>Jumlah: <span className="text-slate-300">{n.quantity}</span></span>}
                                  {n.estimated_cost != null && <span>Biaya: <span className="text-amber-400">Rp {n.estimated_cost.toLocaleString('id-ID')}</span></span>}
                                  {n.responsible    && <span>PIC: <span className="text-slate-300">{n.responsible}</span></span>}
                                </div>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteNeed(n.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-900/20 cursor-pointer transition-all shrink-0">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
