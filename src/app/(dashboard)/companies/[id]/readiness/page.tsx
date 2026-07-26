'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ChevronRight, ChevronLeft, CheckCircle2, Clock, AlertCircle,
  Plus, Trash2, MapPin, Zap, Send, Loader2
} from 'lucide-react'
import {
  getWizardProgress, saveWizardProgress,
  getBusinessProcesses, saveBusinessProcess, deleteBusinessProcess, submitBusinessProcessModule,
  getWasteItems, saveWasteItem, deleteWasteItem, submitWasteModule,
  getReadinessGateStatus,
  type BusinessProcess, type WasteItem, type ReadinessGateStatus
} from '@/app/actions/readiness'
import { getCompanies } from '@/lib/db'
import { type Company } from '@/lib/mockData'
import { useDialog } from '@/hooks/useDialog'

const PQCDSM_DIMS = [
  { key: 'productivity', label: 'Production', required: false, color: 'indigo' },
  { key: 'quality', label: 'Quality', required: true, color: 'purple' },
  { key: 'cost', label: 'Cost', required: true, color: 'pink' },
  { key: 'delivery', label: 'Delivery', required: false, color: 'amber' },
  { key: 'safety', label: 'Safety', required: false, color: 'emerald' },
  { key: 'morale', label: 'Morale', required: false, color: 'cyan' },
] as const

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  not_started: { label: 'Belum Dimulai', color: 'text-slate-400 bg-slate-900/50 border-slate-700', icon: Clock },
  in_progress: { label: 'Sedang Diisi', color: 'text-blue-400 bg-blue-900/20 border-blue-700/50', icon: Loader2 },
  submitted: { label: 'Menunggu Review Konsultan', color: 'text-amber-400 bg-amber-900/20 border-amber-700/50', icon: Clock },
  approved: { label: 'Disetujui', color: 'text-emerald-400 bg-emerald-900/20 border-emerald-700/50', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'text-red-400 bg-red-900/20 border-red-700/50', icon: AlertCircle },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['not_started']
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-semibold ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i + 1 <= current ? 'bg-indigo-500 w-8' : 'bg-slate-700 w-4'}`} />
      ))}
      <span className="text-xs text-slate-500 ml-2">Langkah {current} dari {total}</span>
    </div>
  )
}

export default function ReadinessPage() {
  const params = useParams()
  const companyId = params.id as string
  const { showAlert, showConfirm } = useDialog()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [step, setStep] = useState(1)
  const [gate, setGate] = useState<ReadinessGateStatus | null>(null)

  // Modul 1
  const [processes, setProcesses] = useState<BusinessProcess[]>([])
  const [processForm, setProcessForm] = useState<Partial<BusinessProcess>>({
    process_name: '', input_text: '', process_text: '', output_text: '', customer_text: '', cycle_time_estimate: ''
  })
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null)
  const [showProcessForm, setShowProcessForm] = useState(false)

  // Modul 2
  const [wasteItems, setWasteItems] = useState<WasteItem[]>([])
  const [wasteForm, setWasteForm] = useState<Partial<WasteItem>>({
    pqcdsm_dimension: 'quality', waste_description: '', estimated_impact: '', is_quick_win: false
  })
  const [showWasteForm, setShowWasteForm] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [companies, progress, procs, wastes, gateStatus] = await Promise.all([
        getCompanies(),
        getWizardProgress(companyId),
        getBusinessProcesses(companyId),
        getWasteItems(companyId),
        getReadinessGateStatus(companyId),
      ])
      const comp = companies.find((c: Company) => c.id === companyId) || null
      setCompany(comp)
      setStep(progress?.current_step || 1)
      setProcesses(procs)
      setWasteItems(wastes)
      setGate(gateStatus)
    } catch (e) {
      console.error('ReadinessPage loadData error:', e)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { loadData() }, [loadData])

  const goToStep = async (n: number) => {
    await saveWizardProgress(companyId, n)
    setStep(n)
  }

  // Proses handler
  const handleSaveProcess = async () => {
    if (!processForm.process_name || !processForm.input_text || !processForm.process_text || !processForm.output_text || !processForm.customer_text) {
      await showAlert('Isi semua field wajib (Nama Proses, Input, Proses, Output, Pelanggan).')
      return
    }
    setSaving(true)
    try {
      const saved = await saveBusinessProcess({ ...processForm, company_id: companyId, id: editingProcessId || undefined } as BusinessProcess)
      setProcesses(prev => editingProcessId ? prev.map(p => p.id === saved.id ? saved : p) : [...prev, saved])
      setProcessForm({ process_name: '', input_text: '', process_text: '', output_text: '', customer_text: '', cycle_time_estimate: '' })
      setEditingProcessId(null)
      setShowProcessForm(false)
    } catch (e: any) { await showAlert('Gagal menyimpan: ' + e.message) }
    setSaving(false)
  }

  const handleDeleteProcess = async (id: string) => {
    const ok = await showConfirm('Hapus proses ini?')
    if (!ok) return
    await deleteBusinessProcess(id)
    setProcesses(prev => prev.filter(p => p.id !== id))
  }

  // Waste handler
  const handleSaveWaste = async () => {
    if (!wasteForm.waste_description) {
      await showAlert('Deskripsi pemborosan wajib diisi.')
      return
    }
    setSaving(true)
    try {
      const saved = await saveWasteItem({ ...wasteForm, company_id: companyId } as WasteItem)
      setWasteItems(prev => [...prev.filter(w => w.id !== saved.id), saved])
      setWasteForm({ pqcdsm_dimension: 'quality', waste_description: '', estimated_impact: '', is_quick_win: false })
      setShowWasteForm(false)
    } catch (e: any) { await showAlert('Gagal menyimpan: ' + e.message) }
    setSaving(false)
  }

  const handleDeleteWaste = async (id: string) => {
    const ok = await showConfirm('Hapus item ini?')
    if (!ok) return
    await deleteWasteItem(id)
    setWasteItems(prev => prev.filter(w => w.id !== id))
  }

  const handleSubmitAll = async () => {
    const hasRequiredWaste = wasteItems.some(w => w.pqcdsm_dimension === 'cost' || w.pqcdsm_dimension === 'quality')
    if (processes.length === 0) { setSubmitError('Minimal 1 proses bisnis harus diisi.'); return }
    if (!hasRequiredWaste) { setSubmitError('Minimal 1 temuan waste harus ada di dimensi Cost atau Quality.'); return }
    setSubmitting(true)
    setSubmitError('')
    try {
      await Promise.all([submitBusinessProcessModule(companyId), submitWasteModule(companyId)])
      await saveWizardProgress(companyId, 5)
      await loadData()
      setStep(5)
    } catch (e: any) { setSubmitError(e.message) }
    setSubmitting(false)
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px] text-slate-400">Memuat Fase Kesiapan...</div>

  const isSubmitted = gate?.processModule === 'submitted' || gate?.processModule === 'approved'

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/companies/${companyId}`} className="p-2 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-amber-400" />
            Fase Kesiapan (Readiness Phase)
          </h1>
          <p className="text-xs text-slate-500 mt-1">{company?.name} — Tier Simple</p>
        </div>
      </div>

      {/* Gate Status Banner */}
      {gate && (
        <div className={`rounded-2xl border p-5 ${gate.gateOpen ? 'bg-emerald-900/10 border-emerald-700/50' : 'bg-amber-900/10 border-amber-700/40'}`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className={`font-bold text-sm ${gate.gateOpen ? 'text-emerald-400' : 'text-amber-400'}`}>
                {gate.gateOpen ? '🎉 Readiness Gate Terbuka' : '🔒 Readiness Gate Belum Terbuka'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {gate.gateOpen
                  ? 'Anda sudah bisa memulai proyek baru dan fase Define.'
                  : 'Lengkapi dan dapatkan persetujuan Konsultan untuk kedua modul di bawah.'}
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Pemetaan Proses</p>
                <StatusBadge status={gate.processModule} />
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Identifikasi Waste</p>
                <StatusBadge status={gate.wasteModule} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <StepIndicator current={step} total={5} />

      {/* STEP 1: Intro */}
      {step === 1 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 space-y-6 animate-fade-in">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-100">Selamat Datang di Fase Kesiapan</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Sebelum memulai proyek peningkatan produktivitas secara formal, perusahaan Anda perlu menyelesaikan dua modul ini. Tujuannya adalah memperkuat fondasi data dan pemahaman proses bisnis Anda.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-indigo-900/20 border border-indigo-700/40 rounded-xl p-4">
              <p className="text-indigo-400 font-bold text-sm mb-1">📋 Modul 1: Pemetaan Proses Bisnis</p>
              <p className="text-xs text-slate-400">Dokumentasikan alur kerja utama perusahaan Anda (SIPOC sederhana): siapa pemasok, apa prosesnya, apa hasilnya, dan siapa penerimanya.</p>
            </div>
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4">
              <p className="text-amber-400 font-bold text-sm mb-1">⚡ Modul 2: Identifikasi Waste Cepat</p>
              <p className="text-xs text-slate-400">Tandai pemborosan atau inefisiensi yang Anda sadari sehari-hari per dimensi PQCDSM. Wajib isi minimal 1 di Cost atau Quality.</p>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 text-xs text-slate-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>Kedua modul harus disetujui Konsultan sebelum Anda bisa memulai proyek formal DMAIC.</span>
          </div>
          <div className="flex justify-end">
            <button onClick={() => goToStep(2)} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-colors">
              Mulai Modul 1 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Pemetaan Proses Bisnis */}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-100 mb-1">Modul 1: Pemetaan Proses Bisnis</h2>
            <p className="text-xs text-slate-500 mb-4">Daftarkan minimal 1 proses bisnis utama perusahaan Anda.</p>

            {/* Daftar Proses */}
            {processes.length > 0 && (
              <div className="space-y-3 mb-4">
                {processes.map(proc => (
                  <div key={proc.id} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-200 text-sm">{proc.process_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Input: {proc.input_text} → Output: {proc.output_text} → {proc.customer_text}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={proc.status || 'draft'} />
                        {!isSubmitted && (
                          <button onClick={() => handleDeleteProcess(proc.id!)} className="text-red-400 hover:text-red-300 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Form Tambah Proses */}
            {!isSubmitted && (
              <>
                {!showProcessForm ? (
                  <button onClick={() => setShowProcessForm(true)} className="w-full border border-dashed border-slate-700 rounded-xl p-4 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors text-sm flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Tambah Proses Bisnis
                  </button>
                ) : (
                  <div className="border border-indigo-700/40 rounded-xl p-5 space-y-3 bg-indigo-900/10">
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Tambah Proses Baru</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Nama Proses *</label>
                        <input value={processForm.process_name} onChange={e => setProcessForm(p => ({...p, process_name: e.target.value}))} className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2 text-sm text-slate-200" placeholder="Contoh: Proses Produksi Utama" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Supplier/Input *</label>
                        <input value={processForm.input_text} onChange={e => setProcessForm(p => ({...p, input_text: e.target.value}))} className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2 text-sm text-slate-200" placeholder="Contoh: Bahan baku dari PT Suplai" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Langkah-langkah Proses (min. 2 langkah) *</label>
                      <textarea value={processForm.process_text} onChange={e => setProcessForm(p => ({...p, process_text: e.target.value}))} className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 h-20" placeholder="1. Penerimaan bahan baku&#10;2. Inspeksi kualitas&#10;3. Proses produksi" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Output *</label>
                        <input value={processForm.output_text} onChange={e => setProcessForm(p => ({...p, output_text: e.target.value}))} className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2 text-sm text-slate-200" placeholder="Contoh: Produk jadi siap kirim" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Pelanggan/Penerima *</label>
                        <input value={processForm.customer_text} onChange={e => setProcessForm(p => ({...p, customer_text: e.target.value}))} className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2 text-sm text-slate-200" placeholder="Contoh: Tim pengiriman / pelanggan" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Estimasi Waktu Siklus (opsional)</label>
                      <input value={processForm.cycle_time_estimate} onChange={e => setProcessForm(p => ({...p, cycle_time_estimate: e.target.value}))} className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2 text-sm text-slate-200" placeholder="Contoh: 4 jam" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleSaveProcess} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Simpan
                      </button>
                      <button onClick={() => { setShowProcessForm(false); setProcessForm({ process_name: '', input_text: '', process_text: '', output_text: '', customer_text: '', cycle_time_estimate: '' }) }} className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm">Batal</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => goToStep(1)} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm">
              <ChevronLeft className="w-4 h-4" /> Kembali
            </button>
            <button onClick={() => goToStep(3)} disabled={processes.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm disabled:opacity-40 transition-colors">
              Lanjut ke Modul 2 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Identifikasi Waste */}
      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-100 mb-1">Modul 2: Identifikasi Waste Cepat</h2>
            <p className="text-xs text-slate-500 mb-1">Tandai pemborosan yang Anda sadari per dimensi PQCDSM.</p>
            <p className="text-xs text-amber-400 mb-4">⚠️ Wajib: Minimal 1 temuan di dimensi <strong>Quality</strong> atau <strong>Cost</strong>.</p>

            {/* Ringkasan per dimensi */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
              {PQCDSM_DIMS.map(dim => {
                const count = wasteItems.filter(w => w.pqcdsm_dimension === dim.key).length
                return (
                  <div key={dim.key} className={`rounded-xl p-2 text-center border ${count > 0 ? 'border-indigo-600/50 bg-indigo-900/20' : 'border-slate-800 bg-slate-900/30'}`}>
                    <p className="text-xs text-slate-400">{dim.label}</p>
                    <p className={`text-lg font-bold ${count > 0 ? 'text-indigo-400' : 'text-slate-600'}`}>{count}</p>
                    {dim.required && <p className="text-[10px] text-amber-400">wajib</p>}
                  </div>
                )
              })}
            </div>

            {/* Daftar Waste */}
            {wasteItems.length > 0 && (
              <div className="space-y-2 mb-4">
                {wasteItems.map(item => (
                  <div key={item.id} className="flex items-start gap-3 bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded">
                          {PQCDSM_DIMS.find(d => d.key === item.pqcdsm_dimension)?.label}
                        </span>
                        {item.is_quick_win && <span className="text-[10px] font-bold text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded flex items-center gap-1"><Zap className="w-2.5 h-2.5" />Quick Win</span>}
                      </div>
                      <p className="text-sm text-slate-300 mt-1">{item.waste_description}</p>
                      {item.estimated_impact && <p className="text-xs text-slate-500 mt-0.5">Dampak: {item.estimated_impact}</p>}
                    </div>
                    {!isSubmitted && (
                      <button onClick={() => handleDeleteWaste(item.id!)} className="text-red-400 hover:text-red-300 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Form Tambah Waste */}
            {!isSubmitted && (
              <>
                {!showWasteForm ? (
                  <button onClick={() => setShowWasteForm(true)} className="w-full border border-dashed border-slate-700 rounded-xl p-4 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors text-sm flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Tambah Temuan Waste
                  </button>
                ) : (
                  <div className="border border-amber-700/40 rounded-xl p-5 space-y-3 bg-amber-900/10">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Tambah Temuan Baru</p>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Dimensi PQCDSM *</label>
                      <select value={wasteForm.pqcdsm_dimension} onChange={e => setWasteForm(p => ({...p, pqcdsm_dimension: e.target.value as any}))} className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2 text-sm text-slate-200">
                        {PQCDSM_DIMS.map(d => <option key={d.key} value={d.key}>{d.label}{d.required ? ' (Wajib)' : ''}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Deskripsi Pemborosan *</label>
                      <textarea value={wasteForm.waste_description} onChange={e => setWasteForm(p => ({...p, waste_description: e.target.value}))} className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 h-16" placeholder="Contoh: Bahan baku menumpuk di gudang lebih dari seminggu tanpa diproses" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Estimasi Dampak (opsional)</label>
                      <input value={wasteForm.estimated_impact} onChange={e => setWasteForm(p => ({...p, estimated_impact: e.target.value}))} className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2 text-sm text-slate-200" placeholder="Contoh: ~Rp2 juta/bulan terbuang" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                      <input type="checkbox" checked={!!wasteForm.is_quick_win} onChange={e => setWasteForm(p => ({...p, is_quick_win: e.target.checked}))} className="rounded" />
                      <Zap className="w-4 h-4 text-amber-400" />
                      Tandai sebagai <strong>Quick Win</strong> (bisa diperbaiki cepat tanpa investasi besar)
                    </label>
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleSaveWaste} disabled={saving} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                        Simpan
                      </button>
                      <button onClick={() => { setShowWasteForm(false); setWasteForm({ pqcdsm_dimension: 'quality', waste_description: '', estimated_impact: '', is_quick_win: false }) }} className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm">Batal</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => goToStep(2)} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm">
              <ChevronLeft className="w-4 h-4" /> Kembali
            </button>
            <button onClick={() => goToStep(4)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-colors">
              Review &amp; Submit <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Submit */}
      {step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-100">Ringkasan &amp; Submit</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                <p className="text-sm font-bold text-indigo-400 mb-2">📋 Pemetaan Proses Bisnis</p>
                <p className="text-2xl font-bold text-slate-100">{processes.length}</p>
                <p className="text-xs text-slate-500">proses didaftarkan</p>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                <p className="text-sm font-bold text-amber-400 mb-2">⚡ Identifikasi Waste</p>
                <p className="text-2xl font-bold text-slate-100">{wasteItems.length}</p>
                <p className="text-xs text-slate-500">temuan dicatat ({wasteItems.filter(w => w.is_quick_win).length} Quick Win)</p>
              </div>
            </div>

            {/* Validasi */}
            <div className="space-y-2">
              <div className={`flex items-center gap-2 text-sm ${processes.length > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {processes.length > 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                Minimal 1 proses bisnis: {processes.length > 0 ? 'Terpenuhi' : 'Belum terpenuhi'}
              </div>
              <div className={`flex items-center gap-2 text-sm ${wasteItems.some(w => w.pqcdsm_dimension === 'cost' || w.pqcdsm_dimension === 'quality') ? 'text-emerald-400' : 'text-red-400'}`}>
                {wasteItems.some(w => w.pqcdsm_dimension === 'cost' || w.pqcdsm_dimension === 'quality') ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                Minimal 1 waste di Cost/Quality: {wasteItems.some(w => w.pqcdsm_dimension === 'cost' || w.pqcdsm_dimension === 'quality') ? 'Terpenuhi' : 'Belum terpenuhi'}
              </div>
            </div>

            {submitError && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-3 text-red-400 text-sm">
                {submitError}
              </div>
            )}

            {isSubmitted ? (
              <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-4 text-emerald-400 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                Data sudah dikirimkan. Menunggu review dan persetujuan Konsultan.
              </div>
            ) : (
              <button onClick={handleSubmitAll} disabled={submitting} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Kirim ke Konsultan untuk Review
              </button>
            )}
          </div>

          <div className="flex justify-start">
            <button onClick={() => goToStep(3)} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm">
              <ChevronLeft className="w-4 h-4" /> Kembali
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Selesai/Status */}
      {step === 5 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center space-y-4 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-indigo-900/30 border border-indigo-600/50 flex items-center justify-center mx-auto">
            <Send className="w-7 h-7 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Berhasil Dikirimkan!</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Data Fase Kesiapan Anda sudah dikirimkan ke Konsultan. Setelah disetujui, Anda bisa memulai proyek formal DMAIC.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <Link href={`/companies/${companyId}`} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-semibold transition-colors">
              Kembali ke Profil Perusahaan
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
