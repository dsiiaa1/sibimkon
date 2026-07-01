'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Project, ActionPlan, EvidenceItem, MeasureProblem, AnalyzeNeed } from '@/lib/mockData'
import {
  Plus, CheckCircle2, Calendar, User, DollarSign, ArrowUpRight,
  Trash, Upload, FileText, ArrowRight, Lock, ShieldCheck,
  Clock, XCircle, Eye, Save, Sparkles, Lightbulb,
} from 'lucide-react'
import { ACTION_STATUS_LABELS, sanitizeText } from '@/lib/utils'
import {
  getProjects, getActionPlans, saveActionPlans as saveActionPlansDb,
  updateProjectPhase, updateProjectScore, saveAuditLog,
  submitEvidence, verifyEvidence, getEvidenceItems, saveNotification,
  getMeasureProblems, getAnalyzeNeeds,
} from '@/lib/db'
import { useUserRole } from '@/hooks/useUserRole'

/* ── badge warna status bukti ── */
const EVIDENCE_STATUS_BADGE: Record<EvidenceItem['evidence_status'], { label: string; cls: string }> = {
  pending:  { label: 'Menunggu Verifikasi', cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
  reviewed: { label: 'Sudah Dilihat',       cls: 'bg-blue-500/10  border-blue-500/30  text-blue-400'  },
  verified: { label: 'Terverifikasi',        cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
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

  /* ── upload bukti modal (perusahaan) ── */
  const [uploadAction,   setUploadAction]   = useState<ActionPlan | null>(null)
  const [evidenceName,   setEvidenceName]   = useState('')
  const [selectedFile,   setSelectedFile]   = useState<File | null>(null)
  const [kpiSubmitted,   setKpiSubmitted]   = useState<number>(0)
  const [uploading,      setUploading]      = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── verifikasi modal (konsultan) ── */
  const [verifyTarget,    setVerifyTarget]    = useState<EvidenceItem | null>(null)
  const [verifyActionId,  setVerifyActionId]  = useState<string>('')
  const [verifiedKpi,     setVerifiedKpi]     = useState<number>(0)
  const [verifyNotes,     setVerifyNotes]     = useState('')
  const [verifyStatus,    setVerifyStatus]    = useState<'verified' | 'rejected'>('verified')
  const [verifySaving,    setVerifySaving]    = useState(false)

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
      setActionPlans(actions)
      setMeasureProblems(mProblems)
      setAnalyzeNeeds(aNeeds)

      const grouped: Record<string, EvidenceItem[]> = {}
      for (const ev of allEvidence) {
        if (!grouped[ev.action_plan_id]) grouped[ev.action_plan_id] = []
        grouped[ev.action_plan_id].push(ev)
      }
      setEvidenceMap(grouped)
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
      pic_name: sanitizeText(newPicName), start_date: newStartDate, end_date: newEndDate,
      status: 'belum_mulai', progress_percentage: 0,
    }
    await persistActionPlans([...actionPlans, newAction])
    setShowAddModal(false)
    setNewTitle(''); setNewDesc(''); setNewKpiName(''); setNewKpiBaseline(0); setNewKpiTarget(0); setNewKpiUnit(''); setNewPicName('')
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

    /* notifikasi early-warning jika perlu */
    const isSlip = uploadAction.kpi_target > uploadAction.kpi_baseline
      ? Number(kpiSubmitted) < uploadAction.kpi_baseline
      : Number(kpiSubmitted) > uploadAction.kpi_baseline
    if (isSlip && uploaderInfo?.id) {
      saveNotification({ user_id: uploaderInfo.id, project_id: projectId, type: 'early_warning', title: `⚠️ Early Warning: ${uploadAction.kpi_name}`, message: `KPI "${uploadAction.kpi_name}" di level PERINGATAN. Nilai bukti: ${kpiSubmitted} (Target: ${uploadAction.kpi_target})` }).catch(console.warn)
    }

    setUploading(false)
    setUploadAction(null)
    setEvidenceName(''); setSelectedFile(null); setKpiSubmitted(0)
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

  if (!project) return null

  /* ── pending evidence count (untuk badge konsultan) ── */
  const pendingCount = Object.values(evidenceMap).flat().filter(e => e.evidence_status === 'pending').length

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
            actionPlans.map(act => {
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
                    {isKonsultan
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
                        onClick={() => { setUploadAction(act); setKpiSubmitted(act.kpi_actual ?? act.kpi_baseline) }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold rounded-xl text-blue-400 hover:text-white transition-all cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" /> Upload Bukti
                      </button>
                    )}
                    {/* konsultan: juga bisa upload bukti */}
                    {isKonsultan && (
                      <button
                        onClick={() => { setUploadAction(act); setKpiSubmitted(act.kpi_actual ?? act.kpi_baseline) }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" /> Upload / Lihat Bukti
                      </button>
                    )}
                  </div>

                </div>
              )
            })
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
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer">✕</button>
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
              <button onClick={() => setUploadAction(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer">✕</button>
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
              <button onClick={() => setVerifyTarget(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer">✕</button>
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

    </div>
  )
}
