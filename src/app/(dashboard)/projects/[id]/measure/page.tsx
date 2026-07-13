'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  getProjects, getProjectCharter, getCompanies,
  getMeasureDataRequirements, saveMeasureDataRequirements, updateProjectPhase, saveProjectCharter
} from '@/lib/db'
import { Project, ProjectCharter, MeasureDataRequirement } from '@/lib/mockData'
import {
  ArrowRight, Sparkles, AlertCircle, CheckCircle2,
  ChevronDown, ChevronUp, Plus, Trash2, RefreshCw, Loader2,
  UploadCloud, FileSpreadsheet, Check, Calculator, AlertTriangle,
  Gauge, BarChart3, TrendingDown
} from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import {
  matchMethodToWhitelist, SUPPORTED_METHODS, validateDataForMethod,
  extractNumericValues, extractCategoryValues,
  calcDefectCounting, calcCapability, calcControlChart, calcPareto, calcHistogram,
  calcAggregatedSigmaLevel, type AggregatedResult,
  getLevelBadge, type CalculationResult
} from '@/lib/measure-stats'

// ═══════════════════════════════════════════════════════════════════════════════
// BADGE COLOR MAP
// ═══════════════════════════════════════════════════════════════════════════════

const BADGE_COLORS: Record<string, string> = {
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  green: 'bg-green-500/20 text-green-400 border-green-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

const GROUP_BADGES: Record<string, { label: string; style: string }> = {
  primary_defect: { label: 'Data Utama - Defect', style: 'bg-red-500/10 text-red-400 border-red-500/20' },
  primary_volume: { label: 'Data Utama - Volume', style: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  primary_ctq: { label: 'Data Utama - CTQ', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  supporting: { label: 'Data Pendukung (KPI)', style: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  context: { label: 'Data Konteks', style: 'bg-slate-700/50 text-slate-300 border-slate-700' },
}

export default function MeasurePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const { userInfo } = useUserRole()
  const isKonsultan = (userInfo?.role ?? 'perusahaan').toLowerCase() !== 'perusahaan'

  const [project, setProject] = useState<Project | null>(null)
  const [charter, setCharter] = useState<ProjectCharter | null>(null)
  const [dataReqs, setDataReqs] = useState<MeasureDataRequirement[]>([])
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [calculatingId, setCalculatingId] = useState<string | null>(null)

  /* ── form tambah data manual ── */
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formReason, setFormReason] = useState('')
  const [formGroup, setFormGroup] = useState('')

  /* ── column mismatch dialog ── */
  const [colMismatch, setColMismatch] = useState<{ reqId: string; missing: string[]; extra: string[]; resolve: (ok: boolean) => void } | null>(null)

  const aiTriggered = useRef(false)

  /* ── calculation config dialog ── */
  /* ── calculation config dialog ── */
  // calcConfig dihapus karena sekarang digabung/agregasi

  // ─────────────────────────────────────────────────────────────────────────────
  // LOAD DATA
  // ─────────────────────────────────────────────────────────────────────────────

  const runAiDataNeedAnalysis = useCallback(async (
    ch: ProjectCharter,
    projectTitle: string,
    compName: string,
  ) => {
    setAnalyzing(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/measure-data-needed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_statement: ch.problem_statement,
          objectives: ch.objectives,
          productivity_target: ch.productivity_target,
          scope: ch.scope,
          company_name: compName || 'Perusahaan',
          project_title: projectTitle,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`)
      if (!data.data_needed || !Array.isArray(data.data_needed)) throw new Error('Format balasan AI tidak sesuai')

      const newReqs: MeasureDataRequirement[] = data.data_needed.map((d: any) => ({
        id: `data-${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
        name: d.name || 'Data yang dibutuhkan',
        description: d.description || '',
        reason: d.reason || '',
        expected_format: d.expected_format || 'csv/excel',
        example_columns: Array.isArray(d.example_columns) ? d.example_columns : [],
        group: d.group || 'context',
        role_note: d.role_note || '',
        status: 'Belum diupload' as const,
        source: 'ai' as const,
      }))

      const synced = await saveMeasureDataRequirements(projectId, newReqs)
      setDataReqs(synced)
      showToast('✅ Analisis kebutuhan data selesai!')
    } catch (err: any) {
      console.error('[measure-data-needed]', err)
      setSaveMsg(`Gagal: ${err.message}`)
    } finally {
      setAnalyzing(false)
    }
  }, [projectId])

  useEffect(() => {
    async function loadData() {
      const projects = await getProjects()
      const proj = projects.find((p: Project) => p.id === projectId)
      if (!proj) { router.push('/dashboard'); return }
      setProject(proj)

      let cName = ''
      if (proj.company_id) {
        const companies = await getCompanies()
        const comp = companies.find((c: any) => c.id === proj.company_id)
        cName = comp?.name ?? ''
        if (cName) setCompanyName(cName)
      }

      const [ch, saved] = await Promise.all([
        getProjectCharter(projectId),
        getMeasureDataRequirements(projectId),
      ])
      setCharter(ch)

      if (saved.length > 0) {
        setDataReqs(saved)
      } else if (ch?.problem_statement && !aiTriggered.current) {
        aiTriggered.current = true
        await runAiDataNeedAnalysis(ch, proj.title, cName)
      }
    }
    loadData()
  }, [projectId, router, runAiDataNeedAnalysis])

  const showToast = (msg: string) => { setSaveMsg(msg); setTimeout(() => setSaveMsg(null), 4000) }

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS: Reanalyze, Save, Advance, Manual Add, Delete
  // ─────────────────────────────────────────────────────────────────────────────

  const handleReanalyze = async () => {
    if (!charter || !project) return
    if (!window.confirm('Analisis ulang akan menghapus semua data saat ini. Lanjutkan?')) return
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      await sb.from('measure_data_requirements').delete().eq('project_id', projectId)
    } catch { /* ignore */ }
    setDataReqs([])
    await runAiDataNeedAnalysis(charter, project.title, companyName)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const synced = await saveMeasureDataRequirements(projectId, dataReqs)
      setDataReqs(synced)
      showToast('✅ Data berhasil disimpan!')
    } finally { setSaving(false) }
  }

  const handleAdvance = async () => {
    if (dataReqs.length === 0) { alert('Belum ada data yang dikumpulkan.'); return }
    const uploaded = dataReqs.filter(r => r.status !== 'Belum diupload').length
    if (uploaded === 0 && !window.confirm('Belum ada satupun file data yang diupload. Yakin?')) return
    setSaving(true)
    try {
      const synced = await saveMeasureDataRequirements(projectId, dataReqs)
      setDataReqs(synced)
      if (project?.status === 'measure' || project?.status === 'define') {
        await updateProjectPhase(projectId, 'analyze')
      }
      router.push(`/projects/${projectId}/analyze`)
    } finally { setSaving(false) }
  }

  const handleAddManual = async () => {
    if (!formName.trim()) return
    const newReq: MeasureDataRequirement = {
      id: `data-manual-${Math.random().toString(36).substr(2, 9)}`,
      project_id: projectId,
      name: formName.trim(),
      description: formDesc.trim(),
      reason: formReason.trim(),
      expected_format: 'csv/excel/manual',
      example_columns: [],
      status: 'Belum diupload',
      source: 'manual',
      group: formGroup || 'supporting', // default supporting
    }
    const updated = [...dataReqs, newReq]
    const synced = await saveMeasureDataRequirements(projectId, updated)
    setDataReqs(synced)
    setFormName(''); setFormDesc(''); setFormReason(''); setFormGroup(''); setShowForm(false)
    showToast('✅ Data tambahan berhasil ditambahkan!')
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('Hapus kebutuhan data ini?')) return
    const updated = dataReqs.filter(p => p.id !== id)
    setDataReqs(updated)
    saveMeasureDataRequirements(projectId, updated).then(synced => setDataReqs(synced)).catch(console.error)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FILE UPLOAD + PARSING + COLUMN VALIDATION (Section 3c)
  // ─────────────────────────────────────────────────────────────────────────────

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null)

  const handleUploadClick = (id: string) => {
    setActiveUploadId(id)
    if (fileInputRef.current) fileInputRef.current.click()
  }

  const processFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeUploadId) return
    e.target.value = ''

    setUploadingId(activeUploadId)
    const currentUploadId = activeUploadId

    try {
      let parsedData: any[] = []

      if (file.name.endsWith('.csv')) {
        parsedData = await new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (err: any) => reject(err),
          })
        })
      } else if (file.name.match(/\.xlsx?$/)) {
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const wsName = wb.SheetNames[0]
        parsedData = XLSX.utils.sheet_to_json(wb.Sheets[wsName])
      } else {
        throw new Error('Format file tidak didukung. Harap upload .csv, .xls, atau .xlsx')
      }

      if (parsedData.length === 0) throw new Error('File kosong atau gagal diparsing.')

      // ── Section 3c: Validasi kolom vs example_columns ──
      const targetReq = dataReqs.find(r => r.id === currentUploadId)
      const uploadedCols = Object.keys(parsedData[0])
      const expectedCols = targetReq?.example_columns || []

      if (expectedCols.length > 0) {
        const expectedLower = expectedCols.map(c => c.toLowerCase().trim())
        const uploadedLower = uploadedCols.map(c => c.toLowerCase().trim())
        const missing = expectedCols.filter((_, i) => !uploadedLower.includes(expectedLower[i]))
        const extra = uploadedCols.filter((_, i) => !expectedLower.includes(uploadedLower[i]))

        if (missing.length > 0) {
          const proceed = await new Promise<boolean>(resolve => {
            setColMismatch({ reqId: currentUploadId, missing, extra, resolve })
          })
          setColMismatch(null)
          if (!proceed) {
            setUploadingId(null)
            setActiveUploadId(null)
            return
          }
        }
      }
      // ── Upload to Supabase Storage ──
      let fileUrl = ''
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const path = `${projectId}/${currentUploadId}/${Date.now()}_${file.name}`
        const { data: up, error: upErr } = await sb.storage.from('measure_files').upload(path, file, { cacheControl:'3600', upsert:false })
        if (upErr) throw upErr
        const { data: urlData } = sb.storage.from('measure_files').getPublicUrl(up.path)
        fileUrl = urlData.publicUrl
      } catch (uploadErr) {
        console.warn('Failed to upload file to Supabase:', uploadErr)
        fileUrl = 'local://' + file.name
      }

      // ── Buat summary (ringkasan) ──
      const columns = Object.keys(parsedData[0])
      const total_rows = parsedData.length
      const sample = parsedData.slice(0, 5)

      const stats: any = {}
      columns.forEach(col => {
        let isNumeric = true
        let min = Infinity, max = -Infinity, sum = 0, count = 0, missing = 0
        parsedData.forEach(row => {
          const val = row[col]
          if (val === null || val === undefined || val === '') {
            missing++
          } else {
            const num = Number(val)
            if (isNaN(num)) isNumeric = false
            else { min = Math.min(min, num); max = Math.max(max, num); sum += num; count++ }
          }
        })
        if (isNumeric && count > 0) {
          stats[col] = { type: 'numeric', min, max, mean: Math.round((sum / count) * 1000) / 1000, missing }
        } else {
          stats[col] = { type: 'categorical/text', missing }
        }
      })

      const summary = { columns, total_rows, sample, stats }

      // ── Kirim ke AI untuk rekomendasi metode ──
      let recommended_methods = targetReq?.recommended_methods
      try {
        const res = await fetch('/api/measure-analyze-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problem_statement: charter?.problem_statement || '',
            data_name: targetReq?.name || file.name,
            parsed_summary: summary,
          }),
        })
        const data = await res.json()
        if (res.ok && data.recommended_methods) recommended_methods = data.recommended_methods
      } catch (aiErr) {
        console.warn('AI analysis failed for data upload:', aiErr)
      }

      const updated = dataReqs.map(r =>
        r.id === currentUploadId
          ? { ...r, status: 'Sudah diupload' as const, parsed_summary: summary, recommended_methods, raw_data: parsedData, file_url: fileUrl, file_name: file.name }
          : r
      )
      const synced = await saveMeasureDataRequirements(projectId, updated)
      setDataReqs(synced)
      showToast('✅ File berhasil diproses dan dianalisis AI!')
    } catch (err: any) {
      alert(`Gagal memproses file: ${err.message}`)
    } finally {
      setUploadingId(null)
      setActiveUploadId(null)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 6: PERHITUNGAN LEVEL MASALAH
  // ─────────────────────────────────────────────────────────────────────────────

  const handleCalculateOverall = async () => {
    if (dataReqs.length === 0 || !charter) return
    setCalculatingId('overall')
    
    try {
      // 1. Auto-generate targetCols by picking the most relevant numeric column for each raw_data
      const targetCols: Record<string, string> = {}
      dataReqs.forEach(req => {
        if (!req.raw_data || req.raw_data.length === 0) return
        const validation = validateDataForMethod(req.raw_data, 'defect_counting') // just to extract columns
        if (validation.numericColumns.length > 0) {
          let chosenCol = validation.numericColumns[0]
          if (validation.numericColumns.length > 1) {
            const skipWords = ['no', 'id', 'tanggal', 'bulan', 'tahun', 'date', 'time', 'waktu', 'hari']
            const validCols = validation.numericColumns.filter(c => !skipWords.some(w => c.toLowerCase().includes(w)))
            
            if (validCols.length > 0) {
               const preferWords = ['total', 'jumlah', 'biaya', 'qty', 'defect', 'cacat', 'volume', 'cost', 'nilai', 'harga', 'score', 'skor']
               const preferred = validCols.find(c => preferWords.some(w => c.toLowerCase().includes(w)))
               chosenCol = preferred || validCols[0]
            }
          }
          targetCols[req.id] = chosenCol
        }
      })

      // 2. Perform aggregation
      const result = calcAggregatedSigmaLevel(dataReqs, { targetCols })

      // 3. Call AI interpretation
      let aiInterpretation = null
      try {
        const res = await fetch('/api/measure-interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problem_statement: charter.problem_statement || '',
            method: 'Aggregated Sigma Level',
            calculation_results: result,
            data_name: 'Keseluruhan Data (Gabungan)',
          }),
        })
        const data = await res.json()
        if (data.interpretation) aiInterpretation = data.interpretation
      } catch (aiErr) {
        console.warn('AI interpretation failed:', aiErr)
      }

      // 4. Save to ProjectCharter
      const finalResult = { ...result, ai_interpretation: aiInterpretation }
      const newCharter = { ...charter, measure_summary: finalResult }
      setCharter(newCharter)
      await saveProjectCharter(newCharter)
      
      showToast('✅ Kalkulasi Keseluruhan Selesai!')
    } catch (err: any) {
      alert(`Gagal menghitung agregasi: ${err.message}`)
    } finally {
      setCalculatingId(null)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (!project) return null

  const uploadedCount = dataReqs.filter(r => r.status !== 'Belum diupload').length
  const calculatedCount = dataReqs.filter(r => r.calculation_results).length

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Fase MEASURE — Pengumpulan data, validasi, perhitungan level masalah & rekomendasi AI
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isKonsultan && (
            <button onClick={handleReanalyze} disabled={analyzing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded-xl text-slate-300 cursor-pointer disabled:opacity-50">
              {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Analisis Ulang
            </button>
          )}
          <span className="text-[10px] bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-400 font-mono">
            {uploadedCount}/{dataReqs.length} uploaded · {calculatedCount} dihitung
          </span>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xls,.xlsx" onChange={processFile} />

      {saveMsg && (
        <div className={`px-4 py-3 rounded-xl text-sm ${saveMsg.includes('Gagal') ? 'bg-red-500/15 border border-red-500/30 text-red-400' : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'}`}>
          {saveMsg}
        </div>
      )}

      {/* ── Column Mismatch Dialog ── */}
      {colMismatch && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-400">Kolom Tidak Sesuai</h3>
            </div>
            {colMismatch.missing.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Kolom yang diharapkan tapi tidak ditemukan:</p>
                <div className="flex flex-wrap gap-1">
                  {colMismatch.missing.map(c => (
                    <span key={c} className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {colMismatch.extra.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Kolom tambahan di file:</p>
                <div className="flex flex-wrap gap-1">
                  {colMismatch.extra.map(c => (
                    <span key={c} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500">Anda tetap bisa melanjutkan, tapi hasil analisis mungkin kurang optimal.</p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => colMismatch.resolve(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">Batal Upload</button>
              <button onClick={() => colMismatch.resolve(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-xs font-bold rounded-xl text-white cursor-pointer">
                Tetap Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase banner ── */}
      <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/15">
        <div>
          <p className="text-xs font-semibold text-indigo-300">Fase Saat Ini: <span className="uppercase font-black">MEASURE</span></p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Upload data → AI analisis → Hitung level masalah → Lanjut ke ANALYZE
          </p>
        </div>
        <button onClick={handleAdvance} disabled={saving || analyzing}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white cursor-pointer disabled:opacity-50">
          Lanjut ke ANALYZE <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Problem Statement ── */}
      {charter?.problem_statement && (
        <div className="p-5 rounded-2xl bg-amber-950/15 border border-amber-800/30 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Problem Statement</p>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{charter.problem_statement}</p>
        </div>
      )}

      {/* ── Loading ── */}
      {analyzing && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-indigo-500/30 rounded-3xl bg-indigo-500/5">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <p className="text-sm font-semibold text-indigo-300">Groq AI sedang merekomendasikan data yang perlu dikumpulkan...</p>
        </div>
      )}

      {/* ── No charter ── */}
      {!analyzing && !charter?.problem_statement && dataReqs.length === 0 && (
        <div className="py-12 text-center border border-dashed border-amber-800/30 rounded-2xl bg-amber-950/5 space-y-2">
          <AlertCircle className="h-8 w-8 mx-auto text-amber-600" />
          <p className="text-sm font-semibold text-amber-400">Project Charter belum diisi</p>
          <p className="text-xs text-slate-500">Analisis AI membutuhkan Problem Statement dari Project Charter.</p>
          <button onClick={() => router.push(`/projects/${projectId}/define`)}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-xs font-bold rounded-xl text-white cursor-pointer">
            Ke Halaman DEFINE
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* DAFTAR DATA NEEDS                                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {!analyzing && dataReqs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Kebutuhan Data (Data Collection Plan)</span>
          </div>

          {dataReqs.map((req, idx) => {
            const isExpanded = expandedId === req.id
            const isUploaded = req.status === 'Sudah diupload' || req.status === 'Tervalidasi'
            const hasCalc = !!req.calculation_results
            const badge = hasCalc ? getLevelBadge(req.calculation_results!.metrics as CalculationResult) : null

            return (
              <div key={req.id} className={`rounded-2xl border ${hasCalc ? 'border-indigo-500/30 bg-indigo-500/5' : isUploaded ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-950/30'} overflow-hidden transition-all`}>

                {/* ── Card Header ── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-200">{idx + 1}. {req.name}</span>
                      {req.source === 'ai' && <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">AI</span>}
                      {req.group && GROUP_BADGES[req.group] && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${GROUP_BADGES[req.group].style}`}>
                          {GROUP_BADGES[req.group].label}
                        </span>
                      )}
                      {badge && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${BADGE_COLORS[badge.color]}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{req.description}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-900/50 p-2 rounded-lg border border-slate-800 inline-flex">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span><strong>Alasan:</strong> {req.reason}</span>
                    </div>
                    {req.example_columns?.length > 0 && (
                      <p className="text-[10px] text-slate-500 mt-1">Kolom disarankan: {req.example_columns.join(', ')}</p>
                    )}
                  </div>

                  {/* ── Actions ── */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${isUploaded ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      {req.status}
                    </span>

                    <button onClick={() => handleUploadClick(req.id)} disabled={uploadingId === req.id}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isUploaded ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                      {uploadingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (isUploaded ? <RefreshCw className="w-4 h-4" /> : <UploadCloud className="w-4 h-4" />)}
                      {isUploaded ? 'Upload Ulang' : 'Upload (.csv/.xlsx)'}
                    </button>

                    {/* Tombol dihapus sesuai desain agregasi */}

                    {(isUploaded || hasCalc) && (
                      <button onClick={() => setExpandedId(isExpanded ? null : req.id)} className="text-[10px] text-indigo-400 hover:text-indigo-300 mt-1 flex items-center gap-1">
                        Detail {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  {isKonsultan && (
                    <button onClick={() => handleDelete(req.id)} className="p-2 text-slate-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0 mt-auto sm:mt-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* ══════════════════════════════════════════════════════════════ */}
                {/* EXPANDED PANEL                                                */}
                {/* ══════════════════════════════════════════════════════════════ */}
                {isExpanded && (
                  <div className="border-t border-slate-800/50 p-5 bg-slate-900/30 space-y-5">

                    {/* ── Parsed Summary ── */}
                    {req.parsed_summary && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5"><FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Ringkasan Data</h4>
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400 font-mono space-y-1">
                            <p>Total Baris: <span className="text-emerald-400 font-bold">{req.parsed_summary.total_rows}</span></p>
                            <p>Total Kolom: <span className="text-indigo-400 font-bold">{req.parsed_summary.columns?.length}</span></p>
                            <div className="pt-2 mt-2 border-t border-slate-800/50 max-h-32 overflow-y-auto">
                              {req.parsed_summary.columns?.map((c: string) => (
                                <div key={c} className="flex justify-between items-center py-0.5">
                                  <span>{c}</span>
                                  <span className="text-[9px] text-slate-500 bg-slate-900 px-1 rounded">{req.parsed_summary.stats?.[c]?.type || 'unknown'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Rekomendasi Metode AI</h4>
                          {req.recommended_methods?.length ? (
                            <div className="space-y-2">
                              {req.recommended_methods.map((m: any, i: number) => (
                                <div key={i} className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="text-xs font-bold text-amber-400">{m.method}</span>
                                    {matchMethodToWhitelist(m.method) && (
                                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">✓ Didukung</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 ml-5 leading-relaxed">{m.reason}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-500 italic">Belum ada rekomendasi.</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Calculation Results (Section 6d) ── */}
                    {hasCalc && req.calculation_results && (
                      <div className="space-y-4 pt-4 border-t border-slate-800/50">
                        <h4 className="text-xs font-bold text-indigo-300 uppercase flex items-center gap-1.5">
                          <Gauge className="w-4 h-4" /> Hasil Perhitungan Level Masalah
                        </h4>

                        {/* Badge Level */}
                        {badge && (
                          <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm ${BADGE_COLORS[badge.color]}`}>
                            {badge.color === 'red' || badge.color === 'orange' ? <TrendingDown className="w-5 h-5" /> : <Gauge className="w-5 h-5" />}
                            {badge.label}
                          </div>
                        )}

                        {/* Metrics Table */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                            {Object.entries(req.calculation_results.metrics)
                              .filter(([k]) => !['method', 'warnings', 'out_of_control_indices', 'categories', 'bins', 'sample'].includes(k))
                              .map(([key, val]) => (
                                <div key={key} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/50">
                                  <p className="text-slate-500 font-mono text-[9px] uppercase">{key.replace(/_/g, ' ')}</p>
                                  <p className="text-slate-200 font-bold mt-0.5">
                                    {typeof val === 'number' ? val.toLocaleString('id-ID', { maximumFractionDigits: 4 }) : String(val)}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Warnings */}
                        {req.calculation_results.warnings.length > 0 && (
                          <div className="space-y-1">
                            {req.calculation_results.warnings.map((w: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{w}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Pareto Categories */}
                        {req.calculation_results.metrics.method === 'pareto_analysis' && req.calculation_results.metrics.categories && (
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-48 overflow-y-auto">
                            <table className="w-full text-[10px]">
                              <thead>
                                <tr className="text-slate-500 border-b border-slate-800">
                                  <th className="text-left py-1 px-2">Kategori</th>
                                  <th className="text-right py-1 px-2">Jumlah</th>
                                  <th className="text-right py-1 px-2">%</th>
                                  <th className="text-right py-1 px-2">Kumulatif %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(req.calculation_results.metrics.categories as any[]).map((cat: any, i: number) => (
                                  <tr key={i} className={`border-b border-slate-800/30 ${cat.cumulative_percentage <= 80 ? 'text-amber-400' : 'text-slate-500'}`}>
                                    <td className="py-1 px-2 font-medium">{cat.category}</td>
                                    <td className="text-right py-1 px-2">{cat.count}</td>
                                    <td className="text-right py-1 px-2">{cat.percentage}%</td>
                                    <td className="text-right py-1 px-2">{cat.cumulative_percentage}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* AI Interpretation */}
                        {req.calculation_results.ai_interpretation && (
                          <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-xl space-y-3">
                            <h5 className="text-xs font-bold text-indigo-300 uppercase flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4" /> Interpretasi AI
                            </h5>
                            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Level:</span>
                                <p className="mt-0.5">{req.calculation_results.ai_interpretation.level_assessment}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Standar:</span>
                                <p className="mt-0.5">{req.calculation_results.ai_interpretation.standard_used}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Interpretasi:</span>
                                <p className="mt-0.5">{req.calculation_results.ai_interpretation.interpretation}</p>
                              </div>
                              <div className="pt-2 border-t border-indigo-500/10">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase">→ Rekomendasi untuk Analyze:</span>
                                <p className="mt-0.5 text-indigo-300">{req.calculation_results.ai_interpretation.analyze_recommendation}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Tambah Data Manual ── */}
      {!analyzing && (
        <div className="space-y-3">
          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-bold bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-2 rounded-xl transition-all w-fit">
              <Plus className="w-4 h-4" /> Tambah Data Manual
            </button>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 max-w-2xl">
              <h4 className="text-sm font-bold text-slate-200">Tambah Data Baru</h4>
              <div className="space-y-3">
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nama Data..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
                <textarea placeholder="Deskripsi Singkat" value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none" />
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Alasan Kebutuhan</label>
                  <input type="text" value={formReason} onChange={e => setFormReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Grup Klasifikasi</label>
                  <select value={formGroup} onChange={e => setFormGroup(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                    <option value="">Pilih Grup Klasifikasi...</option>
                    <option value="primary_defect">Data Utama - Defect</option>
                    <option value="primary_volume">Data Utama - Volume</option>
                    <option value="primary_ctq">Data Utama - CTQ</option>
                    <option value="supporting">Data Pendukung (KPI)</option>
                    <option value="context">Data Konteks</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-3">
                <button onClick={() => { setShowForm(false); setFormName(''); setFormDesc(''); setFormReason(''); setFormGroup('') }}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">Batal</button>
                <button onClick={handleAddManual} disabled={!formName.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white cursor-pointer disabled:opacity-40">
                  <Check className="h-3.5 w-3.5" /> Tambahkan
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Kalkulasi Keseluruhan (Agregasi) ── */}
      {dataReqs.filter(r => r.status === 'Sudah diupload' || r.status === 'Tervalidasi').length > 0 && (
        <div className="mt-8 pt-8 border-t border-slate-800/50">
          <div className="flex flex-col items-center justify-center p-8 bg-slate-900/50 border border-indigo-500/20 rounded-2xl text-center space-y-4">
            <Calculator className="w-12 h-12 text-indigo-400 opacity-50" />
            <h3 className="text-lg font-bold text-slate-200">Hitung Level Keseluruhan</h3>
            <p className="text-sm text-slate-400 max-w-xl">
              Sistem akan menjumlahkan seluruh baris data dari file-file di atas berdasarkan grupnya (Total Defect, Total Volume, CTQ). Pastikan satuan data konsisten sebelum menghitung.
            </p>
            <button
              onClick={handleCalculateOverall}
              disabled={calculatingId === 'overall'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all mt-2 disabled:opacity-50"
            >
              {calculatingId === 'overall' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
              Hitung Sigma Level Gabungan
            </button>
          </div>

          {/* ── Dashboard Hasil Agregasi ── */}
          {charter?.measure_summary && (
            <div className="mt-8 p-6 bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-indigo-400" />
                <h4 className="text-lg font-bold text-slate-200">Hasil Analisis Level Masalah</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visual Sigma Level */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="text-4xl font-black text-indigo-400">{charter.measure_summary.overall_sigma_level}σ</div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sigma Level Gabungan</p>
                  <div className="mt-4 text-[10px] text-slate-500 space-y-1">
                    <p>Total Defect: <span className="font-bold text-slate-300">{charter.measure_summary.total_defects}</span></p>
                    <p>Total Volume: <span className="font-bold text-slate-300">{charter.measure_summary.total_volume}</span></p>
                    <p>DPMO: <span className="font-bold text-slate-300">{charter.measure_summary.overall_dpmo}</span></p>
                  </div>
                </div>

                {/* AI Interpretation */}
                {charter.measure_summary.ai_interpretation && (
                  <div className="bg-indigo-500/5 p-5 rounded-xl border border-indigo-500/20 space-y-3">
                    <h5 className="text-xs font-bold text-indigo-300 uppercase flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Interpretasi AI
                    </h5>
                    <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
                      <div>
                        <span className="font-bold text-slate-500 uppercase">Level:</span>
                        <p className="mt-0.5">{charter.measure_summary.ai_interpretation.level_assessment}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 uppercase">Interpretasi:</span>
                        <p className="mt-0.5">{charter.measure_summary.ai_interpretation.interpretation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Supporting KPIs */}
              {charter.measure_summary.supporting_kpis && charter.measure_summary.supporting_kpis.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h5 className="text-xs font-bold text-slate-400 uppercase">KPI Pendukung</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {charter.measure_summary.supporting_kpis.map((kpi: any, idx: number) => (
                      <div key={idx} className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-center">
                        <div className="text-lg font-bold text-amber-400">{kpi.value}</div>
                        <div className="text-[10px] text-slate-500 truncate">{kpi.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Footer Actions ── */}
      <div className="flex justify-between items-center pt-8 border-t border-slate-800 mt-8">
        {dataReqs.length > 0 && !analyzing && (
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-sm font-semibold rounded-xl text-slate-200 cursor-pointer disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Simpan Progress'}
          </button>
        )}
        
        {charter?.measure_summary && (
          <button onClick={handleAdvance} disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 ml-auto">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lanjut ke Analyze Phase'}
            {!saving && <ArrowRight className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  )
}
