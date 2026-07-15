'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Project, ActionPlan, EfficiencyTarget, EfficiencyActual } from '@/lib/mockData'
import {
  AlertTriangle, CheckCircle2, ShieldAlert, FileCheck, Save,
  Check, ArrowRight, Plus, Trash2, DollarSign, TrendingUp,
  Edit3, MessageSquare, Send, Lock, ChevronDown, ChevronRight, ChevronUp, Sparkles
} from 'lucide-react'
import {
  updateProjectPhase, getProjects, getActionPlans,
  getEfficiencyTargets, saveEfficiencyTargets, saveEfficiencyActuals
} from '@/lib/db'
import { useUserRole } from '@/hooks/useUserRole'
import DashboardShell from '@/components/DashboardShell'

export default function ControlPage() {
  const router    = useRouter()
  const params    = useParams()
  const projectId = params.id as string

  const { userInfo } = useUserRole()
  const isKonsultan  = (userInfo?.role ?? 'perusahaan').toLowerCase() !== 'perusahaan'

  /* ── core ── */
  const [project,     setProject]     = useState<Project | null>(null)
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([])
  
  const [targets, setTargets] = useState<EfficiencyTarget[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  /* ── load ── */
  useEffect(() => {
    async function loadData() {
      const [projects, actions] = await Promise.all([getProjects(), getActionPlans(projectId)])
      const proj = projects.find((p: Project) => p.id === projectId)
      if (!proj) { router.push('/dashboard'); return }
      setProject(proj)
      setActionPlans(actions)

      let dbTargets = await getEfficiencyTargets(projectId)
      if (dbTargets.length === 0) {
        setIsGenerating(true)
        try {
          const res = await fetch('/api/control-efficiency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actionPlans: actions })
          })
          const data = await res.json()
          if (data.targets && data.targets.length > 0) {
             const newTargets = data.targets
             await saveEfficiencyTargets(projectId, newTargets)
             
             // Create initial checkpoints
             const newActuals: any[] = []
             newTargets.forEach((t: any) => {
               const ap = actions.find(a => a.id === t.action_plan_id)
               const startDate = ap?.start_date ? new Date(ap.start_date) : new Date()

               let count = 1
               if (t.duration_unit === 'bulan' && t.duration > 1) {
                  count = t.duration
               } else if (t.duration_unit === 'minggu' && t.duration > 4) {
                  count = Math.ceil(t.duration / 4)
               }

               for(let i=1; i<=count; i++) {
                 const dueDate = new Date(startDate.getTime())
                 if (t.duration_unit === 'bulan') {
                   dueDate.setMonth(dueDate.getMonth() + i)
                 } else {
                   // if minggu and we grouped by month, just approximate
                   const weeks = (t.duration / count) * i
                   dueDate.setDate(dueDate.getDate() + (weeks * 7))
                 }
                 
                 newActuals.push({
                   id: crypto.randomUUID?.() || 'act-' + Math.random(),
                   efficiency_target_id: t.id,
                   checkpoint_number: i,
                   due_date: dueDate.toISOString().split('T')[0],
                   actual_value: null,
                 })
               }
             })
             if (newActuals.length > 0) {
                await saveEfficiencyActuals(newActuals)
             }
             // Reload to get the join
             dbTargets = await getEfficiencyTargets(projectId)
          }
        } catch (err) {
          console.error(err)
        } finally {
          setIsGenerating(false)
        }
      }
      setTargets(dbTargets)
    }
    loadData()
  }, [projectId, router])

  const showSave = (msg: string) => { setSaveMsg(msg); setTimeout(() => setSaveMsg(null), 3000) }

  const handleUpdateActual = async (targetId: string, actualId: string, val: string, note: string) => {
    const numVal = val === '' ? null : Number(val)
    
    // Update local state first
    const updatedTargets = targets.map(t => {
      if (t.id !== targetId) return t
      return {
        ...t,
        actuals: (t.actuals || []).map((a: any) => 
          a.id === actualId ? { ...a, actual_value: numVal, note, input_by: userInfo?.id, input_at: new Date().toISOString() } : a
        )
      }
    })
    setTargets(updatedTargets)

    // Save to DB
    const theTarget = updatedTargets.find(t => t.id === targetId)
    const theActual = theTarget?.actuals?.find((a: any) => a.id === actualId)
    if (theActual) {
      await saveEfficiencyActuals([theActual])
      showSave('Checkpoint disimpan')
    }
  }

  /* ── SELESAI ── */
  const handleFinishPhase = async () => {
    // Check if all checkpoints are filled
    let allFilled = true
    targets.forEach(t => {
      ;(t.actuals || []).forEach((a: any) => {
        if (a.actual_value === null || a.actual_value === undefined) {
          allFilled = false
        }
      })
    })

    if (!allFilled) {
      alert('Terdapat Checkpoint Target Efisiensi yang belum diisi. Mohon lengkapi terlebih dahulu.')
      return
    }

    if (confirm('Fase Control (Pencapaian Target) telah selesai dan akan dibuatkan Laporan Akhir. Lanjutkan?')) {
      await updateProjectPhase(projectId, 'completed')
      router.push(`/projects/${projectId}/reports`)
    }
  }

  // Pengelompokan Targets by Problem Title
  const groupedTargets = targets.reduce((acc, t) => {
    const ap = actionPlans.find(a => a.id === t.action_plan_id)
    const prob = ap?.problem_title || 'Masalah Lainnya'
    if (!acc[prob]) acc[prob] = []
    acc[prob].push(t)
    return acc
  }, {} as Record<string, any[]>)

  if (!project) return null

  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800/60 shadow-lg">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-white">Target Efisiensi &amp; Pencapaian</h1>
            </div>
            <p className="text-slate-400 text-sm">
              Fase Control memastikan implementasi solusi benar-benar menghasilkan efisiensi yang ditargetkan AI.
            </p>
          </div>
          <button
            onClick={handleFinishPhase}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            Selesaikan & Buka Laporan
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {isGenerating && (
          <div className="p-8 text-center bg-slate-900/50 border border-indigo-500/30 rounded-2xl">
            <Sparkles className="w-10 h-10 text-indigo-400 animate-pulse mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">AI Sedang Mengekstrak Target...</h3>
            <p className="text-slate-400 text-sm">Sistem sedang merumuskan metrik &amp; target terukur dari rencana efisiensi Anda.</p>
          </div>
        )}

        {!isGenerating && Object.keys(groupedTargets).length === 0 && (
          <div className="p-8 text-center bg-slate-900/50 border border-slate-800/60 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-300">Belum ada Target Efisiensi</h3>
            <p className="text-slate-500 text-sm mt-2">AI tidak menemukan target efisiensi dari hasil Improve Anda, atau belum di-generate.</p>
          </div>
        )}

        {/* NOTIFIKASI SAVE */}
        {saveMsg && (
          <div className="fixed bottom-4 right-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5">
            <Check className="w-5 h-5" />
            <p className="font-medium text-sm">{saveMsg}</p>
          </div>
        )}

        {/* LIST TARGETS */}
        {!isGenerating && Object.entries(groupedTargets).map(([probTitle, tList]) => (
          <div key={probTitle} className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 px-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              {probTitle}
            </h2>

            {tList.map(t => {
              const ap = actionPlans.find(a => a.id === t.action_plan_id)
              const actuals = t.actuals || []
              const sortedActuals = [...actuals].sort((a,b) => a.checkpoint_number - b.checkpoint_number)
              
              // hitung capain = actual dari checkpoint terakhir
              let capaiPct = 0
              let isTercapai = false
              
              const filledActuals = sortedActuals.filter(a => a.actual_value !== null && a.actual_value !== undefined)
              if (filledActuals.length > 0) {
                 const latestVal = filledActuals[filledActuals.length - 1].actual_value
                 const baseline = t.baseline_value || 0
                 
                 const targetRange = Math.abs(t.target_value - baseline)
                 const currentRange = Math.abs(latestVal - baseline)
                 
                 // If metric is higher=better or lower=better (we assume target_value relative logic is handled by absolute range for simplicity, or just (latestVal / target_value)*100 if baseline is 0)
                 if (baseline === 0 && t.target_value !== 0) {
                    capaiPct = (latestVal / t.target_value) * 100
                 } else if (targetRange !== 0) {
                    capaiPct = (currentRange / targetRange) * 100
                 }

                 if (capaiPct >= 100) isTercapai = true
              }

              return (
                <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  {/* Target Info */}
                  <div className="p-5 flex flex-col md:flex-row gap-5">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-500 mb-1">DARI ACTION PLAN:</p>
                      <p className="text-sm text-slate-300 font-bold mb-3">{ap?.title}</p>
                      
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 mb-3">
                        <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3 text-indigo-400"/> Teks Asli AI:</p>
                        <p className="text-sm text-slate-300 italic">"{t.raw_text}"</p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                           <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Metrik</p>
                           <p className="text-xs font-medium text-slate-300">{t.metric_name}</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                           <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Baseline</p>
                           <p className="text-xs font-medium text-slate-300">{t.baseline_value ?? '-'}</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg border-b-2 border-b-indigo-500/50">
                           <p className="text-[10px] text-indigo-400 uppercase tracking-wider mb-1">Target</p>
                           <p className="text-sm font-bold text-white">{t.target_value}</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                           <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Durasi</p>
                           <p className="text-xs font-medium text-slate-300">{t.duration} {t.duration_unit}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Pencapaian Overall */}
                    <div className="md:w-48 bg-slate-800/30 p-4 rounded-xl flex flex-col items-center justify-center border border-slate-700/30 text-center">
                       <p className="text-xs text-slate-400 mb-2 font-medium">Pencapaian Saat Ini</p>
                       <p className={`text-4xl font-bold mb-2 ${isTercapai ? 'text-emerald-400' : capaiPct > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                         {capaiPct.toFixed(0)}%
                       </p>
                       <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                         <div className={`h-full ${isTercapai ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(capaiPct, 100)}%` }} />
                       </div>
                       <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                         isTercapai ? 'bg-emerald-500/10 text-emerald-400' :
                         filledActuals.length === sortedActuals.length ? 'bg-red-500/10 text-red-400' :
                         'bg-amber-500/10 text-amber-400'
                       }`}>
                         {isTercapai ? 'Tercapai' : filledActuals.length === sortedActuals.length ? 'Tidak Tercapai' : 'Dalam Proses'}
                       </span>
                    </div>
                  </div>

                  {/* Checkpoints */}
                  <div className="border-t border-slate-800 bg-slate-950/30 p-5">
                    <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                       <TrendingUp className="w-4 h-4 text-slate-500" /> Checkpoint Aktual
                    </h4>
                    
                    <div className="space-y-3">
                      {sortedActuals.map((act: any, idx) => (
                        <div key={act.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-slate-900 border border-slate-800 p-3 rounded-xl">
                          <div className="flex items-center gap-3 min-w-[140px]">
                            <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs flex items-center justify-center font-bold">
                              {act.checkpoint_number}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-300">CP {act.checkpoint_number}</p>
                              <p className="text-[10px] text-slate-500">Jatuh tempo: {new Date(act.due_date).toLocaleDateString('id-ID')}</p>
                            </div>
                          </div>
                          
                          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <input 
                                type="number"
                                placeholder={`Nilai Aktual (Target: ${t.target_value})`}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none placeholder:text-slate-600"
                                value={act.actual_value !== null && act.actual_value !== undefined ? act.actual_value : ''}
                                onChange={(e) => {
                                  // Update local temporary state directly before save
                                  handleUpdateActual(t.id, act.id, e.target.value, act.note || '')
                                }}
                              />
                            </div>
                            <div>
                              <input 
                                type="text"
                                placeholder="Catatan (opsional)"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none placeholder:text-slate-600"
                                value={act.note || ''}
                                onChange={(e) => {
                                  handleUpdateActual(t.id, act.id, act.actual_value !== null ? String(act.actual_value) : '', e.target.value)
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </DashboardShell>
  )
}
