'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Project, ActionPlan, EvidenceItem, MeasureProblem, AnalyzeNeed } from '@/lib/mockData'
import {
  Plus, CheckCircle2, Calendar, User, DollarSign, ArrowUpRight,
  Trash, Upload, FileText, ArrowRight, Lock, ShieldCheck,
  Clock, XCircle, Eye, Save, Sparkles, Lightbulb, X, ChevronDown, ChevronUp, RefreshCw, Activity, CheckSquare, ListTodo, Target, Check, UploadCloud, Trash2
} from 'lucide-react'
import { Tooltip } from '@/components/Tooltip'
import { ACTION_STATUS_LABELS, sanitizeText } from '@/lib/utils'
import {
  getProjects, getActionPlans, saveActionPlans as saveActionPlansDb,
  updateProjectPhase, updateProjectScore, saveAuditLog,
  submitEvidence, verifyEvidence, getEvidenceItems, saveNotification,
  getMeasureProblems, getAnalyzeNeeds, getAnalyzeResult,
  getChecklistEvidences, submitChecklistEvidence, verifyChecklistEvidence, ChecklistEvidenceItem,
  getApprovalRequests, submitApprovalRequest, reviewApprovalRequest, cancelApprovalRequest, GenericApprovalRequest
} from '@/lib/db'
import { useUserRole } from '@/hooks/useUserRole'

/* ── badge warna status bukti ── */
const EVIDENCE_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:  { label: 'Menunggu Verifikasi', cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
  reviewed: { label: 'Sudah Dilihat',       cls: 'bg-blue-500/10  border-blue-500/30  text-blue-400'  },
  verified: { label: 'Terverifikasi',       cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
  approved: { label: 'Disetujui',           cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
  rejected: { label: 'Ditolak',             cls: 'bg-red-500/10   border-red-500/30   text-red-400'   },
}

export default function ImprovePage() {
  const router    = useRouter()
  const params    = useParams()
  const projectId = params.id as string

  const { userInfo }  = useUserRole()
  const userRole      = userInfo?.role ?? 'perusahaan'
  const isKonsultan   = userRole.toLowerCase() !== 'perusahaan'
  const [mounted, setMounted] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  /* ── core state ── */
  const [project,     setProject]     = useState<Project | null>(null)
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([])
  const [measureProblems, setMeasureProblems] = useState<MeasureProblem[]>([])
  const [analyzeNeeds,    setAnalyzeNeeds]    = useState<AnalyzeNeed[]>([])
  /* evidence per action plan id */
  const [evidenceMap, setEvidenceMap] = useState<Record<string, EvidenceItem[]>>({})
  /* evidence per checklist step id */
  const [checklistEvidenceMap, setChecklistEvidenceMap] = useState<Record<string, ChecklistEvidenceItem[]>>({})
  
  /* ── approval requests ── */
  const [approvalRequests, setApprovalRequests] = useState<GenericApprovalRequest[]>([])

  /* ── ai analysis state ── */
  const [generatingAiIds, setGeneratingAiIds] = useState<Record<string, boolean>>({})
  const [attemptedAiIds, setAttemptedAiIds] = useState<Set<string>>(new Set())
  const [attemptedStepIds, setAttemptedStepIds] = useState<Set<string>>(new Set())
  const [editingRoiId, setEditingRoiId] = useState<string | null>(null)
  const [roiEditForm, setRoiEditForm] = useState({
    estimasi_penghematan_tahunan: 0,
    roi_persen: 0,
    biaya_implementasi: 0,
    target_efisiensi: '',
    manfaat: ''
  })
  const [expandedActionIds, setExpandedActionIds] = useState<Set<string>>(new Set())

  /* ── add action plan modal ── */
  const [showAddModal,   setShowAddModal]   = useState(false)
  const [newTitle,       setNewTitle]       = useState('')
  const [newDesc,        setNewDesc]        = useState('')
  const [newMethodology, setNewMethodology] = useState('Lean Manufacturing')
  const [newDimension,   setNewDimension]   = useState('productivity')
  const [newKpiName,     setNewKpiName]     = useState('')
  const [newKpiBaseline, setNewKpiBaseline] = useState(0)
  const [newKpiTarget,   setNewKpiTarget]   = useState(0)
  const [newKpiUnit,     setNewKpiUnit]     = useState('')
  const [newPicName,     setNewPicName]     = useState('')
  const [newStartDate,   setNewStartDate]   = useState(() => new Date().toISOString().split('T')[0])
  const [newEndDate,     setNewEndDate]     = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 2); return d.toISOString().split('T')[0]
  })
  const [newCostSaving,  setNewCostSaving]  = useState<number>(0)
  const [newInvestment,  setNewInvestment]  = useState<number>(0)
  
  // Grouping state
  const [expandedProblemGroups, setExpandedProblemGroups] = useState<Set<string>>(new Set())
  const [generatingStepsId, setGeneratingStepsId] = useState<string | null>(null)

  useEffect(() => {
    if (actionPlans.length > 0 && expandedProblemGroups.size === 0) {
      const groups = new Set(actionPlans.map(a => a.problem_title || 'Tindakan Lainnya'))
      setExpandedProblemGroups(groups)
    }
  }, [actionPlans])

  const toggleGroup = (group: string) => {
    setExpandedProblemGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  const handleGenerateSteps = async (act: ActionPlan) => {
    setGeneratingStepsId(act.id)
    try {
      const res = await fetch('/api/generate-action-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_title: act.title,
          description: act.description,
          problem_title: act.problem_title,
          methodology: act.methodology
        })
      })
      if (!res.ok) throw new Error(await res.text())
      
      const steps = await res.json()
      const newSteps = steps.map((s: any, idx: number) => ({
        id: crypto.randomUUID?.() ?? 'step-' + Math.random().toString(36).substr(2,9),
        action_plan_id: act.id,
        description: s.description || s.action || '',
        pic: s.pic || '',
        timeline: s.timeline || '',
        is_completed: false
      }))
      
      const updated = actionPlans.map(a => a.id === act.id ? { ...a, steps: newSteps } : a)
      setActionPlans(updated)
      await persistActionPlans(updated)
    } catch (error) {
      console.error('Failed to generate steps:', error)
      alert('Gagal membuat langkah otomatis')
    } finally {
      setGeneratingStepsId(null)
    }
  }

  const handleToggleStep = async (actId: string, stepId: string, isCompleted: boolean) => {
    const updated = actionPlans.map(act => {
      if (act.id !== actId) return act
      const newSteps = (act.steps || []).map(s => s.id === stepId ? { ...s, is_completed: isCompleted } : s)
      const totalSteps = newSteps.length
      const completedSteps = newSteps.filter(s => s.is_completed).length
      const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : act.progress_percentage
      const status: ActionPlan['status'] = progress >= 100 ? 'selesai' : progress > 0 ? 'sedang_berjalan' : 'belum_mulai'
      return { ...act, steps: newSteps, progress_percentage: progress, status }
    })
    setActionPlans(updated)
    await persistActionPlans(updated)
  }

  /* ── upload bukti modal (perusahaan) ── */
  const [uploadAction,   setUploadAction]   = useState<ActionPlan | null>(null)
  const [evidenceName,   setEvidenceName]   = useState('')
  const [selectedFile,   setSelectedFile]   = useState<File | null>(null)
  const [kpiSubmitted,   setKpiSubmitted]   = useState<number>(0)
  const [costSavingInput, setCostSavingInput] = useState<number>(0)
  const [investmentInput, setInvestmentInput] = useState<number>(0)
  const [uploading,      setUploading]      = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── verifikasi modal (konsultan) ── */
  const [verifyTarget,    setVerifyTarget]    = useState<EvidenceItem | null>(null)
  const [verifyActionId,  setVerifyActionId]  = useState<string>('')
  const [verifiedKpi,     setVerifiedKpi]     = useState<number>(0)
  const [verifyNotes,     setVerifyNotes]     = useState('')
  const [verifyStatus,    setVerifyStatus]    = useState<'verified' | 'rejected'>('verified')
  const [verifySaving,    setVerifySaving]    = useState(false)

  /* ── upload checklist bukti modal (perusahaan) ── */
  const [uploadChecklistStep, setUploadChecklistStep] = useState<{ actionId: string, stepId: string, title: string } | null>(null)
  const [chkEvidenceFile,     setChkEvidenceFile]     = useState<File | null>(null)
  const [chkUploading,        setChkUploading]        = useState(false)
  const chkFileInputRef = useRef<HTMLInputElement>(null)

  /* ── verifikasi checklist modal (konsultan) ── */
  const [verifyChkTarget, setVerifyChkTarget] = useState<ChecklistEvidenceItem | null>(null)
  const [verifyChkStatus, setVerifyChkStatus] = useState<'approved' | 'rejected'>('approved')
  const [verifyChkNotes,  setVerifyChkNotes]  = useState('')
  const [verifyChkSaving, setVerifyChkSaving] = useState(false)

  /* ── mapping untuk detail skor & level masalah prioritas ── */
  const [problemMetaMap, setProblemMetaMap] = useState<Record<string, { score: number, level: string }>>({})

  /* ── modal manual ROI ── */
  const [manualRoiAction, setManualRoiAction] = useState<ActionPlan | null>(null)
  const [manualCostSaving, setManualCostSaving] = useState<number>(0)
  const [manualInvestment, setManualInvestment] = useState<number>(0)

  /* ── load ── */
  useEffect(() => {
    async function loadData() {
      const [projects, actions, mProblems, aNeeds, allEvidence] = await Promise.all([
        getProjects(),
        getActionPlans(projectId),
        getMeasureProblems(projectId),
        getAnalyzeNeeds(projectId),
        getEvidenceItems(projectId)
      ])
      const proj = projects.find((p: Project) => p.id === projectId)
      if (!proj) { router.push('/dashboard'); return }
      setProject(proj)
      let loadedActions = actions
      const analyzeRes = await getAnalyzeResult(projectId)
      
      if (analyzeRes?.priority_result?.length) {
        const metaMap: Record<string, { score: number, level: string }> = {}
        analyzeRes.priority_result.forEach((pr: any) => {
          if (pr.problem) {
            metaMap[pr.problem] = { score: pr.priority_score, level: pr.priority_level }
          }
        })
        setProblemMetaMap(metaMap)
      }

      if (loadedActions.length === 0) {
        // Auto-fill from Analyze Phase
        if (analyzeRes?.priority_result?.length) {
          loadedActions = analyzeRes.priority_result.flatMap((pr: any) => {
            const steps = pr.action_plan || []
            if (steps.length > 0) {
              return steps.map((ap: any) => ({
                id: crypto.randomUUID?.() ?? 'act-' + Math.random().toString(36).substr(2,9),
                project_id: projectId,
                problem_title: pr.problem || 'Tindakan Lainnya',
                title: ap.action || pr.problem || 'Tindakan Baru',
                description: `Menjawab masalah: ${pr.problem || '-'}\nJustifikasi: ${pr.justification || '-'}`,
                methodology: pr.related_methods?.[0] || 'Lainnya',
                dimension: 'productivity',
                kpi_name: 'Target Pencapaian',
                kpi_baseline: 0,
                kpi_target: 100,
                kpi_unit: '%',
                pic_name: ap.pic || 'Belum ditentukan',
                start_date: new Date().toISOString().split('T')[0],
                end_date: (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0] })(),
                status: 'belum_mulai' as const,
                progress_percentage: 0
              }))
            }
            return [{
              id: crypto.randomUUID?.() ?? 'act-' + Math.random().toString(36).substr(2,9),
              project_id: projectId,
              problem_title: pr.problem || 'Tindakan Lainnya',
              title: `Perbaikan: ${pr.problem || 'Masalah Prioritas'}`,
              description: `Skor Prioritas: ${pr.priority_score || '-'} (${pr.priority_level || '-'})\nJustifikasi: ${pr.justification || '-'}`,
              methodology: pr.related_methods?.[0] || 'Lainnya',
              dimension: 'productivity',
              kpi_name: 'Target Pencapaian',
              kpi_baseline: 0,
              kpi_target: 100,
              kpi_unit: '%',
              pic_name: 'Belum ditentukan',
              start_date: new Date().toISOString().split('T')[0],
              end_date: (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0] })(),
              status: 'belum_mulai' as const,
              progress_percentage: 0
            }]
          })
          if (loadedActions.length > 0) {
            await saveActionPlansDb(projectId, loadedActions)
          }
        }
        if (loadedActions.length === 0 && analyzeRes?.recommendations?.length) {
          loadedActions = analyzeRes.recommendations.map((rec: any) => ({
            id: crypto.randomUUID?.() ?? 'act-' + Math.random().toString(36).substr(2,9),
            project_id: projectId,
            title: `Perbaikan via ${rec.method_name || 'Metode Analisis'}`,
            description: rec.reason || rec.description || 'Action plan dari rekomendasi Analyze',
            methodology: rec.method_name || 'Lainnya',
            dimension: rec.pqcdsm_dimension || 'productivity',
            kpi_name: 'Target Pencapaian',
            kpi_baseline: 0,
            kpi_target: 100,
            kpi_unit: '%',
            pic_name: 'Belum ditentukan',
            start_date: new Date().toISOString().split('T')[0],
            end_date: (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0] })(),
            status: 'belum_mulai' as const,
            progress_percentage: 0
          }))
          if (loadedActions.length > 0) {
            await saveActionPlansDb(projectId, loadedActions)
          }
        }
      }

      setActionPlans(loadedActions)
      setMeasureProblems(mProblems)
      setAnalyzeNeeds(aNeeds)

      const grouped: Record<string, EvidenceItem[]> = {}
      for (const ev of allEvidence) {
        if (!grouped[ev.action_plan_id]) grouped[ev.action_plan_id] = []
        grouped[ev.action_plan_id].push(ev)
      }
      setEvidenceMap(grouped)

      const allStepIds = loadedActions.flatMap(a => (a.steps || []).map(s => s.id))
      const allChecklistEvidences = await getChecklistEvidences(allStepIds)
      const chkGrouped: Record<string, ChecklistEvidenceItem[]> = {}
      for (const cev of allChecklistEvidences) {
        if (!chkGrouped[cev.step_id]) chkGrouped[cev.step_id] = []
        chkGrouped[cev.step_id].push(cev)
      }
      setChecklistEvidenceMap(chkGrouped)

      const reqs = await getApprovalRequests(projectId)
      setApprovalRequests(reqs)
    }
    loadData()
  }, [projectId, router])

  // Auto-generate AI for empty AI analysis secara antrean (menghindari rate limit)
  useEffect(() => {
    if (!mounted || actionPlans.length === 0) return;
    
    // Cari 1 action plan yang belum di-generate dan belum pernah dicoba
    const actToProcess = actionPlans.find(act => 
      !act.ai_analysis && !generatingAiIds[act.id] && !attemptedAiIds.has(act.id)
    );

    if (actToProcess) {
      setAttemptedAiIds(prev => new Set(prev).add(actToProcess.id));
      handleGenerateAiAnalysis(actToProcess);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionPlans, mounted, generatingAiIds, attemptedAiIds]);

  // Auto-generate Steps for empty steps secara antrean
  useEffect(() => {
    if (!mounted || actionPlans.length === 0) return;
    
    // Cari 1 action plan yang belum punya steps
    const actToProcess = actionPlans.find(act => 
      (!act.steps || act.steps.length === 0) && generatingStepsId !== act.id && !attemptedStepIds.has(act.id)
    );

    if (actToProcess) {
      setAttemptedStepIds(prev => new Set(prev).add(actToProcess.id));
      handleGenerateSteps(actToProcess);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionPlans, mounted, generatingStepsId, attemptedStepIds]);

  /* ── save action plans helper ── */
  const derivedRecommendations = (() => {
    const list: Array<{
      method: string;
      dimension: string;
      source: 'measure' | 'needs' | 'both';
      reasons: string[];
      needs: string[];
    }> = []

    for (const prob of measureProblems) {
      for (const rm of (prob.recommended_methods || [])) {
        let existing = list.find(item => item.method.toLowerCase() === rm.method.toLowerCase())
        if (!existing) {
          existing = {
            method: rm.method,
            dimension: prob.pqcdsm_dimension || 'productivity',
            source: 'measure',
            reasons: [],
            needs: []
          }
          list.push(existing)
        }
        if (rm.reason && !existing.reasons.includes(rm.reason)) {
          existing.reasons.push(rm.reason)
        }
      }
    }

    for (const need of analyzeNeeds) {
      let existing = list.find(item => item.method.toLowerCase() === need.method_name.toLowerCase())
      if (!existing) {
        existing = {
          method: need.method_name,
          dimension: need.pqcdsm_dimension || 'productivity',
          source: 'needs',
          reasons: [],
          needs: []
        }
        list.push(existing)
      } else {
        if (existing.source === 'measure') {
          existing.source = 'both'
        }
      }
      const needDesc = `${need.need_item} (${need.quantity || '1 unit'}${need.estimated_cost ? `, Est. Rp ${need.estimated_cost.toLocaleString('id-ID')}` : ''})`
      if (!existing.needs.includes(needDesc)) {
        existing.needs.push(needDesc)
      }
    }

    return list
  })()

  const handlePrefillAction = (rec: typeof derivedRecommendations[0]) => {
    setNewMethodology(rec.method)
    setNewTitle(`Penerapan ${rec.method}`)
    setNewDesc(
      [
        rec.reasons.length > 0 ? `Latar Belakang: ${rec.reasons.join('. ')}` : '',
        rec.needs.length > 0 ? `Kebutuhan Implementasi:\n- ${rec.needs.join('\n- ')}` : ''
      ].filter(Boolean).join('\n\n')
    )
    setNewDimension(rec.dimension)
    setNewKpiName('Persentase Kepatuhan / Output')
    setNewKpiBaseline(0)
    setNewKpiTarget(100)
    setNewKpiUnit('%')
    setNewPicName('Supervisor')
    setNewCostSaving(0)
    setNewInvestment(rec.needs.reduce((acc, n) => acc + (parseInt(n.match(/Est. Rp ([\d.]+)/)?.[1]?.replace(/\./g, '') || '0') || 0), 0))
    setShowAddModal(true)
  }

  const persistActionPlans = async (updated: ActionPlan[]) => {
    setActionPlans(updated)
    try {
      await saveActionPlansDb(projectId, updated)
      const fresh = await getActionPlans(projectId)
      if (fresh.length > 0) setActionPlans(fresh)
    } catch (err: any) { console.error('[saveActionPlans]', err.message) }
  }

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isKonsultan) return
    const title = sanitizeText(newTitle)
    if (!title) return
    const newAction: ActionPlan = {
      id: crypto.randomUUID?.() ?? 'act-' + Math.random().toString(36).substr(2,9),
      project_id: projectId, title, description: sanitizeText(newDesc),
      methodology: newMethodology, dimension: newDimension,
      kpi_name: sanitizeText(newKpiName), kpi_baseline: Number(newKpiBaseline),
      kpi_target: Number(newKpiTarget), kpi_unit: sanitizeText(newKpiUnit),
      cost_saving_manual: Number(newCostSaving), investment_manual: Number(newInvestment),
      pic_name: sanitizeText(newPicName), start_date: newStartDate, end_date: newEndDate,
      status: 'belum_mulai', progress_percentage: 0,
    }
    await persistActionPlans([...actionPlans, newAction])
    setShowAddModal(false)
    setNewTitle(''); setNewDesc(''); setNewKpiName(''); setNewKpiBaseline(0); setNewKpiTarget(0); setNewKpiUnit(''); setNewPicName(''); setNewCostSaving(0); setNewInvestment(0)
  }

  const handleUpdateStatus = (actionId: string, status: ActionPlan['status']) => {
    const prevAct = actionPlans.find(a => a.id === actionId)
    const updated = actionPlans.map(act =>
      act.id === actionId ? { ...act, status, progress_percentage: status === 'selesai' ? 100 : act.progress_percentage } : act
    )
    persistActionPlans(updated)
    const localUser = localStorage.getItem('smartproductive_user')
    const actor = localUser ? JSON.parse(localUser) : null
    saveAuditLog({ project_id: projectId, action_plan_id: actionId, actor_id: actor?.id, actor_role: actor?.role, event_type: 'status_change', detail: `Status: ${prevAct?.status} → ${status}` }).catch(console.warn)
  }

  const handleUpdateProgress = (actionId: string, progress: number) => {
    const updated = actionPlans.map(act =>
      act.id === actionId ? { ...act, progress_percentage: progress, status: progress === 100 ? 'selesai' as const : progress > 0 ? 'sedang_berjalan' as const : act.status } : act
    )
    persistActionPlans(updated)
  }

  const getPendingChecklistRequest = (stepId: string) => {
    return approvalRequests.find(r => r.entity_type === 'action_plan_step' && r.entity_id === stepId && r.status === 'pending')
  }

  const handleToggleSelfMarkedDone = async (actId: string, stepId: string) => {
    if (isKonsultan) return;
    
    const pendingReq = getPendingChecklistRequest(stepId)
    if (pendingReq) {
      if (window.confirm('Batalkan pengajuan penyelesaian langkah ini?')) {
        await cancelApprovalRequest(pendingReq.id)
        setApprovalRequests(approvalRequests.filter(r => r.id !== pendingReq.id))
      }
      return
    }

    if (window.confirm('Ajukan penyelesaian langkah ini ke Konsultan?')) {
      const req: GenericApprovalRequest = {
        id: crypto.randomUUID(),
        project_id: projectId,
        entity_type: 'action_plan_step',
        entity_id: stepId,
        requested_by: userInfo?.id || 'unknown',
        requested_at: new Date().toISOString(),
        changes: { is_completed: true },
        status: 'pending'
      }
      try {
        await submitApprovalRequest(req)
        setApprovalRequests([req, ...approvalRequests])
      } catch (err) {
        alert('Gagal mengajukan ke Konsultan')
      }
    }
  }

  const handleDeleteAction = (actionId: string) => {
    if (!isKonsultan) return
    if (!window.confirm('Hapus action plan ini?')) return
    const updated = actionPlans.map(act => act.id === actionId ? { ...act, is_deleted: true } : act)
    persistActionPlans(updated)
  }

  const handleToggleExpand = (actionId: string) => {
    setExpandedActionIds(prev => {
      const next = new Set(prev)
      if (next.has(actionId)) next.delete(actionId)
      else next.add(actionId)
      return next
    })
  }

  const handleUpdateAiAnalysis = (actionId: string, updatedAnalysis: any) => {
    const updated = actionPlans.map(act =>
      act.id === actionId ? { ...act, ai_analysis: updatedAnalysis } : act
    )
    setActionPlans(updated)
  }

  const handleGenerateAiAnalysis = async (act: ActionPlan) => {
    setGeneratingAiIds(prev => ({ ...prev, [act.id]: true }))
    try {
      const contextData = {
        sigma_level: 'Data tidak tersedia',
        dpmo: 'Data tidak tersedia',
        kpi_pendukung: {
          total_biaya_rework: 'Data tidak tersedia'
        }
      }

      const res = await fetch('/api/improve-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: act.title,
          problem: act.description,
          pic: act.pic_name,
          timeline: `${act.start_date} s/d ${act.end_date}`,
          context_data: contextData
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal generate rekomendasi')
      }

      const aiData = await res.json()
      
      const updated = actionPlans.map(a =>
        a.id === act.id ? { ...a, ai_analysis: aiData } : a
      )
      
      setExpandedActionIds(prev => new Set(prev).add(act.id))
      await persistActionPlans(updated)

    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setGeneratingAiIds(prev => ({ ...prev, [act.id]: false }))
    }
  }

  const handleSaveRoiEdit = async (actId: string) => {
    const updated = actionPlans.map((act): ActionPlan => {
      if (act.id === actId) {
        return {
          ...act,
          ai_analysis: {
            persiapan: act.ai_analysis?.persiapan || '',
            sumber_daya: act.ai_analysis?.sumber_daya || { sdm: '', alat: '', anggaran_terkait: '' },
            roi: {
              biaya_implementasi: roiEditForm.biaya_implementasi,
              catatan: (act.ai_analysis?.roi as any)?.catatan || '',
              estimasi_penghematan_tahunan: roiEditForm.estimasi_penghematan_tahunan,
              roi_persen: roiEditForm.roi_persen
            },
            biaya: {
              rincian: (act.ai_analysis?.biaya as any)?.rincian || '',
              estimasi: roiEditForm.biaya_implementasi
            },
            target_efisiensi: roiEditForm.target_efisiensi,
            manfaat: {
              kualitatif: roiEditForm.manfaat,
              kuantitatif: (act.ai_analysis?.manfaat as any)?.kuantitatif || ''
            }
          }
        }
      }
      return act
    })
    setEditingRoiId(null)
    await persistActionPlans(updated)
  }

  const handleForceSyncFromAnalyze = async () => {
    if (!confirm('Peringatan: Sinkronisasi akan menimpa semua Action Plan saat ini dengan draft terbaru dari Analyze. Jika ada Action Plan yang sudah berjalan, progresnya mungkin hilang. Lanjutkan?')) return;
    setIsSyncing(true)
    try {
      const analyzeRes = await getAnalyzeResult(projectId)
      if (!analyzeRes) {
        alert('Data Analyze tidak ditemukan.')
        return
      }

      if (analyzeRes?.priority_result?.length) {
        const metaMap: Record<string, { score: number, level: string }> = {}
        analyzeRes.priority_result.forEach((pr: any) => {
          if (pr.problem) {
            metaMap[pr.problem] = { score: pr.priority_score, level: pr.priority_level }
          }
        })
        setProblemMetaMap(metaMap)
      }

      let newActions: ActionPlan[] = []
      
      if (analyzeRes?.priority_result?.length) {
        newActions = analyzeRes.priority_result.flatMap((pr: any) => {
          const steps = pr.action_plan || []
          if (steps.length > 0) {
            return steps.map((ap: any) => ({
              id: crypto.randomUUID?.() ?? 'act-' + Math.random().toString(36).substr(2,9),
              project_id: projectId,
              problem_title: pr.problem || 'Tindakan Lainnya',
              title: ap.action || pr.problem || 'Tindakan Baru',
              description: `Menjawab masalah: ${pr.problem || '-'}\nJustifikasi: ${pr.justification || '-'}`,
              methodology: pr.related_methods?.[0] || 'Lainnya',
              dimension: 'productivity',
              kpi_name: 'Target Pencapaian',
              kpi_baseline: 0,
              kpi_target: 100,
              kpi_unit: '%',
              pic_name: ap.pic || 'Belum ditentukan',
              start_date: new Date().toISOString().split('T')[0],
              end_date: (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0] })(),
              status: 'belum_mulai' as const,
              progress_percentage: 0
            }))
          }
          return [{
            id: crypto.randomUUID?.() ?? 'act-' + Math.random().toString(36).substr(2,9),
            project_id: projectId,
            problem_title: pr.problem || 'Tindakan Lainnya',
            title: `Perbaikan: ${pr.problem || 'Masalah Prioritas'}`,
            description: `Skor Prioritas: ${pr.priority_score || '-'} (${pr.priority_level || '-'})\nJustifikasi: ${pr.justification || '-'}`,
            methodology: pr.related_methods?.[0] || 'Lainnya',
            dimension: 'productivity',
            kpi_name: 'Target Pencapaian',
            kpi_baseline: 0,
            kpi_target: 100,
            kpi_unit: '%',
            pic_name: 'Belum ditentukan',
            start_date: new Date().toISOString().split('T')[0],
            end_date: (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0] })(),
            status: 'belum_mulai' as const,
            progress_percentage: 0
          }]
        })
      } else if (analyzeRes?.recommendations?.length) {
        newActions = analyzeRes.recommendations.map((rec: any) => ({
          id: crypto.randomUUID?.() ?? 'act-' + Math.random().toString(36).substr(2,9),
          project_id: projectId,
          title: `Perbaikan via ${rec.method_name || 'Metode Analisis'}`,
          description: rec.reason || rec.description || 'Action plan dari rekomendasi Analyze',
          methodology: rec.method_name || 'Lainnya',
          dimension: rec.pqcdsm_dimension || 'productivity',
          kpi_name: 'Target Pencapaian',
          kpi_baseline: 0,
          kpi_target: 100,
          kpi_unit: '%',
          pic_name: 'Belum ditentukan',
          start_date: new Date().toISOString().split('T')[0],
          end_date: (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0] })(),
          status: 'belum_mulai' as const,
          progress_percentage: 0
        }))
      }

      if (newActions.length > 0) {
        await saveActionPlansDb(projectId, newActions)
        setActionPlans(newActions)
        alert('Data berhasil disinkronisasi dari Analyze!')
      } else {
        alert('Tidak ada rencana perbaikan yang valid dari Analyze.')
      }
    } catch(err: any) {
      alert(`Gagal sync: ${err.message}`)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleUploadEvidence = async () => {
    if (!uploadAction) return
    setUploading(true)
    let fileUrl  = ''
    let fileName = evidenceName || 'Bukti manual'

    if (selectedFile) {
      const maxSizeBytes = 5 * 1024 * 1024
      if (selectedFile.size > maxSizeBytes) {
        alert('❌ Ukuran file terlalu besar! Maksimal ukuran file adalah 5MB.')
        setUploading(false)
        return
      }

      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || ''
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx']

      if (!allowedTypes.includes(selectedFile.type) && !allowedExtensions.includes(fileExt)) {
        alert('❌ Format file tidak didukung! Harap unggah gambar (JPG, PNG, WebP), PDF, Word, atau Excel.')
        setUploading(false)
        return
      }

      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const path = `${projectId}/${uploadAction.id}/${Date.now()}_${selectedFile.name}`
        const { data: up, error: upErr } = await sb.storage.from('evidence-files').upload(path, selectedFile, { cacheControl:'3600', upsert:false })
        if (upErr) throw upErr
        const { data: urlData } = sb.storage.from('evidence-files').getPublicUrl(up.path)
        fileUrl  = urlData.publicUrl
        fileName = selectedFile.name
      } catch {
        fileUrl  = 'local://' + selectedFile.name
        fileName = selectedFile.name
      }
    } else if (evidenceName) {
      fileUrl = 'manual://' + evidenceName
    }

    const localUser   = localStorage.getItem('smartproductive_user')
    const uploaderInfo = localUser ? JSON.parse(localUser) : null

    const newEv = await submitEvidence(projectId, {
      action_plan_id:    uploadAction.id,
      action_title:      uploadAction.title,
      file_name:         fileName,
      file_url:          fileUrl,
      kpi_submitted_value: Number(kpiSubmitted),
      kpi_unit:          uploadAction.kpi_unit,
      uploaded_by_id:    uploaderInfo?.id,
      uploaded_by_name:  uploaderInfo?.full_name,
      uploaded_by_role:  uploaderInfo?.role,
    })

    setEvidenceMap(prev => ({ ...prev, [uploadAction.id]: [newEv, ...(prev[uploadAction.id] ?? [])] }))

    if (costSavingInput > 0 || investmentInput > 0) {
      const updated = actionPlans.map(act =>
        act.id === uploadAction.id ? { ...act, cost_saving_manual: costSavingInput || act.cost_saving_manual, investment_manual: investmentInput || act.investment_manual } : act
      )
      await persistActionPlans(updated)
    }

    const isSlip = uploadAction.kpi_target > uploadAction.kpi_baseline
      ? Number(kpiSubmitted) < uploadAction.kpi_baseline
      : Number(kpiSubmitted) > uploadAction.kpi_baseline
    if (isSlip && uploaderInfo?.id) {
      saveNotification({ user_id: uploaderInfo.id, project_id: projectId, type: 'early_warning', title: `⚠️ Early Warning: ${uploadAction.kpi_name}`, message: `KPI "${uploadAction.kpi_name}" di level PERINGATAN. Nilai bukti: ${kpiSubmitted} (Target: ${uploadAction.kpi_target})` }).catch(console.warn)
    }

    setUploading(false)
    setUploadAction(null)
    setEvidenceName(''); setSelectedFile(null); setKpiSubmitted(0); setCostSavingInput(0); setInvestmentInput(0)
  }

  const handleVerifyEvidence = async () => {
    if (!verifyTarget) return
    setVerifySaving(true)
    const localUser = localStorage.getItem('smartproductive_user')
    const actor     = localUser ? JSON.parse(localUser) : null

    await verifyEvidence(projectId, verifyTarget.id, verifyActionId, verifiedKpi, verifyNotes, actor?.id ?? '', verifyStatus)

    setEvidenceMap(prev => ({
      ...prev,
      [verifyActionId]: (prev[verifyActionId] ?? []).map(e =>
        e.id === verifyTarget.id ? { ...e, evidence_status: verifyStatus, reviewer_notes: verifyNotes, reviewed_at: new Date().toISOString() } : e
      ),
    }))

    if (verifyStatus === 'verified') {
      const updated = actionPlans.map(act =>
        act.id === verifyActionId ? { ...act, kpi_actual: verifiedKpi, verified_kpi_actual: verifiedKpi } : act
      )
      await persistActionPlans(updated)
      updateProjectScore(projectId, updated).then(s => setProject(p => p ? { ...p, current_score: s } : p)).catch(console.warn)
    }

    setVerifySaving(false)
    setVerifyTarget(null)
    setVerifyNotes(''); setVerifiedKpi(0); setVerifyStatus('verified')
  }

  const handleUploadChecklistEvidence = async () => {
    if (!uploadChecklistStep || !chkEvidenceFile) return
    setChkUploading(true)

    const maxSizeBytes = 10 * 1024 * 1024 // 10MB
    if (chkEvidenceFile.size > maxSizeBytes) {
      alert('❌ Ukuran file terlalu besar! Maksimal ukuran file adalah 10MB.')
      setChkUploading(false)
      return
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    const fileExt = chkEvidenceFile.name.split('.').pop()?.toLowerCase() || ''
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx']

    if (!allowedTypes.includes(chkEvidenceFile.type) && !allowedExtensions.includes(fileExt)) {
      alert('❌ Format file tidak didukung! Harap unggah gambar, PDF, Word, atau Excel.')
      setChkUploading(false)
      return
    }

    let fileUrl = ''
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const path = `${projectId}/checklist/${uploadChecklistStep.stepId}/${Date.now()}_${chkEvidenceFile.name}`
      const { data: up, error: upErr } = await sb.storage.from('evidence-files').upload(path, chkEvidenceFile, { cacheControl:'3600', upsert:false })
      if (upErr) throw upErr
      const { data: urlData } = sb.storage.from('evidence-files').getPublicUrl(up.path)
      fileUrl = urlData.publicUrl
    } catch {
      alert('❌ Gagal mengunggah ke Supabase Storage.')
      setChkUploading(false)
      return
    }

    const localUser = localStorage.getItem('smartproductive_user')
    const uploaderInfo = localUser ? JSON.parse(localUser) : null

    const newEv = await submitChecklistEvidence(uploadChecklistStep.stepId, {
      file_name: chkEvidenceFile.name,
      file_url: fileUrl,
      file_type: chkEvidenceFile.type,
      file_size: chkEvidenceFile.size,
      uploaded_by: uploaderInfo?.id,
      uploaded_by_name: uploaderInfo?.full_name,
      uploaded_by_role: uploaderInfo?.role
    })

    if (newEv.id) {
      setChecklistEvidenceMap(prev => {
        const oldArr = prev[uploadChecklistStep.stepId] || []
        return { ...prev, [uploadChecklistStep.stepId]: [newEv, ...oldArr] }
      })
    }

    setChkUploading(false)
    setUploadChecklistStep(null)
    setChkEvidenceFile(null)
  }

  const handleVerifyChecklistEvidence = async () => {
    if (!verifyChkTarget) return
    setVerifyChkSaving(true)
    const localUser = localStorage.getItem('smartproductive_user')
    const actor = localUser ? JSON.parse(localUser) : null

    await verifyChecklistEvidence(verifyChkTarget.id, verifyChkStatus, verifyChkNotes, actor?.id ?? '')

    setChecklistEvidenceMap(prev => ({
      ...prev,
      [verifyChkTarget.step_id]: (prev[verifyChkTarget.step_id] ?? []).map(e =>
        e.id === verifyChkTarget.id ? { ...e, verification_status: verifyChkStatus, rejection_note: verifyChkNotes, verified_by: actor?.id, verified_at: new Date().toISOString() } : e
      )
    }))

    if (verifyChkStatus === 'approved') {
      const stepId = verifyChkTarget.step_id
      const targetAct = actionPlans.find(act => act.steps?.some(s => s.id === stepId))
      if (targetAct && targetAct.steps) {
        // Calculate new progress including this newly approved step
        const totalSteps = targetAct.steps.length
        let newlyApprovedCount = 0
        targetAct.steps.forEach(s => {
          if (s.id === stepId) newlyApprovedCount++
          else {
            const evs = checklistEvidenceMap[s.id] || []
            if (evs.some(e => e.verification_status === 'approved')) newlyApprovedCount++
          }
        })
        const newProg = totalSteps > 0 ? Math.round((newlyApprovedCount / totalSteps) * 100) : 0
        const updatedAct = { ...targetAct, progress_percentage: newProg, status: newProg === 100 ? 'selesai' as const : newProg > 0 ? 'sedang_berjalan' as const : targetAct.status }
        
        persistActionPlans(actionPlans.map(a => a.id === targetAct.id ? updatedAct : a))
      }
    }

    setVerifyChkSaving(false)
    setVerifyChkTarget(null)
    setVerifyChkNotes('')
  }

  if (!project) return null

  const pendingCountAction = Object.values(evidenceMap).flat().filter(e => e.evidence_status === 'pending').length
  const pendingCountChecklist = Object.values(checklistEvidenceMap).flat().filter(e => e.verification_status === 'pending').length
  const pendingCount = pendingCountAction + pendingCountChecklist

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fase IMPROVE: Eksekusi Action Plan &amp; Verifikasi Bukti Implementasi</p>
        </div>
        <div className="flex items-center gap-3">
          {isKonsultan && pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl">
              <Clock className="h-3.5 w-3.5" />
              {pendingCount} bukti menunggu verifikasi
            </span>
          )}
          <button
            onClick={async () => {
              if (actionPlans.length === 0) { alert('Tambahkan minimal satu Action Plan sebelum melanjutkan ke CONTROL.'); return }
              await updateProjectPhase(projectId, 'control')
              router.push(`/projects/${projectId}/control`)
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
          >
            Lanjut ke CONTROL <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleForceSyncFromAnalyze}
              disabled={isSyncing}
              title="Reset dan tarik ulang action plan dari tahap Analyze"
              className="inline-flex items-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-sm font-semibold rounded-xl text-red-400 transition-colors cursor-pointer border border-red-500/30 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} /> Reset Action Plans
            </button>
            {isKonsultan && (
              <button onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold rounded-xl text-white cursor-pointer shadow-md transition-colors">
                <Plus className="h-4 w-4" /> Tambah Action Plan
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-4">
          {actionPlans.filter(a => !a.is_deleted).length === 0 ? (
            <div className="p-12 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-3xl space-y-2">
              <h3 className="font-bold text-slate-350">Belum ada Rencana Perbaikan</h3>
            </div>
          ) : (
            Object.entries(
              actionPlans.filter(a => !a.is_deleted).reduce((acc, act) => {
                const groupName = act.problem_title || 'Tindakan Lainnya'
                if (!acc[groupName]) acc[groupName] = []
                acc[groupName].push(act)
                return acc
              }, {} as Record<string, ActionPlan[]>)
            ).map(([groupName, groupActs], groupIndex) => {
              const meta = problemMetaMap[groupName];
              
              return (
                <div key={groupName} className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="w-full flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                          {groupIndex + 1}
                        </div>
                        <h2 className="text-sm font-bold text-slate-200 text-left line-clamp-2">
                          {groupName}
                        </h2>
                        {meta && (
                          <div className="flex items-center gap-2 mt-1 sm:mt-0">
                            <span className="px-2 py-1 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700">
                              Skor: {meta.score}
                            </span>
                            <span className={`px-2 py-1 text-[10px] font-bold rounded-lg border ${
                              meta.level === 'TINGGI' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              meta.level === 'SEDANG' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {meta.level}
                            </span>
                          </div>
                        )}
                      </div>
                      {expandedProblemGroups.has(groupName) ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
                    </button>
                  </div>
                  
                  {expandedProblemGroups.has(groupName) && (
                    <div className="space-y-4 pl-4 sm:pl-10 relative before:content-[''] before:absolute before:left-[19px] sm:before:left-[43px] before:top-0 before:bottom-4 before:w-[2px] before:bg-slate-800">
                      {groupActs.map(act => {
                        const totalSteps = act.steps?.length || 0;
                        const approvedSteps = act.steps?.filter(step => {
                          const evs = checklistEvidenceMap[step.id] || [];
                          return step.is_completed || evs.some(e => e.verification_status === 'approved');
                        }).length || 0;
                        const progress = totalSteps > 0 ? Math.round((approvedSteps / totalSteps) * 100) : 0;
                        
                        const kpiTargetNum = typeof act.kpi_target === 'number' ? act.kpi_target : parseFloat(String(act.kpi_target)) || 0;
                        const kpiBaselineNum = typeof act.kpi_baseline === 'number' ? act.kpi_baseline : parseFloat(String(act.kpi_baseline)) || 0;
                        const calculatedKpiActualRaw = (progress / 100) * (kpiTargetNum - kpiBaselineNum) + kpiBaselineNum;
                        const calculatedKpiActual = Number.isInteger(calculatedKpiActualRaw) ? calculatedKpiActualRaw : Number(calculatedKpiActualRaw.toFixed(2));
                        
                        return (
                          <div key={act.id} className="relative glass-card rounded-2xl border border-slate-800 bg-slate-950/50 p-5 sm:p-6 space-y-5">
                            {/* Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800/60 pb-4">
                              <div className="flex-1 space-y-1.5">
                                <h3 className="text-lg font-bold text-slate-100">{act.title}</h3>
                                <p className="text-sm text-slate-400 whitespace-pre-line leading-relaxed">{act.description}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <select 
                                  value={act.status} 
                                  onChange={(e) => handleUpdateStatus(act.id, e.target.value as any)} 
                                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500"
                                >
                                  <option value="belum_mulai">Belum Mulai</option>
                                  <option value="sedang_berjalan">Sedang Berjalan</option>
                                  <option value="selesai">Selesai</option>
                                </select>
                                {isKonsultan && (
                                  <button onClick={() => handleDeleteAction(act.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer" title="Hapus Action Plan">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {/* Card Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                  <User className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">PIC Pelaksana</span>
                                </div>
                                <div className="text-sm font-semibold text-slate-200">{act.pic_name || '-'}</div>
                              </div>
                              
                              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Timeline</span>
                                </div>
                                <div className="text-sm font-semibold text-slate-200">{act.start_date} s/d {act.end_date}</div>
                              </div>
                              
                              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                  <Target className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Target KPI</span>
                                </div>
                                <div className="text-sm font-semibold text-indigo-400">{act.kpi_baseline} → {act.kpi_target} {act.kpi_unit}</div>
                              </div>
                              
                              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Aktual (Auto)</span>
                                </div>
                                <div className="text-sm font-semibold text-emerald-400">
                                  {calculatedKpiActual} {act.kpi_unit}
                                </div>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-end">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Progress Implementasi</span>
                                <span className="text-xs font-bold text-slate-200">{progress}%</span>
                              </div>
                              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                              </div>
                            </div>
                            
                            {/* Checklist Section */}
                            <div className="pt-2 border-t border-slate-800/60">
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Checklist Implementasi</h4>
                                {(!act.steps || act.steps.length === 0) && generatingStepsId === act.id && (
                                  <span className="text-[10px] text-indigo-400 font-bold animate-pulse flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" /> Menyusun langkah otomatis...
                                  </span>
                                )}
                              </div>
                              {act.steps && act.steps.length > 0 ? (
                                <div className="space-y-2">
                                  {act.steps.map((step, idx) => {
                                    const evs = checklistEvidenceMap[step.id] || [];
                                    const hasEv = evs.length > 0;
                                    const latestEv = evs[0];
                                    const isEvApproved = latestEv?.verification_status === 'approved';
                                    const isCompleted = step.is_completed || isEvApproved;
                                    const pendingReq = getPendingChecklistRequest(step.id);
                                    
                                    return (
                                      <div key={step.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl hover:bg-slate-900/80 transition-colors">
                                        <div 
                                          className={`flex items-start gap-3 flex-1 ${!isKonsultan && !isCompleted ? 'cursor-pointer hover:opacity-80' : ''}`}
                                          onClick={() => !isKonsultan && !isCompleted && handleToggleSelfMarkedDone(act.id, step.id)}
                                        >
                                          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                            isCompleted ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 
                                            pendingReq ? 'border-amber-500 bg-amber-500/20 text-amber-400' :
                                            'border-slate-600 bg-slate-800 text-transparent'
                                          }`}>
                                            {isCompleted && <Check className="w-2.5 h-2.5" />}
                                            {pendingReq && <span className="text-[10px]">⏳</span>}
                                          </div>
                                          <span className={`text-sm transition-colors ${isCompleted ? 'text-slate-500 line-through' : pendingReq ? 'text-amber-300' : 'text-slate-300'}`}>
                                            {step.description || step.action}
                                          </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 pl-7 sm:pl-0">
                                          {pendingReq && !isKonsultan && (
                                            <span className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border bg-amber-500/10 text-amber-400 border-amber-500/20">
                                              ⏳ Menunggu Persetujuan
                                            </span>
                                          )}

                                          {pendingReq && isKonsultan && (
                                            <div className="flex items-center gap-1">
                                              <span className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-400">Diminta: Selesai</span>
                                              <button onClick={async () => {
                                                await reviewApprovalRequest(pendingReq.id, 'approved', userInfo?.id || 'unknown')
                                                const updated = actionPlans.map(a => a.id === act.id ? { ...a, steps: (a.steps || []).map(s => s.id === step.id ? { ...s, is_completed: true } : s) } : a)
                                                setActionPlans(updated)
                                                setApprovalRequests(approvalRequests.filter(r => r.id !== pendingReq.id))
                                              }} className="px-2 py-1 bg-emerald-600/20 text-emerald-400 text-[10px] rounded hover:bg-emerald-600/40">Setujui</button>
                                              <button onClick={async () => {
                                                const reason = prompt('Alasan penolakan?')
                                                if(reason) {
                                                  await reviewApprovalRequest(pendingReq.id, 'rejected', userInfo?.id || 'unknown', reason)
                                                  setApprovalRequests(approvalRequests.filter(r => r.id !== pendingReq.id))
                                                }
                                              }} className="px-2 py-1 bg-red-600/20 text-red-400 text-[10px] rounded hover:bg-red-600/40">Tolak</button>
                                            </div>
                                          )}
                                          
                                          {hasEv && latestEv && (
                                            <span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border ${
                                              latestEv.verification_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                              latestEv.verification_status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                              Bukti: {latestEv.verification_status === 'approved' ? 'Disetujui' :
                                               latestEv.verification_status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                                            </span>
                                          )}
                                          
                                          {!isKonsultan ? (
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); setUploadChecklistStep({ actionId: act.id, stepId: step.id, title: step.description || step.action })}}
                                              className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                            >
                                              {hasEv ? 'Upload Ulang Bukti' : 'Upload Bukti'}
                                            </button>
                                          ) : (
                                            !hasEv ? (
                                              <span className="text-[10px] italic text-slate-500">Belum ada bukti</span>
                                            ) : null
                                          )}
                                          {isKonsultan && hasEv && (
                                            <button
                                                onClick={() => setVerifyChkTarget(latestEv)}
                                                className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                                              >
                                                <Eye className="w-3.5 h-3.5" /> Cek Bukti
                                              </button>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-xl border border-slate-800/80">
                                  Belum ada checklist implementasi untuk aksi ini.
                                </div>
                              )}
                            </div>

                            {/* ROI & AI Analysis Section */}
                            <div className={`pt-2 border-t mt-2 ${editingRoiId === act.id ? 'border-amber-500/50' : 'border-slate-800/60'}`}>
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                  Analisis Dampak & <Tooltip text="Return on Investment (Laba atas investasi): Rasio keuntungan yang diperoleh dibandingkan dengan biaya investasi yang dikeluarkan">ROI</Tooltip>
                                </h4>
                                <div className="flex gap-2">
                                  {editingRoiId === act.id ? (
                                    <>
                                      <button onClick={() => setEditingRoiId(null)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer">Batal</button>
                                      <button onClick={() => handleSaveRoiEdit(act.id)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg text-xs font-bold transition-all cursor-pointer">Save</button>
                                    </>
                                  ) : act.ai_analysis ? (
                                    <button onClick={() => {
                                      setRoiEditForm({
                                        estimasi_penghematan_tahunan: act.ai_analysis?.roi?.estimasi_penghematan_tahunan || 0,
                                        roi_persen: act.ai_analysis?.roi?.roi_persen || 0,
                                        biaya_implementasi: act.ai_analysis?.biaya?.estimasi || 0,
                                        target_efisiensi: act.ai_analysis?.target_efisiensi || '',
                                        manfaat: typeof act.ai_analysis?.manfaat === 'object' ? `${act.ai_analysis.manfaat.kualitatif} - ${act.ai_analysis.manfaat.kuantitatif}` : (act.ai_analysis?.manfaat || '')
                                      })
                                      setEditingRoiId(act.id)
                                    }} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer">Edit</button>
                                  ) : (
                                    <button onClick={() => {
                                      setRoiEditForm({ estimasi_penghematan_tahunan: 0, roi_persen: 0, biaya_implementasi: 0, target_efisiensi: '', manfaat: '' })
                                      setEditingRoiId(act.id)
                                    }} className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg text-xs font-bold transition-all cursor-pointer">Input Manual</button>
                                  )}
                                </div>
                              </div>

                              {editingRoiId === act.id ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/20">
                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Estimasi ROI (%)</label>
                                    <input type="number" value={roiEditForm.roi_persen} disabled className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-slate-400 cursor-not-allowed" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Penghematan Tahunan (Rp)</label>
                                    <input type="number" value={roiEditForm.estimasi_penghematan_tahunan} onChange={e => {
                                      const saving = Number(e.target.value);
                                      const invest = roiEditForm.biaya_implementasi;
                                      const roi = invest > 0 ? Math.round(((saving - invest) / invest) * 100) : 0;
                                      setRoiEditForm({...roiEditForm, estimasi_penghematan_tahunan: saving, roi_persen: roi});
                                    }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Kebutuhan Biaya (Rp)</label>
                                    <input type="number" value={roiEditForm.biaya_implementasi} onChange={e => {
                                      const invest = Number(e.target.value);
                                      const saving = roiEditForm.estimasi_penghematan_tahunan;
                                      const roi = invest > 0 ? Math.round(((saving - invest) / invest) * 100) : 0;
                                      setRoiEditForm({...roiEditForm, biaya_implementasi: invest, roi_persen: roi});
                                    }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Target Efisiensi</label>
                                    <input type="text" value={roiEditForm.target_efisiensi} onChange={e => setRoiEditForm({...roiEditForm, target_efisiensi: e.target.value})} placeholder="Misal: Meningkatkan efisiensi 10% dalam 2 minggu" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200" />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Manfaat</label>
                                    <textarea value={roiEditForm.manfaat} onChange={e => setRoiEditForm({...roiEditForm, manfaat: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 h-16 resize-none" />
                                  </div>
                                </div>
                              ) : (
                                act.ai_analysis ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                                    {/* Blok Estimasi ROI */}
                                    <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/60 relative overflow-hidden">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Estimasi ROI</span>
                                      <p className="text-xs text-emerald-400 font-semibold">
                                        {typeof act.ai_analysis.roi === 'object' ? `${act.ai_analysis.roi.roi_persen}% (Hemat Rp${Number(act.ai_analysis.roi.estimasi_penghematan_tahunan || 0).toLocaleString('id-ID')})` : act.ai_analysis.roi}
                                      </p>
                                    </div>
                                    {/* Blok Kebutuhan Biaya */}
                                    <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/60 relative overflow-hidden">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Kebutuhan Biaya / Investasi</span>
                                      <p className="text-xs text-rose-400 font-semibold">
                                        {typeof act.ai_analysis.biaya === 'object' ? `Rp${Number(act.ai_analysis.biaya.estimasi || 0).toLocaleString('id-ID')}` : act.ai_analysis.biaya}
                                      </p>
                                    </div>
                                    {/* Target Efisiensi */}
                                    <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/60">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Target Efisiensi</span>
                                      <p className="text-xs text-indigo-400 font-semibold">{act.ai_analysis.target_efisiensi}</p>
                                    </div>
                                    {/* Manfaat */}
                                    <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/60">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Manfaat</span>
                                      <p className="text-xs text-slate-300">
                                        {typeof act.ai_analysis.manfaat === 'object' ? `${act.ai_analysis.manfaat.kualitatif} - ${act.ai_analysis.manfaat.kuantitatif}` : act.ai_analysis.manfaat}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 mb-2">
                                    Belum ada data Analisis & ROI. Silakan gunakan Input Manual.
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
        
        {isKonsultan && (
          <div className="lg:col-span-4 bg-slate-950/40 border border-slate-800 p-5 rounded-3xl">
            <h3 className="text-sm font-bold text-slate-200">Metode Teridentifikasi</h3>
            {derivedRecommendations.map((rec, i) => (
              <div key={i} className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-xs font-bold text-indigo-300">{rec.method}</span>
                <button onClick={() => handlePrefillAction(rec)} className="w-full mt-2 text-center py-1.5 bg-indigo-600/20 rounded-lg text-[10px] font-bold text-indigo-300">Jadikan Action Plan</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ MODAL: Tambah Action Plan (konsultan) ══ */}
      {mounted && showAddModal && isKonsultan && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-200">Tambah Rencana Perbaikan</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateAction} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Nama Program / Judul *</label>
                <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Misal: Penerapan standard maintenance mingguan"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Deskripsi Detail</label>
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Bagaimana perbaikan akan dijalankan?"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250 focus:outline-none h-16 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Metodologi</label>
                  <select value={newMethodology} onChange={(e) => setNewMethodology(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350">
                    {['Lean Manufacturing','Kaizen','TPM','QCC / GKM','Six Sigma','5S / 5R','SMK3','Knowledge Management'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Dimensi PQCDSM</label>
                  <select value={newDimension} onChange={(e) => setNewDimension(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350">
                    {['productivity','quality','cost','delivery','safety','morale'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nama KPI</label>
                  <input type="text" value={newKpiName} onChange={(e) => setNewKpiName(e.target.value)} placeholder="Downtime" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Baseline</label>
                  <input type="number" value={newKpiBaseline} onChange={(e) => setNewKpiBaseline(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Target</label>
                  <input type="number" value={newKpiTarget} onChange={(e) => setNewKpiTarget(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Satuan KPI</label>
                  <input type="text" value={newKpiUnit} onChange={(e) => setNewKpiUnit(e.target.value)} placeholder="%, menit/hari, pcs" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">PIC Pelaksana</label>
                  <input type="text" value={newPicName} onChange={(e) => setNewPicName(e.target.value)} placeholder="Nama Penanggung Jawab" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Estimasi Cost Saving (Rp)</label>
                  <input type="number" value={newCostSaving} onChange={(e) => setNewCostSaving(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Estimasi Investasi (Rp)</label>
                  <input type="number" value={newInvestment} onChange={(e) => setNewInvestment(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tanggal Mulai</label>
                  <input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tanggal Selesai</label>
                  <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2.5 text-xs text-slate-400 cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white cursor-pointer shadow-md">Simpan Plan</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ══ MODAL: Upload Bukti (perusahaan & konsultan) ══ */}
      {mounted && uploadAction && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2"><Upload className="h-4 w-4 text-blue-400" /> Upload Bukti Implementasi</h3>
              <button onClick={() => setUploadAction(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl">
                <h4 className="text-xs font-bold text-slate-300">{uploadAction.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1">Target: {uploadAction.kpi_baseline} → {uploadAction.kpi_target} {uploadAction.kpi_unit}</p>
              </div>

              {/* info banner untuk perusahaan */}
              {!isKonsultan && (
                <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl text-[10px] text-blue-300">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Bukti yang Anda upload akan direview oleh konsultan. Nilai KPI aktual resmi akan diinput oleh konsultan setelah bukti diverifikasi.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nilai KPI yang Dicapai ({uploadAction.kpi_unit})</label>
                <input type="number" value={kpiSubmitted} onChange={(e) => setKpiSubmitted(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-250 focus:outline-none" />
                <p className="text-[10px] text-slate-500 mt-1">Ini adalah nilai yang Anda klaim. Konsultan akan memverifikasi berdasarkan bukti yang diupload.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Realisasi Cost Saving (Rp)</label>
                  <input type="number" value={costSavingInput} onChange={(e) => setCostSavingInput(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-250 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Realisasi Investasi (Rp)</label>
                  <input type="number" value={investmentInput} onChange={(e) => setInvestmentInput(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-250 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">File Bukti</label>
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl py-3 text-xs text-slate-400 hover:text-indigo-400 cursor-pointer transition-all">
                    <Upload className="h-4 w-4" />
                    {selectedFile ? selectedFile.name : 'Klik untuk pilih file (foto, PDF, dokumen)'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Atau Nama Bukti Manual</label>
                <input type="text" value={evidenceName} onChange={(e) => setEvidenceName(e.target.value)} placeholder="Misal: Foto lapangan 20 Juni 2026, Notulen rapat..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-250 focus:outline-none" />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button onClick={() => setUploadAction(null)} className="px-4 py-2 text-xs text-slate-400 cursor-pointer">Batal</button>
                <button onClick={handleUploadEvidence} disabled={uploading || (!selectedFile && !evidenceName)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-xl text-white cursor-pointer disabled:opacity-50">
                  {uploading ? 'Mengupload...' : <><Upload className="h-3.5 w-3.5" /> Submit Bukti</>}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══ MODAL: Verifikasi Bukti (konsultan only) ══ */}
      {mounted && verifyTarget && isKonsultan && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-indigo-400" /> Verifikasi Bukti Implementasi</h3>
              <button onClick={() => setVerifyTarget(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">

              {/* info bukti */}
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-2">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-200">{verifyTarget.file_name}</p>
                    {verifyTarget.file_url && !verifyTarget.file_url.startsWith('local://') && !verifyTarget.file_url.startsWith('manual://') && (
                      <a href={verifyTarget.file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:underline">Buka file →</a>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Nilai KPI diajukan perusahaan: <span className="text-amber-400 font-bold">{verifyTarget.kpi_submitted_value ?? '—'} {actionPlans.find(a => a.id === verifyActionId)?.kpi_unit}</span>
                </p>
                {verifyTarget.uploaded_by_name && <p className="text-[10px] text-slate-600">Diupload oleh: {verifyTarget.uploaded_by_name}</p>}
              </div>

              {/* keputusan verifikasi */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Keputusan Verifikasi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setVerifyStatus('verified')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${verifyStatus === 'verified' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-emerald-600'}`}>
                    <CheckCircle2 className="h-4 w-4" /> Setujui
                  </button>
                  <button onClick={() => setVerifyStatus('rejected')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${verifyStatus === 'rejected' ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-red-600'}`}>
                    <XCircle className="h-4 w-4" /> Tolak
                  </button>
                </div>
              </div>

              {/* nilai KPI aktual resmi — hanya jika setuju */}
              {verifyStatus === 'verified' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Nilai KPI Aktual Resmi ({actionPlans.find(a => a.id === verifyActionId)?.kpi_unit})
                  </label>
                  <input type="number" value={verifiedKpi} onChange={(e) => setVerifiedKpi(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-250 focus:outline-none focus:border-emerald-500" />
                  <p className="text-[10px] text-slate-500 mt-1">Nilai ini yang akan tercatat secara resmi dan tampil di Control Dashboard.</p>
                </div>
              )}

              {/* catatan konsultan */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Catatan untuk Perusahaan</label>
                <textarea value={verifyNotes} onChange={(e) => setVerifyNotes(e.target.value)} rows={3}
                  placeholder={verifyStatus === 'verified' ? 'Misal: Bukti diterima, nilai sudah sesuai hasil observasi lapangan.' : 'Jelaskan alasan penolakan dan apa yang perlu diperbaiki...'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-250 focus:outline-none resize-none" />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button onClick={() => setVerifyTarget(null)} className="px-4 py-2 text-xs text-slate-400 cursor-pointer">Batal</button>
                <button onClick={handleVerifyEvidence} disabled={verifySaving}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl text-white cursor-pointer disabled:opacity-50 ${verifyStatus === 'verified' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}>
                  <Save className="h-3.5 w-3.5" />
                  {verifySaving ? 'Menyimpan...' : verifyStatus === 'verified' ? 'Simpan & Verifikasi' : 'Simpan & Tolak'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══ MODAL: Upload Checklist Bukti (perusahaan) ══ */}
      {mounted && uploadChecklistStep && !isKonsultan && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2"><Upload className="h-4 w-4 text-blue-400" /> Upload Bukti Checklist</h3>
              <button onClick={() => { setUploadChecklistStep(null); setChkEvidenceFile(null); }} className="text-slate-500 hover:text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl">
                <h4 className="text-xs font-bold text-slate-300">Item Checklist:</h4>
                <p className="text-sm text-slate-400 mt-1">{uploadChecklistStep.title}</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">File Bukti (Max 10MB)</label>
                <div className="flex gap-2">
                  <input ref={chkFileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => setChkEvidenceFile(e.target.files?.[0] ?? null)} />
                  <button onClick={() => chkFileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl py-3 text-xs text-slate-400 hover:text-indigo-400 cursor-pointer transition-all">
                    <Upload className="h-4 w-4" />
                    {chkEvidenceFile ? chkEvidenceFile.name : 'Pilih file (Gambar, PDF, Dokumen)'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-2">
                <button onClick={() => { setUploadChecklistStep(null); setChkEvidenceFile(null); }} className="px-4 py-2 text-xs text-slate-400 cursor-pointer">Batal</button>
                <button onClick={handleUploadChecklistEvidence} disabled={chkUploading || !chkEvidenceFile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-xl text-white cursor-pointer disabled:opacity-50">
                  {chkUploading ? 'Mengupload...' : <><Upload className="h-3.5 w-3.5" /> Submit Bukti</>}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══ MODAL: Verifikasi Checklist Bukti (konsultan) ══ */}
      {mounted && verifyChkTarget && isKonsultan && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-indigo-400" /> Verifikasi Bukti Checklist</h3>
              <button onClick={() => setVerifyChkTarget(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">

              <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-2">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-200">{verifyChkTarget.file_name}</p>
                    {verifyChkTarget.file_url && (
                      <a href={verifyChkTarget.file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:underline">Buka file →</a>
                    )}
                  </div>
                </div>
                {verifyChkTarget.uploaded_by_name && <p className="text-[10px] text-slate-600">Diupload oleh: {verifyChkTarget.uploaded_by_name}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Keputusan Verifikasi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setVerifyChkStatus('approved')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${verifyChkStatus === 'approved' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-emerald-600'}`}>
                    <CheckCircle2 className="h-4 w-4" /> Setujui
                  </button>
                  <button onClick={() => setVerifyChkStatus('rejected')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${verifyChkStatus === 'rejected' ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-red-600'}`}>
                    <XCircle className="h-4 w-4" /> Tolak
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Catatan untuk Perusahaan</label>
                <textarea value={verifyChkNotes} onChange={(e) => setVerifyChkNotes(e.target.value)} rows={3}
                  placeholder={verifyChkStatus === 'approved' ? 'Misal: Bukti memadai, item checklist disetujui.' : 'Jelaskan alasan penolakan dan apa yang perlu diperbaiki...'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-250 focus:outline-none resize-none" />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-2">
                <button onClick={() => setVerifyChkTarget(null)} className="px-4 py-2 text-xs text-slate-400 cursor-pointer">Batal</button>
                <button onClick={handleVerifyChecklistEvidence} disabled={verifyChkSaving}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl text-white cursor-pointer disabled:opacity-50 ${verifyChkStatus === 'approved' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}>
                  <Save className="h-3.5 w-3.5" />
                  {verifyChkSaving ? 'Menyimpan...' : verifyChkStatus === 'approved' ? 'Setujui Bukti' : 'Tolak Bukti'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══ MODAL: Input Manual ROI ══ */}
      {mounted && manualRoiAction && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">Input Manual ROI</h3>
              <button onClick={() => setManualRoiAction(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl">
                <h4 className="text-xs font-bold text-slate-300">{manualRoiAction.title}</h4>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Cost Saving Tahunan (Rp)</label>
                <input type="number" value={manualCostSaving} onChange={(e) => setManualCostSaving(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-250 focus:outline-none" />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Biaya Implementasi / Investasi (Rp)</label>
                <input type="number" value={manualInvestment} onChange={(e) => setManualInvestment(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-250 focus:outline-none" />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button onClick={() => setManualRoiAction(null)} className="px-4 py-2 text-xs text-slate-400 cursor-pointer">Batal</button>
                <button onClick={async () => {
                  const updated = actionPlans.map(a => 
                    a.id === manualRoiAction.id ? { ...a, cost_saving_manual: manualCostSaving, investment_manual: manualInvestment } : a
                  )
                  await persistActionPlans(updated)
                  setManualRoiAction(null)
                }} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white cursor-pointer shadow-md">Simpan ROI</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
