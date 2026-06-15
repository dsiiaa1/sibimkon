'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getMockDB, updateMockDB, Project, ActionPlan } from '@/lib/mockData'
import { LineChart, Plus, CheckCircle2, AlertTriangle, Calendar, User, DollarSign, ArrowUpRight, Check, Trash } from 'lucide-react'
import { ACTION_STATUS_LABELS } from '@/lib/utils'

export default function ImprovePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([])
  
  // Modal & form states
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newMethodology, setNewMethodology] = useState('Lean Manufacturing')
  const [newDimension, setNewDimension] = useState('productivity')
  const [newKpiName, setNewKpiName] = useState('')
  const [newKpiBaseline, setNewKpiBaseline] = useState(0)
  const [newKpiTarget, setNewKpiTarget] = useState(0)
  const [newKpiUnit, setNewKpiUnit] = useState('')
  const [newPicName, setNewPicName] = useState('')
  const [newStartDate, setNewStartDate] = useState('2026-06-15')
  const [newEndDate, setNewEndDate] = useState('2026-08-15')

  // Selected Action Plan for Evidence / KPI actual update
  const [selectedAction, setSelectedAction] = useState<ActionPlan | null>(null)
  const [kpiActualInput, setKpiActualInput] = useState<number>(0)
  const [evidenceName, setEvidenceName] = useState('')

  useEffect(() => {
    const db = getMockDB()
    const proj = db.projects.find((p: Project) => p.id === projectId)
    if (!proj) {
      router.push('/dashboard')
      return
    }
    setProject(proj)

    setActionPlans(db.actionPlans[projectId] || [])
  }, [projectId, router])

  const handleCreateAction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle) return

    const newAction: ActionPlan = {
      id: 'act-' + Math.random().toString(36).substr(2, 9),
      project_id: projectId,
      title: newTitle,
      description: newDesc,
      methodology: newMethodology,
      dimension: newDimension,
      kpi_name: newKpiName,
      kpi_baseline: Number(newKpiBaseline),
      kpi_target: Number(newKpiTarget),
      kpi_unit: newKpiUnit,
      pic_name: newPicName,
      start_date: newStartDate,
      end_date: newEndDate,
      status: 'belum_mulai',
      progress_percentage: 0
    }

    const updated = [...actionPlans, newAction]
    setActionPlans(updated)

    const db = getMockDB()
    db.actionPlans[projectId] = updated
    updateMockDB('actionPlans', db.actionPlans)

    setShowAddModal(false)
    resetForm()
  }

  const resetForm = () => {
    setNewTitle('')
    setNewDesc('')
    setNewKpiName('')
    setNewKpiBaseline(0)
    setNewKpiTarget(0)
    setNewKpiUnit('')
    setNewPicName('')
  }

  const handleUpdateStatus = (actionId: string, status: ActionPlan['status']) => {
    const updated = actionPlans.map(act => 
      act.id === actionId 
        ? { ...act, status, progress_percentage: status === 'selesai' ? 100 : act.progress_percentage } 
        : act
    )
    saveActionPlans(updated)
  }

  const handleUpdateProgress = (actionId: string, progress: number) => {
    const updated = actionPlans.map(act => 
      act.id === actionId 
        ? { 
            ...act, 
            progress_percentage: progress,
            status: progress === 100 ? 'selesai' as const : progress > 0 ? 'sedang_berjalan' as const : act.status 
          } 
        : act
    )
    saveActionPlans(updated)
  }

  const handleSaveEvidence = () => {
    if (!selectedAction) return
    const updated = actionPlans.map(act => 
      act.id === selectedAction.id 
        ? { ...act, kpi_actual: Number(kpiActualInput), progress_percentage: kpiActualInput >= act.kpi_target ? 100 : act.progress_percentage } 
        : act
    )
    saveActionPlans(updated)

    // Save mock evidence file record
    if (evidenceName) {
      const evidenceList = JSON.parse(localStorage.getItem(`sibimkon_evidence_${projectId}`) || '[]')
      evidenceList.push({
        id: 'ev-' + Math.random().toString(36).substr(2, 9),
        action_title: selectedAction.title,
        file_name: evidenceName,
        uploaded_at: new Date().toLocaleDateString('id-ID')
      })
      localStorage.setItem(`sibimkon_evidence_${projectId}`, JSON.stringify(evidenceList))
    }

    // Update project state if status completes
    const db = getMockDB()
    const allCompleted = updated.every(act => act.status === 'selesai')
    if (allCompleted && project?.status === 'improve') {
      const updatedProjects = db.projects.map((p: Project) =>
        p.id === projectId ? { ...p, status: 'control' } : p
      )
      updateMockDB('projects', updatedProjects)
      setProject({ ...project!, status: 'control' })
    }

    setSelectedAction(null)
    setEvidenceName('')
    alert('Bukti implementasi & KPI aktual berhasil diverifikasi!')
  }

  const handleDeleteAction = (actionId: string) => {
    const updated = actionPlans.filter(act => act.id !== actionId)
    saveActionPlans(updated)
  }

  const saveActionPlans = (updated: ActionPlan[]) => {
    setActionPlans(updated)
    const db = getMockDB()
    db.actionPlans[projectId] = updated
    updateMockDB('actionPlans', db.actionPlans)
  }

  if (!project) return null

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fase IMPROVE: Eksekusi Action Plan, Upload Bukti, dan Monitoring Progress</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-650 hover:bg-indigo-600 text-sm font-semibold rounded-xl text-white transition-colors cursor-pointer shadow-md"
        >
          <Plus className="h-4 w-4" />
          Tambah Action Plan
        </button>
      </div>

      {/* Action Plans list */}
      <div className="space-y-4">
        {actionPlans.length === 0 ? (
          <div className="p-12 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-3xl space-y-2">
            <h3 className="font-bold text-slate-350">Belum ada Rencana Perbaikan</h3>
            <p className="text-xs text-slate-500">Silakan tambahkan action plan baru atau gunakan rekomendasi AI Consultant di fase ANALYZE.</p>
          </div>
        ) : (
          actionPlans.map(act => {
            const statusInfo = ACTION_STATUS_LABELS[act.status] || { label: act.status, color: 'bg-slate-550' }
            return (
              <div key={act.id} className="glass-card rounded-2xl border border-slate-800 bg-slate-950/30 p-5 space-y-4 hover:border-slate-700 transition-all">
                {/* Top header row */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-850 pb-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-indigo-400">
                        {act.methodology}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-500">
                        {act.dimension}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-200">{act.title}</h3>
                  </div>

                  {/* Status pills selector */}
                  <div className="flex items-center gap-2">
                    <select
                      value={act.status}
                      onChange={(e) => handleUpdateStatus(act.id, e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="belum_mulai">Belum Mulai</option>
                      <option value="sedang_berjalan">Sedang Berjalan</option>
                      <option value="selesai">Selesai</option>
                      <option value="tertunda">Tertunda</option>
                    </select>

                    <button
                      onClick={() => handleDeleteAction(act.id)}
                      className="text-slate-600 hover:text-red-400 p-1 rounded hover:bg-slate-900 transition-colors cursor-pointer"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed">{act.description}</p>

                {/* Grid details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-850 text-xs">
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider text-[10px] block font-bold">PIC Pelaksana</span>
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5 mt-1">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      {act.pic_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider text-[10px] block font-bold">Timeline</span>
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5 mt-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      {act.start_date} s/d {act.end_date}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider text-[10px] block font-bold">Target KPI</span>
                    <span className="font-semibold text-slate-350 block mt-1">
                      {act.kpi_baseline} → <span className="text-indigo-400 font-bold">{act.kpi_target}</span> {act.kpi_unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider text-[10px] block font-bold">Aktual Saat Ini</span>
                    <span className="font-semibold text-slate-350 block mt-1">
                      {act.kpi_actual !== undefined ? (
                        <span className="text-emerald-400 font-bold">{act.kpi_actual} {act.kpi_unit}</span>
                      ) : (
                        <span className="text-slate-600 italic">Belum diinput</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Progress bar Slider */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Progress Implementasi:</span>
                    <span className="font-bold text-indigo-400">{act.progress_percentage}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={act.progress_percentage}
                      onChange={(e) => handleUpdateProgress(act.id, Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>

                {/* Evidence link buttons */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      setSelectedAction(act)
                      setKpiActualInput(act.kpi_actual || act.kpi_baseline)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold rounded-xl text-indigo-400 hover:text-white transition-all cursor-pointer"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Input Bukti & KPI Aktual
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal: Add Action Plan */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-200">Tambah Rencana Perbaikan</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300">✕</button>
            </div>
            
            <form onSubmit={handleCreateAction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Nama Program / Judul</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Penerapan standard maintenance mingguan"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Deskripsi Detail</label>
                <textarea
                  placeholder="Bagaimana perbaikan akan dijalankan?"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-250 focus:outline-none h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Metodologi</label>
                  <select
                    value={newMethodology}
                    onChange={(e) => setNewMethodology(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350"
                  >
                    <option value="Lean Manufacturing">Lean Manufacturing</option>
                    <option value="Kaizen">Kaizen</option>
                    <option value="TPM">TPM</option>
                    <option value="QCC">QCC / GKM</option>
                    <option value="Six Sigma">Six Sigma</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Dimensi PQCDSM</label>
                  <select
                    value={newDimension}
                    onChange={(e) => setNewDimension(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350"
                  >
                    <option value="productivity">Productivity</option>
                    <option value="quality">Quality</option>
                    <option value="cost">Cost</option>
                    <option value="delivery">Delivery</option>
                    <option value="safety">Safety</option>
                    <option value="morale">Morale</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nama KPI</label>
                  <input
                    type="text"
                    placeholder="Downtime"
                    value={newKpiName}
                    onChange={(e) => setNewKpiName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Baseline</label>
                  <input
                    type="number"
                    value={newKpiBaseline}
                    onChange={(e) => setNewKpiBaseline(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Target</label>
                  <input
                    type="number"
                    value={newKpiTarget}
                    onChange={(e) => setNewKpiTarget(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Satuan KPI</label>
                  <input
                    type="text"
                    placeholder="menit/hari, %, pcs"
                    value={newKpiUnit}
                    onChange={(e) => setNewKpiUnit(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">PIC Pelaksana</label>
                  <input
                    type="text"
                    placeholder="Nama Penanggung Jawab"
                    value={newPicName}
                    onChange={(e) => setNewPicName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2.5 text-xs text-slate-400">Batal</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 rounded-xl text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer shadow-md">Simpan Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Input Evidence & KPI Actual */}
      {selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">Verifikasi Implementasi</h3>
              <button onClick={() => setSelectedAction(null)} className="text-slate-500 hover:text-slate-300">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl">
                <h4 className="text-xs font-bold text-slate-300">{selectedAction.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1">Target KPI: {selectedAction.kpi_baseline} → {selectedAction.kpi_target} {selectedAction.kpi_unit}</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nilai Aktual Saat Ini ({selectedAction.kpi_unit})</label>
                <input
                  type="number"
                  value={kpiActualInput}
                  onChange={(e) => setKpiActualInput(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-250 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Upload Bukti File (Foto / Dokumen)</label>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Nama file bukti (misal: SOP_preventive_obras.pdf)"
                    value={evidenceName}
                    onChange={(e) => setEvidenceName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 focus:outline-none"
                  />
                  <div className="border border-dashed border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500 hover:bg-slate-900/40 transition-colors cursor-pointer">
                    Pilih file gambar/PDF (Maks 50MB)
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setSelectedAction(null)} className="px-4 py-2 text-xs text-slate-400">Batal</button>
                <button
                  type="button"
                  onClick={handleSaveEvidence}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer shadow-md"
                >
                  Kirim & Verifikasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
