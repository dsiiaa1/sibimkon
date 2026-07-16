'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Project, ActionPlan, EfficiencyTarget, EfficiencyActual, ControlChangeRequest } from '@/lib/mockData'
import {
  AlertTriangle, CheckCircle2, ShieldAlert, FileCheck, Save,
  Check, ArrowRight, Plus, Trash2, DollarSign, TrendingUp,
  Edit3, MessageSquare, Send, Lock, ChevronDown, ChevronRight, ChevronUp, Sparkles
} from 'lucide-react'
import {
  updateProjectPhase, getProjects, getActionPlans,
  getEfficiencyTargets, saveEfficiencyTargets, saveEfficiencyActuals,
  getChangeRequests, submitChangeRequest, reviewChangeRequest, cancelChangeRequest
} from '@/lib/db'
import { useUserRole } from '@/hooks/useUserRole'

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
  const [changeRequests, setChangeRequests] = useState<ControlChangeRequest[]>([])
  const fetchTriggered = useRef(false)

  /* ── load ── */
  useEffect(() => {
    async function loadData() {
      const [projects, actions] = await Promise.all([getProjects(), getActionPlans(projectId)])
      const proj = projects.find((p: Project) => p.id === projectId)
      if (!proj) { router.push('/dashboard'); return }
      setProject(proj)
      setActionPlans(actions)

      let dbTargets = await getEfficiencyTargets(projectId)
      const reqs = await getChangeRequests(projectId)
      setChangeRequests(reqs)
      
      const targetActionPlanIds = new Set(dbTargets.map((t: any) => t.action_plan_id))
      const missingActionPlans = actions.filter((ap: ActionPlan) => !targetActionPlanIds.has(ap.id))

      if (missingActionPlans.length > 0 && !fetchTriggered.current) {
        fetchTriggered.current = true
        setIsGenerating(true)
        try {
          const res = await fetch('/api/control-efficiency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actionPlans: missingActionPlans })
          })
          const data = await res.json()
          if (data.targets && data.targets.length > 0) {
             const newTargets = data.targets
             await saveEfficiencyTargets(projectId, newTargets)
             
             // Create initial checkpoints
             const newActuals: any[] = []
             newTargets.forEach((t: any) => {
               const ap = missingActionPlans.find((a: ActionPlan) => a.id === t.action_plan_id)
               const startDate = ap?.start_date ? new Date(ap.start_date) : new Date()

               let count = 1
               if (t.duration_unit === 'bulan' && t.duration > 1) {
                  count = t.duration
               } else if (t.duration_unit === 'minggu' && t.duration > 4) {
                  count = Math.ceil(t.duration / 4)
               } else if (t.duration_unit === 'tahun' && t.duration > 0) {
                  count = t.duration * 12
               }

               for(let i=1; i<=count; i++) {
                 const dueDate = new Date(startDate.getTime())
                 dueDate.setMonth(dueDate.getMonth() + i)
                 
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
      setChangeRequests(await getChangeRequests(projectId))
    }
    loadData()
  }, [projectId, router])

  const showSave = (msg: string) => { setSaveMsg(msg); setTimeout(() => setSaveMsg(null), 3000) }

  // Approval Workflow Helpers
  const [editingTarget, setEditingTarget] = useState<EfficiencyTarget | null>(null)
  const [editForm, setEditForm] = useState({
    raw_text: '',
    metric_name: '',
    baseline_value: '',
    target_value: '',
    duration: '',
    duration_unit: 'bulan'
  })

  const getPendingRequest = (targetId: string) => {
    return changeRequests.find(r => r.target_id === targetId && r.status === 'pending')
  }

  const getPendingActual = (targetId: string, actualId: string) => {
    const req = getPendingRequest(targetId)
    if (!req || !req.changes?.actuals) return null
    return req.changes.actuals.find((a: any) => a.id === actualId)
  }

  const handleUpdateActual = async (targetId: string, actualId: string, updates: any) => {
    // Update local state first
    const updatedTargets = targets.map(t => {
      if (t.id !== targetId) return t
      return {
        ...t,
        actuals: (t.actuals || []).map((a: any) => 
          a.id === actualId ? { ...a, ...updates, input_by: userInfo?.id, input_at: new Date().toISOString() } : a
        )
      }
    })
    setTargets(updatedTargets)

    // Save to DB
    const theTarget = updatedTargets.find(t => t.id === targetId)
    const theActual = theTarget?.actuals?.find((a: any) => a.id === actualId)
    if (theActual) {
      try {
        await saveEfficiencyActuals([theActual])
        showSave('Checkpoint disimpan')
      } catch (err: any) {
        alert(err.message || 'Gagal menyimpan checkpoint. Pastikan syarat terpenuhi.')
        // revert local state
        setTargets(targets)
      }
    }
  }

  const handleUpdateBaseline = async (targetId: string, val: string) => {
    const numVal = val === '' ? null : Number(val)
    const updatedTargets = targets.map(t => t.id === targetId ? { ...t, baseline_value: numVal } : t)
    setTargets(updatedTargets)

    const theTarget = updatedTargets.find(t => t.id === targetId)
    if (theTarget) {
      try {
        await saveEfficiencyTargets(projectId, [theTarget])
        showSave('Baseline disimpan')
      } catch (err: any) {
        alert(err.message || 'Gagal menyimpan baseline.')
        setTargets(targets)
      }
    }
  }

  const handleSubmitEditRencana = async () => {
    if (!editingTarget) return
    
    const isFirstTimeBaseline = editingTarget.baseline_value === null || editingTarget.baseline_value === undefined;
    const newBaseline = editForm.baseline_value === '' ? null : Number(editForm.baseline_value);
    
    if (isFirstTimeBaseline && newBaseline !== null) {
      try {
        await saveEfficiencyTargets(projectId, [{ ...editingTarget, baseline_value: newBaseline }])
        setTargets(targets.map(t => t.id === editingTarget.id ? { ...t, baseline_value: newBaseline } : t))
      } catch (err) {
        console.error("Gagal save baseline awal:", err)
      }
    }

    const req = {
      id: crypto.randomUUID(),
      project_id: projectId,
      target_id: editingTarget.id,
      requested_by: userInfo?.id || 'unknown',
      requested_at: new Date().toISOString(),
      changes: {
        raw_text: editForm.raw_text,
        metric_name: editForm.metric_name,
        target_value: editForm.target_value === '' ? null : Number(editForm.target_value),
        duration: editForm.duration === '' ? null : Number(editForm.duration),
        duration_unit: editForm.duration_unit
      } as any,
      status: 'pending' as const
    }

    if (!isFirstTimeBaseline) {
        req.changes.baseline_value = newBaseline
    }

    // Only submit if there are actual changes (other than the first-time baseline)
    const hasOtherChanges = req.changes.raw_text !== editingTarget.raw_text ||
                            req.changes.metric_name !== editingTarget.metric_name ||
                            req.changes.target_value !== editingTarget.target_value ||
                            req.changes.duration !== editingTarget.duration ||
                            req.changes.duration_unit !== editingTarget.duration_unit ||
                            (!isFirstTimeBaseline && req.changes.baseline_value !== editingTarget.baseline_value);

    if (!hasOtherChanges) {
       setEditingTarget(null)
       showSave('Baseline awal disimpan')
       return
    }

    try {
      await submitChangeRequest(req)
      setChangeRequests([req, ...changeRequests])
      setEditingTarget(null)
      showSave('Perubahan diajukan, menunggu persetujuan Konsultan')
    } catch (err: any) {
      alert(err.message || 'Gagal mengajukan perubahan')
    }
  }

  const handleReviewRequest = async (req: any, status: 'approved' | 'rejected', rejectReason?: string) => {
    try {
      await reviewChangeRequest(req.id, status, userInfo?.id || 'unknown', rejectReason)
      setChangeRequests(changeRequests.map(r => r.id === req.id ? { ...r, status, reject_reason: rejectReason } : r))
      showSave(`Pengajuan ${status === 'approved' ? 'disetujui' : 'ditolak'}`)
      
      if (status === 'approved') {
        // Apply changes locally to target and actuals
        const updatedTargets = targets.map(t => {
          if (t.id !== req.target_id) return t
          
          let newT = { ...t }
          if (req.changes.baseline_value !== undefined) newT.baseline_value = req.changes.baseline_value
          if (req.changes.target_value !== undefined) newT.target_value = req.changes.target_value
          if (req.changes.duration !== undefined) newT.duration = req.changes.duration
          if (req.changes.duration_unit !== undefined) newT.duration_unit = req.changes.duration_unit
          if (req.changes.raw_text !== undefined) newT.raw_text = req.changes.raw_text
          if (req.changes.metric_name !== undefined) newT.metric_name = req.changes.metric_name

          if (req.changes.actuals && req.changes.actuals.length > 0) {
            newT.actuals = (newT.actuals || []).map((a: any) => {
              const matchingUpdate = req.changes.actuals.find((ua: any) => ua.id === a.id)
              if (matchingUpdate) {
                return { ...a, ...matchingUpdate }
              }
              return a
            })
          }
          return newT
        })
        setTargets(updatedTargets)

        // Save to DB (Targets and Actuals)
        const theTarget = updatedTargets.find(t => t.id === req.target_id)
        if (theTarget) {
          const ap = actionPlans.find(a => a.id === theTarget.action_plan_id)
          const startDate = ap?.start_date ? new Date(ap.start_date) : new Date()

          // Check if duration changed to regenerate actuals
          let actualsToSave = (theTarget.actuals || []).filter((a: any) => req.changes.actuals?.some((ua: any) => ua.id === a.id))
          let actualsToDelete: string[] = []

          if (req.changes.duration !== undefined || req.changes.duration_unit !== undefined) {
             let count = 1
             const dur = theTarget.duration || 1
             const unit = theTarget.duration_unit || 'bulan'
             
             if (unit === 'bulan' && dur > 1) {
                count = dur
             } else if (unit === 'minggu' && dur > 4) {
                count = Math.ceil(dur / 4)
             } else if (unit === 'tahun' && dur > 0) {
                count = dur * 12
             }

             const currentActuals = [...(theTarget.actuals || [])].sort((a,b) => a.checkpoint_number - b.checkpoint_number)
             const newActualsList = [...currentActuals]

             if (count > currentActuals.length) {
                // Add new actuals
                for(let i = currentActuals.length + 1; i <= count; i++) {
                  const dueDate = new Date(startDate.getTime())
                  dueDate.setMonth(dueDate.getMonth() + i)
                  
                  const newAct = {
                    id: crypto.randomUUID?.() || 'act-' + Math.random(),
                    efficiency_target_id: theTarget.id,
                    checkpoint_number: i,
                    due_date: dueDate.toISOString().split('T')[0],
                    actual_value: null,
                  }
                  newActualsList.push(newAct)
                  actualsToSave.push(newAct)
                }
             } else if (count < currentActuals.length) {
                // Remove extra actuals (only if empty)
                for(let i = currentActuals.length; i > count; i--) {
                   const act = newActualsList[i - 1]
                   if (act.actual_value === null || act.actual_value === undefined) {
                      actualsToDelete.push(act.id)
                      newActualsList.splice(i - 1, 1)
                   }
                }
             }
             theTarget.actuals = newActualsList
          }

          await saveEfficiencyTargets(projectId, [theTarget])
          
          if (actualsToSave.length > 0) {
             await saveEfficiencyActuals(actualsToSave)
          }
        }
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memproses review')
    }
  }

  const handleCancelRequest = async (reqId: string) => {
    if (!confirm('Batalkan pengajuan ini?')) return
    try {
      await cancelChangeRequest(reqId)
      setChangeRequests(changeRequests.filter(r => r.id !== reqId))
      showSave('Pengajuan dibatalkan')
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan pengajuan')
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
    if (!ap) return acc // Skip orphaned targets
    const prob = ap.problem_title || 'Tindakan Lainnya'
    if (!acc[prob]) acc[prob] = []
    acc[prob].push(t)
    return acc
  }, {} as Record<string, any[]>)

  if (!project) return null

  return (
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

        {/* KONSULTAN REVIEW SECTION */}
        {isKonsultan && changeRequests.filter(r => r.status === 'pending').length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5" />
              Pengajuan Menunggu Persetujuan
            </h2>
            <div className="space-y-4">
              {changeRequests.filter(r => r.status === 'pending').map(req => {
                const relatedTarget = targets.find(t => t.id === req.target_id)
                const relatedAp = actionPlans.find(ap => ap.id === relatedTarget?.action_plan_id)
                return (
                  <div key={req.id} className="bg-slate-900 border border-amber-500/20 p-4 rounded-xl shadow-lg">
                    <p className="text-sm font-semibold text-white mb-1">Target: {relatedTarget?.metric_name}</p>
                    <p className="text-xs text-slate-400 mb-3">Action Plan: {relatedAp?.title}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {req.changes.baseline_value !== undefined && (
                        <div className="bg-slate-950 p-2 rounded">
                          <p className="text-[10px] text-slate-500 uppercase">Baseline</p>
                          <p className="text-sm text-amber-400 line-through opacity-70">{relatedTarget?.baseline_value ?? '-'}</p>
                          <p className="text-sm text-emerald-400 font-bold">{req.changes.baseline_value}</p>
                        </div>
                      )}
                      {req.changes.target_value !== undefined && (
                        <div className="bg-slate-950 p-2 rounded">
                          <p className="text-[10px] text-slate-500 uppercase">Target</p>
                          <p className="text-sm text-amber-400 line-through opacity-70">{relatedTarget?.target_value ?? '-'}</p>
                          <p className="text-sm text-emerald-400 font-bold">{req.changes.target_value}</p>
                        </div>
                      )}
                      {req.changes.duration !== undefined && (
                        <div className="bg-slate-950 p-2 rounded">
                          <p className="text-[10px] text-slate-500 uppercase">Durasi</p>
                          <p className="text-sm text-amber-400 line-through opacity-70">{relatedTarget?.duration} {relatedTarget?.duration_unit}</p>
                          <p className="text-sm text-emerald-400 font-bold">{req.changes.duration} {req.changes.duration_unit}</p>
                        </div>
                      )}
                      {req.changes.actuals && req.changes.actuals.length > 0 && (
                        <div className="bg-slate-950 p-2 rounded col-span-2 md:col-span-4">
                          <p className="text-[10px] text-slate-500 uppercase mb-2">Pembaruan Nilai Aktual</p>
                          {req.changes.actuals.map((actChange: any) => {
                             const originalAct = relatedTarget?.actuals?.find((a:any) => a.id === actChange.id)
                             return (
                               <div key={actChange.id} className="flex gap-4 text-xs">
                                 <span className="font-semibold text-slate-300">CP {originalAct?.checkpoint_number}:</span>
                                 {actChange.actual_value !== undefined && (
                                   <span>
                                     Aktual: <span className="text-amber-400 line-through opacity-70">{originalAct?.actual_value ?? '-'}</span> <span className="text-emerald-400 font-bold">{actChange.actual_value}</span>
                                   </span>
                                 )}
                                 {actChange.note !== undefined && (
                                   <span>
                                     Catatan: <span className="text-amber-400 line-through opacity-70">{originalAct?.note || '-'}</span> <span className="text-emerald-400 font-bold">{actChange.note}</span>
                                   </span>
                                 )}
                               </div>
                             )
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button onClick={() => handleReviewRequest(req, 'approved')} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded shadow">
                        Setujui
                      </button>
                      <button 
                        onClick={() => {
                           const reason = prompt('Masukkan alasan penolakan:')
                           if (reason) handleReviewRequest(req, 'rejected', reason)
                        }} 
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded shadow"
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
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
              
              const filledActuals = [...sortedActuals].filter(a => a.actual_value !== null && a.actual_value !== undefined)
              if (filledActuals.length > 0) {
                 // Use the latest input_at for pencapaian saat ini
                 const latestActual = filledActuals.reduce((latest, current) => {
                    const latestTime = latest.input_at ? new Date(latest.input_at).getTime() : 0
                    const currentTime = current.input_at ? new Date(current.input_at).getTime() : 0
                    return currentTime > latestTime ? current : latest
                 }, filledActuals[0])
                 
                 const latestVal = latestActual.actual_value
                 const baseline = t.baseline_value || 0
                 
                 const targetRange = Math.abs(t.target_value - baseline)
                 const currentRange = Math.abs(latestVal - baseline)
                 
                 if (baseline === 0 && t.target_value !== 0) {
                    capaiPct = (latestVal / t.target_value) * 100
                 } else if (targetRange !== 0) {
                    capaiPct = (currentRange / targetRange) * 100
                 }

                 if (latestVal >= t.target_value) isTercapai = true
              }

              return (
                <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  {/* Target Info */}
                  <div className="p-5 flex flex-col md:flex-row gap-5 relative">
                    {!isKonsultan && (
                      <div className="absolute top-4 right-4">
                        <button
                          onClick={() => {
                            if (getPendingRequest(t.id)) {
                              alert('Masih ada pengajuan perubahan yang menunggu persetujuan.')
                              return
                            }
                            setEditingTarget(t)
                            setEditForm({
                              raw_text: t.raw_text || '',
                              metric_name: t.metric_name || '',
                              baseline_value: t.baseline_value !== null ? String(t.baseline_value) : '',
                              target_value: t.target_value !== null ? String(t.target_value) : '',
                              duration: t.duration !== null ? String(t.duration) : '',
                              duration_unit: t.duration_unit || 'bulan'
                            })
                          }}
                          disabled={!!getPendingRequest(t.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                            getPendingRequest(t.id) 
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                          }`}
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit Rencana
                        </button>
                      </div>
                    )}
                    <div className="flex-1 mt-6 md:mt-0">
                      <p className="text-xs font-medium text-slate-500 mb-1">DARI ACTION PLAN:</p>
                      <p className="text-sm text-slate-300 font-bold mb-1">{ap?.title}</p>
                      <p className="text-sm text-slate-400 mb-3 whitespace-pre-line">{ap?.description}</p>
                      
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 mb-3">
                        <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3 text-indigo-400"/> Ekstraksi Target AI / Keterangan:</p>
                        <p className="text-sm text-slate-300 italic">"{t.raw_text}"</p>
                        {getPendingRequest(t.id)?.changes?.raw_text !== undefined && (
                           <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 mt-2 inline-block" title="Menunggu Persetujuan">⏳ Perubahan: "{getPendingRequest(t.id)?.changes?.raw_text}"</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                           <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Metrik</p>
                           <p className="text-xs font-medium text-slate-300">{t.metric_name}</p>
                           {getPendingRequest(t.id)?.changes?.metric_name !== undefined && (
                             <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded border border-amber-500/30 mt-1 inline-block" title="Menunggu Persetujuan">⏳ {getPendingRequest(t.id)?.changes?.metric_name}</span>
                           )}
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex flex-col justify-center">
                           <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Baseline (Wajib)</p>
                           {isKonsultan || t.baseline_value === null || t.baseline_value === undefined ? (
                             <input 
                               type="number"
                               placeholder="Nilai awal"
                               className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500/50"
                               defaultValue={t.baseline_value !== null && t.baseline_value !== undefined ? t.baseline_value : ''}
                               onBlur={(e) => handleUpdateBaseline(t.id, e.target.value)}
                             />
                           ) : (
                             <div className="text-sm font-bold text-white flex items-center gap-2">
                               {t.baseline_value !== null && t.baseline_value !== undefined ? t.baseline_value : <span className="text-slate-500 italic font-normal text-xs">Belum diisi</span>}
                               {getPendingRequest(t.id)?.changes?.baseline_value !== undefined && (
                                 <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded border border-amber-500/30" title="Menunggu Persetujuan">⏳ {getPendingRequest(t.id)?.changes?.baseline_value}</span>
                               )}
                             </div>
                           )}
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg border-b-2 border-b-indigo-500/50">
                           <p className="text-[10px] text-indigo-400 uppercase tracking-wider mb-1" title="Target Hasil Bisnis">Target Bisnis</p>
                           <p className="text-sm font-bold text-white flex items-center gap-2">
                             {t.target_value}
                             {getPendingRequest(t.id)?.changes?.target_value !== undefined && (
                               <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded border border-amber-500/30" title="Menunggu Persetujuan">⏳ {getPendingRequest(t.id)?.changes?.target_value}</span>
                             )}
                           </p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                           <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1" title="Durasi Target Bisnis">Durasi</p>
                           <p className="text-xs font-medium text-slate-300 flex items-center gap-2">
                             {t.duration} {t.duration_unit}
                             {getPendingRequest(t.id)?.changes?.duration !== undefined && (
                               <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded border border-amber-500/30" title="Menunggu Persetujuan">⏳ {getPendingRequest(t.id)?.changes?.duration} {getPendingRequest(t.id)?.changes?.duration_unit}</span>
                             )}
                           </p>
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
                         filledActuals.length === 0 ? 'bg-slate-500/10 text-slate-400' :
                         'bg-amber-500/10 text-amber-400'
                       }`}>
                         {isTercapai ? 'Tercapai' : filledActuals.length === 0 ? 'Belum Dimulai' : 'Dalam Proses'}
                       </span>
                    </div>
                  </div>

                  {/* Checkpoints */}
                  <div className="border-t border-slate-800 bg-slate-950/30 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                         <TrendingUp className="w-4 h-4 text-slate-500" /> Checkpoint Aktual
                      </h4>
                      <p className="text-xs text-slate-500">
                        {filledActuals.length} dari {sortedActuals.length} checkpoint terisi
                      </p>
                    </div>
                    
                    { (t.baseline_value === null || t.baseline_value === undefined) && (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-lg text-sm mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        ⚠ Lengkapi Baseline untuk mulai mencatat checkpoint
                      </div>
                    )}
                    <div className="space-y-3">
                      {sortedActuals.map((act: any, idx) => {
                        // Logika Lock (PRD Baseline Gate)
                        const due = new Date(act.due_date)
                        due.setHours(0, 0, 0, 0)
                        
                        const isFilled = act.actual_value !== null && act.actual_value !== undefined
                        const hasBaseline = t.baseline_value !== null && t.baseline_value !== undefined
                        const isUnlocked = hasBaseline
                        
                        // Edge case: data lama yang sudah terisi sebelum baseline ada
                        const isLegacyFilled = isFilled && !isUnlocked
                        
                        let statusText = ''
                        let statusIcon = null
                        if (isFilled) {
                          statusText = 'Terisi'
                          statusIcon = <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        } else if (isUnlocked) {
                          statusText = 'Siap Diisi'
                        } else {
                          statusText = `Isi Baseline terlebih dahulu`
                          statusIcon = <Lock className="w-3 h-3 text-slate-500" />
                        }
                        
                        const actualValueDisplay = (act.actual_value !== null && act.actual_value !== undefined) ? act.actual_value : ''
                        const actualNoteDisplay = act.note || ''

                        const isLockedByApproval = false
                        const rowOpacity = (!isFilled && !isUnlocked) ? 'opacity-60' : 'opacity-100'
                        const highlightBorder = (!isFilled && isUnlocked) ? 'border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'border-slate-800'

                        return (
                          <div key={act.id} className={`flex flex-col md:flex-row gap-4 items-start md:items-center bg-slate-900 border ${highlightBorder} p-3 rounded-xl transition-all ${rowOpacity}`}>
                            <div className="flex items-center gap-3 min-w-[140px]">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${isFilled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                {act.checkpoint_number}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-300 flex items-center gap-1">
                                  CP {act.checkpoint_number} {statusIcon}
                                </p>
                                <p className="text-[10px] text-slate-500">{due.toLocaleDateString('id-ID')}</p>
                              </div>
                            </div>
                            
                            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Nilai Aktual */}
                              <div className="flex flex-col" title={(!isFilled && !isUnlocked) ? statusText : ''}>
                                <div className="relative group">
                                  <label className="text-[9px] uppercase tracking-wider text-slate-500 absolute -top-2 left-2 bg-slate-900 px-1">Aktual</label>
                                  <input 
                                    type="number"
                                    placeholder={`Target: ${t.target_value}`}
                                    disabled={(!isFilled && !isUnlocked)}
                                    className={`w-full bg-slate-950 border rounded-lg px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 ${(!isFilled && !isUnlocked) ? 'border-slate-800/50 cursor-not-allowed bg-slate-900/50' : (!isFilled && isUnlocked) ? 'border-amber-500/50 focus:border-amber-400' : 'border-slate-800 focus:border-indigo-500/50'}`}
                                    value={actualValueDisplay}
                                    onChange={(e) => {
                                      const updatedTargets = targets.map(tgt => 
                                        tgt.id === t.id 
                                          ? { ...tgt, actuals: tgt.actuals?.map(a => a.id === act.id ? { ...a, actual_value: e.target.value === '' ? null : Number(e.target.value) } : a) }
                                          : tgt
                                      )
                                      setTargets(updatedTargets)
                                    }}
                                    onBlur={(e) => handleUpdateActual(t.id, act.id, { actual_value: e.target.value === '' ? null : Number(e.target.value) })}
                                  />
                                  {isLegacyFilled && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                      <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30" title="Diisi sebelum aturan berlaku">Legacy</span>
                                    </div>
                                  )}
                                </div>
                                {isFilled && (
                                  <p className={`text-[10px] mt-1.5 pl-1 font-medium ${act.actual_value >= t.target_value ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {act.actual_value}/{t.target_value} — {t.target_value !== 0 ? Math.round((act.actual_value / t.target_value) * 100) : 0}% dari target, {act.actual_value >= t.target_value ? 'tercapai' : 'belum tercapai'}
                                  </p>
                                )}
                              </div>
                              
                              {/* Catatan */}
                              <div>
                                <input 
                                  type="text"
                                  placeholder="Catatan (opsional)"
                                  disabled={(!isFilled && !isUnlocked)}
                                  className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none placeholder:text-slate-600 mt-1 md:mt-0 ${(!isFilled && !isUnlocked) ? 'cursor-not-allowed bg-slate-900/50' : ''}`}
                                  value={actualNoteDisplay}
                                  onChange={(e) => {
                                      const updatedTargets = targets.map(tgt => 
                                        tgt.id === t.id 
                                          ? { ...tgt, actuals: tgt.actuals?.map(a => a.id === act.id ? { ...a, note: e.target.value } : a) }
                                          : tgt
                                      )
                                      setTargets(updatedTargets)
                                  }}
                                  onBlur={(e) => handleUpdateActual(t.id, act.id, { note: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        
        {/* MODAL EDIT RENCANA */}
        {editingTarget && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                <h3 className="text-lg font-bold text-white">Edit Rencana Target</h3>
                <button onClick={() => setEditingTarget(null)} className="text-slate-400 hover:text-white p-1">
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Ekstraksi Target AI / Keterangan</label>
                    <textarea 
                      placeholder="Contoh: Penghematan biaya energi sebesar 10% per tahun"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 min-h-[60px]"
                      value={editForm.raw_text}
                      onChange={(e) => setEditForm({...editForm, raw_text: e.target.value})}
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Nama Metrik</label>
                    <input 
                      type="text"
                      placeholder="Contoh: Efisiensi Biaya"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50"
                      value={editForm.metric_name}
                      onChange={(e) => setEditForm({...editForm, metric_name: e.target.value})}
                    />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Baseline (Nilai Awal)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                    value={editForm.baseline_value}
                    onChange={(e) => setEditForm({...editForm, baseline_value: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Target Bisnis (Angka)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                    value={editForm.target_value}
                    onChange={(e) => setEditForm({...editForm, target_value: e.target.value})}
                  />
                </div>
                {/* TOMBOL NEW TARGET */}
                <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                   <p className="text-sm text-slate-400">Pembaruan harus disetujui Konsultan</p>
                   <button
                      type="button"
                      onClick={async () => {
                         if (!confirm('Ini akan mengajukan target metrik baru. Lanjutkan?')) return
                         // Buat target dummy dan langsung submit change request
                         const newTargetId = crypto.randomUUID?.() || 'tgt-' + Math.random()
                         const newTarget = {
                            id: newTargetId,
                            action_plan_id: editingTarget.action_plan_id,
                            project_id: editingTarget.project_id,
                            raw_text: editForm.raw_text || 'Target tambahan (Manual)',
                            metric_name: editForm.metric_name || 'Metrik Tambahan',
                            baseline_value: null,
                            target_value: 0,
                            duration: Number(editForm.duration) || 1,
                            duration_unit: editForm.duration_unit || 'bulan',
                            needs_manual_review: false
                         }
                         try {
                           await saveEfficiencyTargets(projectId, [newTarget])
                           await submitChangeRequest({
                             project_id: editingTarget.project_id,
                             target_id: newTargetId,
                             requested_by: userInfo?.id || 'unknown',
                             changes: {
                               raw_text: editForm.raw_text,
                               metric_name: editForm.metric_name,
                               baseline_value: Number(editForm.baseline_value),
                               target_value: Number(editForm.target_value),
                               duration: Number(editForm.duration),
                               duration_unit: editForm.duration_unit
                             }
                           })
                           setTargets([...targets, { ...newTarget, actuals: [] }])
                           setEditingTarget(null)
                           showSave('Target baru berhasil diajukan!')
                         } catch (err: any) {
                           alert('Gagal menambahkan target baru')
                         }
                      }}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-400 px-3 py-1.5 rounded-lg font-medium transition-colors border border-slate-700"
                   >
                     + Ajukan Sebagai Target Baru
                   </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Durasi</label>
                    <input
                      type="number"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                      value={editForm.duration}
                      onChange={(e) => setEditForm({...editForm, duration: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Satuan</label>
                    <select
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                      value={editForm.duration_unit}
                      onChange={(e) => setEditForm({...editForm, duration_unit: e.target.value})}
                    >
                      <option value="minggu">Minggu</option>
                      <option value="bulan">Bulan</option>
                      <option value="tahun">Tahun</option>
                    </select>
                  </div>
                </div>
                
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg flex gap-3 text-sm text-indigo-300">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p>
                    Perubahan pada Baseline, Target, atau Durasi akan dikirim sebagai <b>Pengajuan</b>. 
                    Konsultan harus menyetujuinya sebelum data diperbarui.
                  </p>
                </div>
              </div>
              <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
                <button
                  onClick={() => setEditingTarget(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg"
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmitEditRencana}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20"
                >
                  Ajukan Perubahan
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
  )
}
