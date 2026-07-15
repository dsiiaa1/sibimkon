'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Project, ActionPlan, EvidenceItem, MeasureProblem, AnalyzeNeed } from '@/lib/mockData'
import {
  Plus, CheckCircle2, Calendar, User, DollarSign, ArrowUpRight,
  Trash, Upload, FileText, ArrowRight, Lock, ShieldCheck,
  Clock, XCircle, Eye, Save, Sparkles, Lightbulb, X, ChevronDown, ChevronUp, RefreshCw, Activity, CheckSquare, ListTodo
} from 'lucide-react'
import { ACTION_STATUS_LABELS, sanitizeText } from '@/lib/utils'
import {
  getProjects, getActionPlans, saveActionPlans as saveActionPlansDb,
  updateProjectPhase, updateProjectScore, saveAuditLog,
  submitEvidence, verifyEvidence, getEvidenceItems, saveNotification,
  getMeasureProblems, getAnalyzeNeeds, getAnalyzeResult,
  getChecklistEvidences, submitChecklistEvidence, verifyChecklistEvidence, ChecklistEvidenceItem
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

  /* ── core state ── */
  const [project,     setProject]     = useState<Project | null>(null)
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([])
  const [measureProblems, setMeasureProblems] = useState<MeasureProblem[]>([])
  const [analyzeNeeds,    setAnalyzeNeeds]    = useState<AnalyzeNeed[]>([])
  /* evidence per action plan id */
  const [evidenceMap, setEvidenceMap] = useState<Record<string, EvidenceItem[]>>({})
  /* evidence per checklist step id */
  const [checklistEvidenceMap, setChecklistEvidenceMap] = useState<Record<string, ChecklistEvidenceItem[]>>({})

  /* ── ai analysis state ── */
  const [generatingAiId, setGeneratingAiId] = useState<string | null>(null)
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
        description: s.description,
        is_completed: false,
        step_order: idx
      }))
      
      const updated = actionPlans.map(a => a.id === act.id ? { ...a, steps: newSteps } : a)
      setActionPlans(updated)
      await persistActionPlans(updated)
    } catch (error) {
      console.error('Failed to generate steps:', error)
      alert('Gagal generate langkah AI')
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
      if (loadedActions.length === 0) {
        // Auto-fill from Analyze Phase
        const analyzeRes = await getAnalyzeResult(projectId)
        console.log('[Improve] analyzeRes:', analyzeRes)
        console.log('[Improve] priority_result:', analyzeRes?.priority_result)
        if (analyzeRes?.priority_result?.length) {
          loadedActions = analyzeRes.priority_result.flatMap((pr: any) => {
            const steps = pr.action_plan || []
            // If the priority has action_plan steps, create one ActionPlan per step
            if (steps.length > 0) {
              return steps.map((ap: any) => ({
                id: crypto.randomUUID?.() ?? 'act-' + Math.random().toString(36).substr(2,9),
                project_id: projectId,
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
            // Fallback: create one ActionPlan from the priority problem itself
            return [{
              id: crypto.randomUUID?.() ?? 'act-' + Math.random().toString(36).substr(2,9),
              project_id: projectId,
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
          console.log('[Improve] Generated action plans from priority:', loadedActions.length)
          if (loadedActions.length > 0) {
            await saveActionPlansDb(projectId, loadedActions)
          }
        }
        // Fallback 2: if priority_result is empty, try recommendations
        if (loadedActions.length === 0 && analyzeRes?.recommendations?.length) {
          console.log('[Improve] Fallback: creating from recommendations')
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

      // Ambil checklist evidence
      const allStepIds = loadedActions.flatMap(a => (a.steps || []).map(s => s.id))
      const allChecklistEvidences = await getChecklistEvidences(allStepIds)
      const chkGrouped: Record<string, ChecklistEvidenceItem[]> = {}
      for (const cev of allChecklistEvidences) {
        if (!chkGrouped[cev.step_id]) chkGrouped[cev.step_id] = []
        chkGrouped[cev.step_id].push(cev)
      }
      setChecklistEvidenceMap(chkGrouped)
    }
    loadData()
  }, [projectId, router])

  /* ── save action plans helper ── */
  /* ── Gabungkan rekomendasi metode dari fase Measure dan Kebutuhan Implementasi ── */
  const derivedRecommendations = (() => {
    const list: Array<{
      method: string;
      dimension: string;
      source: 'measure' | 'needs' | 'both';
      reasons: string[];
      needs: string[];
    }> = []

    // 1. Dari MeasureProblems
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

    // 2. Dari AnalyzeNeeds (Kebutuhan Implementasi)
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

  /* ── create action plan ── */
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

  /* ── update status / progress ── */
  const handleUpdateStatus = (actionId: string, status: ActionPlan['status']) => {
    const prevAct = actionPlans.find(a => a.id === actionId)
    const updated = actionPlans.map(act =>
      act.id === actionId ? { ...act, status, progress_percentage: status === 'selesai' ? 100 : act.progress_percentage } : act
    )
    persistActionPlans(updated)
    const localUser = localStorage.getItem('sibimkon_user')
    const actor = localUser ? JSON.parse(localUser) : null
    saveAuditLog({ project_id: projectId, action_plan_id: actionId, actor_id: actor?.id, actor_role: actor?.role, event_type: 'status_change', detail: `Status: ${prevAct?.status} → ${status}` }).catch(console.warn)
  }

  const handleUpdateProgress = (actionId: string, progress: number) => {
    const updated = actionPlans.map(act =>
      act.id === actionId ? { ...act, progress_percentage: progress, status: progress === 100 ? 'selesai' as const : progress > 0 ? 'sedang_berjalan' as const : act.status } : act
    )
    persistActionPlans(updated)
  }

  const handleDeleteAction = (actionId: string) => {
    if (!isKonsultan) return
    if (!window.confirm('Hapus action plan ini?')) return
    persistActionPlans(actionPlans.filter(act => act.id !== actionId))
  }

  /* ── AI Analysis ── */
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
    setGeneratingAiId(act.id)
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
        throw new Error(data.error || 'Gagal generate AI')
      }

      const aiData = await res.json()
      
      const updated = actionPlans.map(a =>
        a.id === act.id ? { ...a, ai_analysis: aiData } : a
      )
      
      // Auto expand on success
      setExpandedActionIds(prev => new Set(prev).add(act.id))
      await persistActionPlans(updated)

    } catch (err: any) {
      alert(`Error AI: ${err.message}`)
    } finally {
      setGeneratingAiId(null)
    }
  }

  /* ── Auto-generate AI for empty ones ── */
  useEffect(() => {
    // Only run if actionPlans is loaded and we have at least one empty
    if (actionPlans.length > 0 && !generatingAiId) {
      const emptyAct = actionPlans.find(act => !act.ai_analysis)
      if (emptyAct) {
        // use an inline async call or exclude from deps if handleGenerateAiAnalysis is not memoized
        const generate = async () => {
          setGeneratingAiId(emptyAct.id)
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
                action: emptyAct.title,
                problem: emptyAct.description,
                pic: emptyAct.pic_name,
                timeline: `${emptyAct.start_date} s/d ${emptyAct.end_date}`,
                context_data: contextData
              })
            })

            if (!res.ok) {
              const data = await res.json()
              throw new Error(data.error || 'Gagal generate AI')
            }

            const aiData = await res.json()
            
            const updated = actionPlans.map(a =>
              a.id === emptyAct.id ? { ...a, ai_analysis: aiData } : a
            )
            
            // Auto expand on success
            setExpandedActionIds(prev => new Set(prev).add(emptyAct.id))
            
            // Save to DB (inline to avoid dependency issues with persistActionPlans)
            setActionPlans(updated)
            import('@/lib/db').then(({ saveActionPlans: saveDb }) => {
              saveDb(projectId, updated).catch(console.error)
            })

          } catch (err: any) {
            console.warn(`Error AI: ${err.message}`)
          } finally {
            setGeneratingAiId(null)
          }
        }
        generate()
      }
    }
  }, [actionPlans, generatingAiId, projectId])

  /* ── PERUSAHAAN: upload bukti ── */
  const handleUploadEvidence = async () => {
    if (!uploadAction) return
    setUploading(true)
    let fileUrl  = ''
    let fileName = evidenceName || 'Bukti manual'

    if (selectedFile) {
      // 1. Validasi ukuran file (maksimal 5MB)
      const maxSizeBytes = 5 * 1024 * 1024
      if (selectedFile.size > maxSizeBytes) {
        alert('❌ Ukuran file terlalu besar! Maksimal ukuran file adalah 5MB.')
        setUploading(false)
        return
      }

      // 2. Validasi tipe file
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

    const localUser   = localStorage.getItem('sibimkon_user')
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

    /* update evidence map */
    setEvidenceMap(prev => ({ ...prev, [uploadAction.id]: [newEv, ...(prev[uploadAction.id] ?? [])] }))

    /* update cost saving dan investment jika diinput */
    if (costSavingInput > 0 || investmentInput > 0) {
      const updated = actionPlans.map(act =>
        act.id === uploadAction.id ? { ...act, cost_saving_manual: costSavingInput || act.cost_saving_manual, investment_manual: investmentInput || act.investment_manual } : act
      )
      await persistActionPlans(updated)
    }

    /* notifikasi early-warning jika perlu */
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

  /* ── KONSULTAN: verifikasi bukti + input nilai aktual ── */
  const handleVerifyEvidence = async () => {
    if (!verifyTarget) return
    setVerifySaving(true)
    const localUser = localStorage.getItem('sibimkon_user')
    const actor     = localUser ? JSON.parse(localUser) : null

    await verifyEvidence(projectId, verifyTarget.id, verifyActionId, verifiedKpi, verifyNotes, actor?.id ?? '', verifyStatus)

    /* update evidence map */
    setEvidenceMap(prev => ({
      ...prev,
      [verifyActionId]: (prev[verifyActionId] ?? []).map(e =>
        e.id === verifyTarget.id ? { ...e, evidence_status: verifyStatus, reviewer_notes: verifyNotes, reviewed_at: new Date().toISOString() } : e
      ),
    }))

    /* jika verified, update kpi_actual di action plans */
    if (verifyStatus === 'verified') {
      const updated = actionPlans.map(act =>
        act.id === verifyActionId ? { ...act, kpi_actual: verifiedKpi, verified_kpi_actual: verifiedKpi } : act
      )
      await persistActionPlans(updated)
      updateProjectScore(projectId, updated).then(s => setProject(p => p ? { ...p, current_score: s } : p)).catch(console.warn)
    }

    setVerifySaving(false)
    setVerifyTarget(null)
    setVerifyNotes('')
  }

  /* ── PERUSAHAAN: upload checklist bukti ── */
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

    const localUser = localStorage.getItem('sibimkon_user')
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
        // we can filter out old 'pending' or just prepend
        return { ...prev, [uploadChecklistStep.stepId]: [newEv, ...oldArr] }
      })
    }

    setChkUploading(false)
    setUploadChecklistStep(null)
    setChkEvidenceFile(null)
  }

  /* ── KONSULTAN: verify checklist bukti ── */
  const handleVerifyChecklistEvidence = async () => {
    if (!verifyChkTarget) return
    setVerifyChkSaving(true)
    const localUser = localStorage.getItem('sibimkon_user')
    const actor = localUser ? JSON.parse(localUser) : null

    await verifyChecklistEvidence(verifyChkTarget.id, verifyChkStatus, verifyChkNotes, actor?.id ?? '')

    setChecklistEvidenceMap(prev => ({
      ...prev,
      [verifyChkTarget.step_id]: (prev[verifyChkTarget.step_id] ?? []).map(e =>
        e.id === verifyChkTarget.id ? { ...e, verification_status: verifyChkStatus, rejection_note: verifyChkNotes, verified_by: actor?.id, verified_at: new Date().toISOString() } : e
      )
    }))

    if (verifyChkStatus === 'approved') {
      // Auto complete step
      const stepId = verifyChkTarget.step_id
      const actionId = actionPlans.find(act => act.steps?.some(s => s.id === stepId))?.id
      if (actionId) {
        await handleToggleStep(actionId, stepId, true)
      }
    }

    setVerifyChkSaving(false)
    setVerifyChkTarget(null)
    setVerifyChkNotes('')
  }

  if (!project) return null

  /* ── pending evidence count (untuk badge konsultan) ── */
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
          {/* Badge pending bukti — hanya untuk konsultan */}
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
          {isKonsultan && (
            <button onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold rounded-xl text-white cursor-pointer shadow-md">
              <Plus className="h-4 w-4" /> Tambah Action Plan
            </button>
          )}
        </div>
      </div>


      {/* ── Alur kerja banner ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { step:'1', actor:'Perusahaan', desc:'Upload bukti implementasi & input nilai KPI yang dicapai', color:'text-blue-400', bg:'bg-blue-500/5 border-blue-500/15' },
          { step:'2', actor:'Konsultan',  desc:'Review bukti, beri catatan, dan putuskan verifikasi',   color:'text-amber-400', bg:'bg-amber-500/5 border-amber-500/15' },
          { step:'3', actor:'Konsultan',  desc:'Input nilai KPI aktual resmi setelah bukti disetujui',  color:'text-emerald-400', bg:'bg-emerald-500/5 border-emerald-500/15' },
        ].map((s) => (
          <div key={s.step} className={`flex items-start gap-3 p-4 rounded-2xl border ${s.bg}`}>
            <span className={`h-6 w-6 rounded-full border flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${s.color} border-current`}>{s.step}</span>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${s.color}`}>{s.actor}</span>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Daftar Action Plans & Rekomendasi ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Kolom Kiri: Action Plans List (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {actionPlans.length === 0 ? (
            <div className="p-12 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-3xl space-y-2">
              <h3 className="font-bold text-slate-350">Belum ada Rencana Perbaikan</h3>
              <p className="text-xs text-slate-500">
                {isKonsultan ? 'Tambahkan action plan baru atau gunakan rekomendasi metode dari fase Measure & Analyze di sebelah kanan.' : 'Konsultan belum membuat action plan. Silakan tunggu atau hubungi konsultan Anda.'}
              </p>
            </div>
          ) : (
            Object.entries(
              actionPlans.reduce((acc, act) => {
                const groupName = act.problem_title || 'Tindakan Lainnya'
                if (!acc[groupName]) acc[groupName] = []
                acc[groupName].push(act)
                return acc
              }, {} as Record<string, ActionPlan[]>)
            ).map(([groupName, groupActs]) => (
              <div key={groupName} className="space-y-4">
                {/* Collapsible Header */}
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ListTodo className="h-5 w-5 text-indigo-400" />
                    <h2 className="text-sm font-bold text-slate-200">{groupName}</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      {groupActs.length} plan
                    </span>
                  </div>
                  {expandedProblemGroups.has(groupName) ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {/* Group Content */}
                {expandedProblemGroups.has(groupName) && (
                  <div className="pl-4 border-l-2 border-slate-800/50 space-y-4 ml-2">
                    {groupActs.map(act => {
                      const evidences     = evidenceMap[act.id] ?? []
                      const pendingEv     = evidences.filter(e => e.evidence_status === 'pending')
                      const verifiedEv    = evidences.filter(e => e.evidence_status === 'verified')
                      return (
                        <div key={act.id} className="glass-card rounded-2xl border border-slate-800 bg-slate-950/30 p-5 space-y-4 hover:border-slate-700 transition-all">

                  {/* ── row atas ── */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-850 pb-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-indigo-400">{act.methodology}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-500">{act.dimension}</span>
                        {pendingEv.length > 0 && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded border bg-amber-500/10 border-amber-500/30 text-amber-400">
                            {pendingEv.length} bukti pending
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-200">{act.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={act.status} onChange={(e) => handleUpdateStatus(act.id, e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5 text-xs text-slate-300 focus:outline-none">
                        <option value="belum_mulai">Belum Mulai</option>
                        <option value="sedang_berjalan">Sedang Berjalan</option>
                        <option value="selesai">Selesai</option>
                        <option value="tertunda">Tertunda</option>
                      </select>
                      {isKonsultan && (
                        <button onClick={() => handleDeleteAction(act.id)} className="text-slate-600 hover:text-red-400 p-1 rounded cursor-pointer">
                          <Trash className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">{act.description}</p>

                  {!isKonsultan && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-400/70 bg-amber-400/5 border border-amber-400/15 rounded-lg px-2.5 py-1.5 w-fit">
                      <Lock className="h-3 w-3" /> Detail program, KPI, PIC, dan timeline dikelola oleh konsultan
                    </div>
                  )}

                  {/* ── detail grid ── */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-850 text-xs">
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider text-[10px] block font-bold">PIC Pelaksana</span>
                      <span className="font-semibold text-slate-300 flex items-center gap-1.5 mt-1"><User className="h-3.5 w-3.5 text-slate-500" />{act.pic_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider text-[10px] block font-bold">Timeline</span>
                      <span className="font-semibold text-slate-300 flex items-center gap-1.5 mt-1"><Calendar className="h-3.5 w-3.5 text-slate-500" />{act.start_date} s/d {act.end_date}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider text-[10px] block font-bold">Target KPI</span>
                      <span className="font-semibold text-slate-350 block mt-1">{act.kpi_baseline} → <span className="text-indigo-400 font-bold">{act.kpi_target}</span> {act.kpi_unit}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider text-[10px] block font-bold">Aktual Terverifikasi</span>
                      <span className="font-semibold block mt-1">
                        {act.verified_kpi_actual !== undefined
                          ? <span className="text-emerald-400 font-bold flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />{act.verified_kpi_actual} {act.kpi_unit}</span>
                          : act.kpi_actual !== undefined
                            ? <span className="text-amber-400 font-bold flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{act.kpi_actual} {act.kpi_unit} <span className="text-[9px] text-slate-500">(blm verif)</span></span>
                            : <span className="text-slate-600 italic">Belum ada</span>
                        }
                      </span>
                    </div>
                  </div>

                  {/* ── progress bar ── */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">Progress Implementasi:</span>
                      <span className="font-bold text-indigo-400">{act.progress_percentage}%</span>
                    </div>
                    {isKonsultan || (act.verified_kpi_actual === undefined && verifiedEv.length === 0)
                      ? <input type="range" min="0" max="100" value={act.progress_percentage} onChange={(e) => handleUpdateProgress(act.id, Number(e.target.value))} className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                      : <div className="w-full h-1.5 bg-slate-900 rounded-lg overflow-hidden"><div className="h-full rounded-lg bg-indigo-500 transition-all" style={{ width:`${act.progress_percentage}%` }} /></div>
                    }
                  </div>

                  {/* ── daftar bukti yang sudah diupload ── */}
                  {evidences.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Riwayat Bukti</p>
                      {evidences.map((ev) => {
                        const badge = EVIDENCE_STATUS_BADGE[ev.evidence_status]
                        return (
                          <div key={ev.id} className="flex items-start justify-between gap-3 p-3 bg-slate-950/50 border border-slate-850 rounded-xl">
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <FileText className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                              <div className="space-y-0.5 min-w-0">
                                <p className="text-xs font-semibold text-slate-300 truncate">{ev.file_name}</p>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                                  {ev.kpi_submitted_value !== undefined && <span>Nilai diajukan: <span className="text-amber-400 font-bold">{ev.kpi_submitted_value} {act.kpi_unit}</span></span>}
                                  {ev.uploaded_by_name && <span>oleh {ev.uploaded_by_name}</span>}
                                </div>
                                {ev.reviewer_notes && <p className="text-[10px] text-slate-400 italic mt-1">"{ev.reviewer_notes}"</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
                              {/* tombol verifikasi — konsultan + status pending/reviewed */}
                              {isKonsultan && (ev.evidence_status === 'pending' || ev.evidence_status === 'reviewed') && (
                                <button
                                  onClick={() => {
                                    setVerifyTarget(ev)
                                    setVerifyActionId(act.id)
                                    setVerifiedKpi(ev.kpi_submitted_value ?? act.kpi_baseline)
                                    setVerifyNotes('')
                                    setVerifyStatus('verified')
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold rounded-lg text-white cursor-pointer"
                                >
                                  <Eye className="h-3 w-3" /> Verifikasi
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ── action buttons bawah ── */}
                  <div className="flex justify-end gap-2 pt-1">
                    {/* perusahaan: upload bukti */}
                    {!isKonsultan && (
                      <button
                        onClick={() => { setUploadAction(act); setKpiSubmitted(act.kpi_actual ?? act.kpi_baseline); setCostSavingInput(act.cost_saving_manual ?? 0); setInvestmentInput(act.investment_manual ?? 0) }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold rounded-xl text-blue-400 hover:text-white transition-all cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" /> Upload Bukti
                      </button>
                    )}
                    {/* konsultan: lihat & verifikasi bukti (bukan upload) */}
                    {isKonsultan && (() => {
                      const pendingEv = evidences.find(e => e.evidence_status === 'pending' || e.evidence_status === 'reviewed')
                      if (evidences.length === 0) {
                        return (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-800 text-xs font-bold rounded-xl text-slate-600 italic">
                            <Eye className="h-3.5 w-3.5" /> Belum ada bukti
                          </span>
                        )
                      }
                      return (
                        <button
                          onClick={() => {
                            const ev = pendingEv || evidences[0]
                            setVerifyTarget(ev)
                            setVerifyActionId(act.id)
                            setVerifiedKpi(ev.kpi_submitted_value ?? act.kpi_baseline)
                            setVerifyNotes('')
                            setVerifyStatus('verified')
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-xs font-bold rounded-xl text-indigo-300 hover:text-white transition-all cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {pendingEv ? 'Verifikasi Bukti' : 'Lihat Bukti'}
                          {pendingEv && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                        </button>
                      )
                    })()}
                  </div>

                  {/* ── Checklist Implementasi ── */}
                  <div className="pt-2 border-t border-slate-850">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-slate-300">Checklist Implementasi</span>
                      </div>
                      {isKonsultan && (!act.steps || act.steps.length === 0) && (
                        <button
                          onClick={() => handleGenerateSteps(act)}
                          disabled={generatingStepsId === act.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-bold rounded-lg text-emerald-400 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {generatingStepsId === act.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          AI Auto-Checklist
                        </button>
                      )}
                    </div>
                    {act.steps && act.steps.length > 0 ? (
                      <div className="space-y-2">
                        {act.steps.map(step => {
                          const chkEvs = checklistEvidenceMap[step.id] || []
                          const latestEv = chkEvs[0]
                          const isApproved = latestEv?.verification_status === 'approved'
                          const isPending = latestEv?.verification_status === 'pending'
                          const isRejected = latestEv?.verification_status === 'rejected'
                          const stepCompleted = isApproved || step.is_completed

                          return (
                            <div key={step.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-2.5 rounded-xl bg-slate-900/40 border border-slate-800 hover:bg-slate-800/40 transition-colors">
                              <div className="flex items-start gap-3 flex-1">
                                <input 
                                  type="checkbox" 
                                  checked={stepCompleted} 
                                  disabled
                                  className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 bg-slate-950 disabled:opacity-70" 
                                />
                                <span className={`text-xs flex-1 leading-relaxed ${stepCompleted ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                  {step.action}
                                  {isRejected && latestEv?.rejection_note && (
                                    <span className="block mt-1 text-[10px] text-red-400 bg-red-500/10 p-1.5 rounded-md border border-red-500/20">Catatan Penolakan: {latestEv.rejection_note}</span>
                                  )}
                                </span>
                              </div>
                              
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pl-7 sm:pl-0">
                                {latestEv ? (
                                  <div className="flex items-center gap-2">
                                    <a href={latestEv.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-[10px] rounded-lg text-slate-300 transition-colors" title={latestEv.file_name}>
                                      <FileText className="w-3 h-3" />
                                      <span className="max-w-[100px] truncate">{latestEv.file_name}</span>
                                    </a>
                                    
                                    {isKonsultan ? (
                                      isPending ? (
                                        <button onClick={() => {
                                          setVerifyChkTarget(latestEv)
                                          setVerifyChkStatus('approved')
                                          setVerifyChkNotes('')
                                        }} className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-xs font-bold rounded-lg text-indigo-300 hover:text-white transition-all cursor-pointer">
                                          <Eye className="w-3.5 h-3.5" /> Cek Bukti
                                          <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                        </button>
                                      ) : (
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${EVIDENCE_STATUS_BADGE[latestEv.verification_status as any]?.cls || 'text-slate-500'}`}>
                                          {EVIDENCE_STATUS_BADGE[latestEv.verification_status as any]?.label || latestEv.verification_status}
                                        </span>
                                      )
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${EVIDENCE_STATUS_BADGE[latestEv.verification_status as any]?.cls || 'text-slate-500'}`}>
                                          {EVIDENCE_STATUS_BADGE[latestEv.verification_status as any]?.label || latestEv.verification_status}
                                        </span>
                                        {!isApproved && (
                                          <button onClick={() => setUploadChecklistStep({ actionId: act.id, stepId: step.id, title: step.action })} className="p-1.5 text-slate-400 hover:text-indigo-400 bg-slate-900 border border-slate-700 hover:border-indigo-500/50 rounded-lg transition-colors" title="Upload ulang">
                                            <Upload className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  !isKonsultan ? (
                                    <button onClick={() => setUploadChecklistStep({ actionId: act.id, stepId: step.id, title: step.action })} className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/50 text-[10px] font-bold rounded-lg text-slate-300 hover:text-indigo-300 transition-all cursor-pointer">
                                      <Upload className="w-3 h-3" /> Upload Bukti
                                    </button>
                                  ) : (
                                    <span className="text-[10px] italic text-slate-500">Belum ada bukti</span>
                                  )
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">Belum ada rincian langkah kerja.</p>
                    )}
                  </div>

                  {/* ── AI Analysis Expandable Section ── */}
                  <div className="pt-2 border-t border-slate-850">
                    <button
                      onClick={() => handleToggleExpand(act.id)}
                      className="flex items-center justify-between w-full p-2 bg-slate-900/50 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-slate-300">Analisis Lean Six Sigma</span>
                        {act.ai_analysis && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ml-2 ${
                            act.ai_analysis.roi.roi_persen > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                            act.ai_analysis.roi.roi_persen < 0 ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                            'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          }`}>
                            {act.ai_analysis.roi.roi_persen > 0 ? 'ROI Positif' : act.ai_analysis.roi.roi_persen < 0 ? 'ROI Negatif' : 'Break-even'}
                          </span>
                        )}
                      </div>
                      {expandedActionIds.has(act.id) ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </button>

                    {expandedActionIds.has(act.id) && (
                      <div className="mt-3 space-y-4 p-3 bg-slate-950/40 border border-slate-800 rounded-xl relative">
                        {!act.ai_analysis && generatingAiId !== act.id ? (
                          <div className="text-center py-6">
                            <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                            <p className="text-xs text-slate-400 mb-3">Analisis persiapan, biaya, dan ROI belum tersedia.</p>
                            <button
                              onClick={() => handleGenerateAiAnalysis(act)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-lg text-white transition-all cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Generate Analisis AI
                            </button>
                          </div>
                        ) : generatingAiId === act.id ? (
                          <div className="text-center py-6">
                            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
                            <p className="text-xs text-slate-400 animate-pulse">AI sedang menganalisis persiapan & kelayakan...</p>
                          </div>
                        ) : act.ai_analysis ? (
                          <>
                            <div className="flex justify-end mb-2">
                              <button
                                onClick={() => persistActionPlans(actionPlans)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/50 text-[10px] font-bold rounded-lg text-emerald-400 hover:text-white transition-all cursor-pointer shadow-sm"
                              >
                                <Save className="w-3.5 h-3.5" /> Simpan Analisis
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              {/* Persiapan */}
                              <div className="space-y-1">
                                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Persiapan</span>
                                <textarea
                                  value={act.ai_analysis.persiapan}
                                  onChange={(e) => handleUpdateAiAnalysis(act.id, { ...act.ai_analysis, persiapan: e.target.value })}
                                  className="w-full h-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-300 focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              {/* Target Efisiensi */}
                              <div className="space-y-1">
                                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Target Efisiensi</span>
                                <textarea
                                  value={act.ai_analysis.target_efisiensi}
                                  onChange={(e) => handleUpdateAiAnalysis(act.id, { ...act.ai_analysis, target_efisiensi: e.target.value })}
                                  className="w-full h-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-emerald-400 focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              {/* Sumber Daya */}
                              <div className="space-y-1 md:col-span-2">
                                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Sumber Daya</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <textarea placeholder="SDM" value={act.ai_analysis.sumber_daya.sdm} onChange={(e) => handleUpdateAiAnalysis(act.id, { ...act.ai_analysis, sumber_daya: { ...act.ai_analysis!.sumber_daya, sdm: e.target.value } })} className="bg-slate-900 border border-slate-800 rounded p-2 text-slate-300 focus:outline-none focus:border-indigo-500 min-h-[60px]" />
                                  <textarea placeholder="Alat" value={act.ai_analysis.sumber_daya.alat} onChange={(e) => handleUpdateAiAnalysis(act.id, { ...act.ai_analysis, sumber_daya: { ...act.ai_analysis!.sumber_daya, alat: e.target.value } })} className="bg-slate-900 border border-slate-800 rounded p-2 text-slate-300 focus:outline-none focus:border-indigo-500 min-h-[60px]" />
                                  <textarea placeholder="Anggaran" value={act.ai_analysis.sumber_daya.anggaran_terkait} onChange={(e) => handleUpdateAiAnalysis(act.id, { ...act.ai_analysis, sumber_daya: { ...act.ai_analysis!.sumber_daya, anggaran_terkait: e.target.value } })} className="bg-slate-900 border border-slate-800 rounded p-2 text-slate-300 focus:outline-none focus:border-indigo-500 min-h-[60px]" />
                                </div>
                              </div>

                              {/* Biaya */}
                              <div className="space-y-1">
                                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Estimasi Biaya (Rp)</span>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    value={act.ai_analysis.biaya.estimasi}
                                    onChange={(e) => handleUpdateAiAnalysis(act.id, { ...act.ai_analysis, biaya: { ...act.ai_analysis!.biaya, estimasi: Number(e.target.value) } })}
                                    className="w-1/3 h-10 bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-300 focus:outline-none focus:border-indigo-500"
                                  />
                                  <textarea
                                    placeholder="Rincian"
                                    value={act.ai_analysis.biaya.rincian}
                                    onChange={(e) => handleUpdateAiAnalysis(act.id, { ...act.ai_analysis, biaya: { ...act.ai_analysis!.biaya, rincian: e.target.value } })}
                                    className="w-2/3 h-10 bg-slate-900 border border-slate-800 rounded p-2 text-slate-300 focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              {/* Manfaat */}
                              <div className="space-y-1">
                                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Manfaat (Kualitatif & Kuantitatif)</span>
                                <div className="space-y-2">
                                  <textarea placeholder="Kualitatif" value={act.ai_analysis.manfaat.kualitatif} onChange={(e) => handleUpdateAiAnalysis(act.id, { ...act.ai_analysis, manfaat: { ...act.ai_analysis!.manfaat, kualitatif: e.target.value } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-300 focus:outline-none focus:border-indigo-500 min-h-[60px]" />
                                  <textarea placeholder="Kuantitatif" value={act.ai_analysis.manfaat.kuantitatif} onChange={(e) => handleUpdateAiAnalysis(act.id, { ...act.ai_analysis, manfaat: { ...act.ai_analysis!.manfaat, kuantitatif: e.target.value } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-300 focus:outline-none focus:border-indigo-500 min-h-[60px]" />
                                </div>
                              </div>

                              {/* ROI */}
                              <div className="space-y-1 md:col-span-2 bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3">
                                <span className="text-indigo-300 font-bold uppercase tracking-wider text-[10px]">ROI (Return on Improvement)</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                                  <div>
                                    <span className="text-[9px] text-slate-500 block mb-0.5">Penghematan Tahunan (Rp)</span>
                                    <input type="number" value={act.ai_analysis.roi.estimasi_penghematan_tahunan} onChange={(e) => {
                                      const saving = Number(e.target.value)
                                      const cost = act.ai_analysis!.roi.biaya_implementasi
                                      const roi = cost > 0 ? Math.round(((saving - cost) / cost) * 100) : 0
                                      handleUpdateAiAnalysis(act.id, { ...act.ai_analysis, roi: { ...act.ai_analysis!.roi, estimasi_penghematan_tahunan: saving, roi_persen: roi } })
                                    }} className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-emerald-400 font-bold focus:outline-none focus:border-indigo-500" />
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-500 block mb-0.5">Biaya Implementasi (Rp)</span>
                                    <input type="number" value={act.ai_analysis.roi.biaya_implementasi} onChange={(e) => {
                                      const cost = Number(e.target.value)
                                      const saving = act.ai_analysis!.roi.estimasi_penghematan_tahunan
                                      const roi = cost > 0 ? Math.round(((saving - cost) / cost) * 100) : 0
                                      handleUpdateAiAnalysis(act.id, { ...act.ai_analysis, roi: { ...act.ai_analysis!.roi, biaya_implementasi: cost, roi_persen: roi } })
                                    }} className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-rose-400 font-bold focus:outline-none focus:border-indigo-500" />
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-500 block mb-0.5">ROI (%)</span>
                                    <div className="flex items-center gap-2">
                                      <input type="number" value={act.ai_analysis.roi.roi_persen} onChange={(e) => handleUpdateAiAnalysis(act.id, { ...act.ai_analysis, roi: { ...act.ai_analysis!.roi, roi_persen: Number(e.target.value) } })} className="w-20 bg-slate-900 border border-slate-800 rounded p-1.5 text-indigo-400 font-bold focus:outline-none focus:border-indigo-500" />
                                      <span className="text-slate-400 text-[10px]">
                                        (Otomatis)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <textarea placeholder="Catatan ROI" value={act.ai_analysis.roi.catatan} onChange={(e) => handleUpdateAiAnalysis(act.id, { ...act.ai_analysis, roi: { ...act.ai_analysis!.roi, catatan: e.target.value } })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-400 italic focus:outline-none focus:border-indigo-500 min-h-[60px]" />
                                </div>
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    ))
  )}
</div>

        {/* Kolom Kanan: Rekomendasi Sidebar (4 cols) — Hanya untuk Konsultan */}
        {isKonsultan && (
          <div className="lg:col-span-4 space-y-4 bg-slate-950/40 border border-slate-800 p-5 rounded-3xl">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-200">Metode Teridentifikasi</h3>
                <p className="text-[10px] text-slate-500">Hasil fase Measure &amp; Analyze</p>
              </div>
            </div>

            {derivedRecommendations.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 italic space-y-1">
                <p>Belum ada rekomendasi metode.</p>
                <p className="text-[10px] text-slate-600">Selesaikan analisis di fase Measure &amp; Analyze terlebih dahulu.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {derivedRecommendations.map((rec, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-900/60 border border-slate-850 rounded-2xl hover:border-slate-850/80 transition-all space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-indigo-300 block">{rec.method}</span>
                      <span className="text-[9px] uppercase font-extrabold tracking-wider bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-indigo-400 shrink-0">{rec.dimension.split(' ')[0]}</span>
                    </div>

                    {rec.reasons.length > 0 && (
                      <p className="text-[11px] text-slate-400 leading-normal">
                        {rec.reasons[0]}
                      </p>
                    )}

                    {rec.needs.length > 0 && (
                      <div className="text-[10px] text-slate-500 leading-normal pt-2 border-t border-slate-850/60">
                        <strong className="text-slate-400 block mb-1">Rencana Kebutuhan:</strong>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {rec.needs.slice(0, 3).map((n, ni) => <li key={ni} className="truncate">{n}</li>)}
                          {rec.needs.length > 3 && <li className="italic text-slate-600">+{rec.needs.length - 3} lainnya</li>}
                        </ul>
                      </div>
                    )}

                    <button
                      onClick={() => handlePrefillAction(rec)}
                      className="w-full text-center py-2 bg-indigo-600/20 hover:bg-indigo-600 text-xs font-bold rounded-xl text-indigo-300 hover:text-white transition-all cursor-pointer mt-1"
                    >
                      + Jadikan Action Plan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>


      {/* ══ MODAL: Tambah Action Plan (konsultan) ══ */}
      {showAddModal && isKonsultan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-200">Tambah Rencana Perbaikan</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateAction} className="p-6 space-y-4">
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
        </div>
      )}

      {/* ══ MODAL: Upload Bukti (perusahaan & konsultan) ══ */}
      {uploadAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
        </div>
      )}

      {/* ══ MODAL: Verifikasi Bukti (konsultan only) ══ */}
      {verifyTarget && isKonsultan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
        </div>
      )}

      {/* ══ MODAL: Upload Checklist Bukti (perusahaan) ══ */}
      {uploadChecklistStep && !isKonsultan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
        </div>
      )}

      {/* ══ MODAL: Verifikasi Checklist Bukti (konsultan) ══ */}
      {verifyChkTarget && isKonsultan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
        </div>
      )}

    </div>
  )
}
