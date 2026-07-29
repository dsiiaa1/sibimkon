'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  getProjects, getProjectCharter, getCompanies,
  getMeasureDataRequirements, saveMeasureDataRequirements, updateProjectPhase, saveProjectCharter,
  setProjectPhaseLock, submitApprovalRequest, cancelApprovalRequest, getApprovalRequests
} from '@/lib/db'
import { Project, ProjectCharter, MeasureDataRequirement, GenericApprovalRequest } from '@/lib/mockData'
import {
  ArrowRight, Sparkles, AlertCircle, CheckCircle2,
  ChevronDown, ChevronUp, Plus, Trash2, RefreshCw, Loader2,
  UploadCloud, FileSpreadsheet, Check, Calculator, AlertTriangle,
  Gauge, BarChart3, TrendingDown, Download, Lock, Unlock
} from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import { useDialog } from '@/hooks/useDialog'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Tooltip } from '@/components/Tooltip'
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

// Label dinamis per grup sesuai kategori masalah proyek
function getGroupBadges(category: string = 'quality'): Record<string, { label: string; style: string }> {
  const defectLabel: Record<string, string> = {
    quality:    'Data Utama - Defect/Cacat',
    delivery:   'Data Utama - Keterlambatan',
    cost:       'Data Utama - Pemborosan/Overrun',
    production: 'Data Utama - Downtime',
    safety:     'Data Utama - Insiden/Kecelakaan',
    morale:     'Data Utama - Karyawan Keluar',
  }
  const volumeLabel: Record<string, string> = {
    quality:    'Data Utama - Volume Produksi',
    delivery:   'Data Utama - Total Pengiriman',
    cost:       'Data Utama - Total Anggaran',
    production: 'Data Utama - Jam Produksi',
    safety:     'Data Utama - Total Karyawan/Jam Kerja',
    morale:     'Data Utama - Total Karyawan',
  }
  return {
    primary_defect: { label: defectLabel[category] || 'Data Utama - Defect', style: 'bg-red-500/10 text-red-400 border-red-500/20' },
    primary_volume: { label: volumeLabel[category] || 'Data Utama - Volume', style: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    primary_ctq:    { label: 'Data Utama - CTQ',          style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    supporting:     { label: 'Data Pendukung (KPI)',       style: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    context:        { label: 'Data Konteks',               style: 'bg-slate-700/50 text-slate-300 border-slate-700' },
  }
}

export default function MeasurePage() {
  const router = useRouter()
  const params = useParams()
  const { showAlert, showConfirm } = useDialog()
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
  const [companyTier, setCompanyTier] = useState<string>('menengah')
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [calculatingId, setCalculatingId] = useState<string | null>(null)
  const [showContext, setShowContext] = useState(false)
  const [showIrrelevant, setShowIrrelevant] = useState(false)

  /* ── form tambah data manual ── */
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formReason, setFormReason] = useState('')
  const [formGroup, setFormGroup] = useState('')

  const [approvalRequests, setApprovalRequests] = useState<GenericApprovalRequest[]>([])

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
    problemCategory: string = 'quality',
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
          problem_category: problemCategory,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`)
      if (!data.data_needed || !Array.isArray(data.data_needed)) throw new Error('Format balasan sistem tidak sesuai')

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
        if (comp?.tier) setCompanyTier(comp.tier)
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
        await runAiDataNeedAnalysis(ch, proj.title, cName, proj.problem_category || 'quality')
      }
      
      const reqs = await getApprovalRequests(projectId)
      setApprovalRequests(reqs)
    }
    loadData()
  }, [projectId, router, runAiDataNeedAnalysis])

  const showToast = (msg: string) => { setSaveMsg(msg); setTimeout(() => setSaveMsg(null), 4000) }

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS: Reanalyze, Save, Advance, Manual Add, Delete
  // ─────────────────────────────────────────────────────────────────────────────

  const handleReanalyze = async () => {
    if (!charter || !project) return
    if (!await showConfirm('Analisis ulang akan menghapus semua data saat ini. Lanjutkan?')) return
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      await sb.from('measure_data_requirements').delete().eq('project_id', projectId)
    } catch { /* ignore */ }
    setDataReqs([])
    await runAiDataNeedAnalysis(charter, project.title, companyName, project.problem_category || 'quality')
  }

  const dataReqsRef = useRef(dataReqs)
  useEffect(() => { dataReqsRef.current = dataReqs }, [dataReqs])

  const handleToggleRelevant = async (reqId: string, current: boolean | undefined) => {
    const isNowRelevant = !(current ?? true)
    const updated = dataReqs.map(r => {
      if (r.id === reqId) {
        return { 
          ...r, 
          is_relevant: isNowRelevant,
          status: (isNowRelevant ? 'Belum diupload' : 'Menunggu Persetujuan Konsultan') as MeasureDataRequirement['status']
        }
      }
      return r
    })
    setDataReqs(updated)
    await saveMeasureDataRequirements(projectId, updated)
    showToast('Preferensi relevansi disimpan dan menunggu persetujuan konsultan')
  }

  const handleSaveManualData = (reqId: string, manualData: string) => {
    setDataReqs(prev => prev.map(r => r.id === reqId ? { ...r, manual_data: manualData, status: (manualData ? 'Sudah diupload' : 'Belum diupload') as any } : r))
  }

  const handleBlurManualData = async (reqId: string, manualData: string) => {
    // Gunakan array terbaru dari ref (atau dataReqs jika render cepat) lalu timpa dengan manualData yang pasti akurat
    const updated = dataReqsRef.current.map(r => r.id === reqId ? { ...r, manual_data: manualData, status: (manualData ? 'Sudah diupload' : 'Belum diupload') as any } : r)
    setDataReqs(updated) // just in case
    await saveMeasureDataRequirements(projectId, updated)
    showToast('Data manual tersimpan (autosave)')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const synced = await saveMeasureDataRequirements(projectId, dataReqs)
      setDataReqs(synced)
      
      if (!project?.measure_is_locked) {
        await setProjectPhaseLock(projectId, 'measure', true)
        setProject(prev => prev ? { ...prev, measure_is_locked: true } : null)
      }
      
      showToast('✅ Data berhasil disimpan!')
    } finally { setSaving(false) }
  }

  const handleAdvance = async () => {
    if (dataReqs.length === 0) { await showAlert('Belum ada data yang dikumpulkan.'); return }
    const uploaded = dataReqs.filter(r => r.status !== 'Belum diupload').length
    if (uploaded === 0 && !await showConfirm('Belum ada satupun file data yang diupload. Yakin?')) return
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

  const handleDelete = async (id: string) => {
    if (!await showConfirm('Hapus kebutuhan data ini?')) return
    const updated = dataReqs.filter(p => p.id !== id)
    setDataReqs(updated)
    saveMeasureDataRequirements(projectId, updated).then(synced => setDataReqs(synced)).catch(console.error)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FILE UPLOAD + PARSING + COLUMN VALIDATION (Section 3c)
  // ─────────────────────────────────────────────────────────────────────────────

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null)
  const activeUploadIdRef = useRef<string | null>(null)

  const handleUploadClick = (id: string) => {
    setActiveUploadId(id)
    activeUploadIdRef.current = id
    if (fileInputRef.current) fileInputRef.current.click()
  }

  const handleDownloadTemplate = (req: MeasureDataRequirement) => {
    if (!req.example_columns || req.example_columns.length === 0) return

    const data: any[][] = []
    data.push(req.example_columns)
    
    // Create some dummy data based on group
    if (['primary_volume', 'primary_defect', 'primary_ctq', 'supporting'].includes(req.group || '')) {
      // Add numeric dummy rows
      data.push(req.example_columns.map(c => c.toLowerCase().includes('tanggal') ? '2026-01-01' : '100'))
      data.push(req.example_columns.map(c => c.toLowerCase().includes('tanggal') ? '2026-01-02' : '120'))
    } else {
      // Add text dummy rows
      data.push(req.example_columns.map(c => c.toLowerCase().includes('tanggal') ? '2026-01-01' : 'Contoh teks 1'))
      data.push(req.example_columns.map(c => c.toLowerCase().includes('tanggal') ? '2026-01-02' : 'Contoh teks 2'))
    }

    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Template")
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `template_${req.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const processFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const currentUploadId = activeUploadIdRef.current || activeUploadId
    if (!file || !currentUploadId) return
    e.target.value = ''

    setUploadingId(currentUploadId)

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

      let uploadWarning = ''
      if (expectedCols.length > 0) {
        const expectedLower = expectedCols.map(c => c.toLowerCase().trim())
        const uploadedLower = uploadedCols.map(c => c.toLowerCase().trim())
        const missing = expectedCols.filter((_, i) => !uploadedLower.includes(expectedLower[i]))

        if (missing.length > 0) {
          uploadWarning = "Struktur kolom file Anda berbeda dari template yang disarankan. Unduh template untuk memastikan format sesuai."
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

      // ── Hapus fetch ke AI di sini (dilakukan nanti saat Hitung Gabungan) ──

      // ── Update State & Database ──
      setDataReqs(prev => {
        const updated = prev.map(r =>
          r.id === currentUploadId
            ? { ...r, status: 'Sudah diupload' as const, parsed_summary: summary, recommended_methods: r.recommended_methods || [], raw_data: parsedData, file_url: fileUrl, file_name: file.name, upload_warning: uploadWarning }
            : r
        )
        
        // Save to DB in background, but immediately update UI
        saveMeasureDataRequirements(projectId, updated)
          .then(synced => setDataReqs(synced))
          .catch(err => console.error('Failed to sync to DB after upload:', err))
          
        return updated
      })
      
      showToast('✅ File berhasil diupload dan diproses!')
    } catch (err: any) {
      await showAlert(`Gagal memproses file: ${err.message}`)
    } finally {
      setUploadingId(null)
      setActiveUploadId(null)
      activeUploadIdRef.current = null
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

      // 2. Prepare dynamic method computation if volume is missing
      let dynamicMetricResult: any = null
      
      const volumeReqs = dataReqs.filter(r => r.group === 'primary_volume' && ((r.raw_data && r.raw_data.length > 0) || r.manual_data))
      if (volumeReqs.length === 0) {
        // Find Primary Data
        const primaryDataReqs = dataReqs.filter(r => (r.group === 'primary_defect' || r.group === 'primary_ctq') && ((r.raw_data && r.raw_data.length > 0) || r.manual_data))
        let primaryReq = primaryDataReqs.length > 0 ? primaryDataReqs[0] : null
        
        if (!primaryReq) {
           const anyPrimary = dataReqs.find(r => ((r.raw_data && r.raw_data.length > 0) || r.manual_data) && r.group !== 'context' && r.group !== 'supporting')
           if (anyPrimary) primaryReq = anyPrimary
           else primaryReq = dataReqs.find(r => (r.raw_data && r.raw_data.length > 0) || r.manual_data) || null
        }

        if (primaryReq && primaryReq.raw_data && primaryReq.raw_data.length > 0) {
           const targetCol = targetCols[primaryReq.id]
           let recommendedMethodKey = 'defect_counting'
           
           if (primaryReq.recommended_methods && primaryReq.recommended_methods.length > 0) {
               const aiRecommendedMethodName = primaryReq.recommended_methods[0].method
               const match = matchMethodToWhitelist(aiRecommendedMethodName)
               if (match) recommendedMethodKey = match
           } else {
               try {
                 const res = await fetch('/api/measure-analyze-data', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                     problem_statement: charter.problem_statement || '',
                     data_name: primaryReq.name,
                     parsed_summary: primaryReq.parsed_summary,
                   }),
                 })
                 const data = await res.json()
                 if (data.recommended_methods && data.recommended_methods.length > 0) {
                    const match = matchMethodToWhitelist(data.recommended_methods[0].method)
                    if (match) recommendedMethodKey = match
                 }
               } catch(e) {}
           }
           
           let resultMetrics: any = null
           const rawData = primaryReq.raw_data || []
           const validation = validateDataForMethod(rawData, recommendedMethodKey)
           
           let finalMethodKey = recommendedMethodKey
           if (validation.errors.length > 0 || recommendedMethodKey === 'capability_analysis') {
               // Fallback if error or requires prompt
               finalMethodKey = 'defect_counting'
           }
           
           if (finalMethodKey === 'pareto_analysis') {
             const vals = extractCategoryValues(rawData, targetCol || Object.keys(rawData[0])[0])
             resultMetrics = calcPareto(vals)
           } else if (finalMethodKey === 'control_chart') {
             const vals = extractNumericValues(rawData, targetCol)
             resultMetrics = calcControlChart(vals)
           } else if (finalMethodKey === 'histogram') {
             const vals = extractNumericValues(rawData, targetCol)
             resultMetrics = calcHistogram(vals)
           } else if (finalMethodKey === 'defect_counting') {
             const vals = extractNumericValues(rawData, targetCol)
             resultMetrics = calcDefectCounting(vals, null)
           }
           
           if (resultMetrics) {
               dynamicMetricResult = {
                  name: primaryReq.name,
                  result: {
                     method: finalMethodKey,
                     metrics: resultMetrics,
                     warnings: resultMetrics.warnings || [],
                  }
               }
           }
        }
      }

      // 3. Perform aggregation
      const result = calcAggregatedSigmaLevel(dataReqs, { targetCols }, dynamicMetricResult, project?.problem_category)

      // 3. Call AI interpretation
      let aiInterpretation = null
      try {
        const res = await fetch('/api/measure-interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problem_statement: charter.problem_statement || '',
            method: result.primary_metric?.method_used || 'Kalkulasi Kontekstual',
            calculation_results: result,
            data_name: result.primary_metric?.name || 'Keseluruhan Data (Gabungan)',
            is_simple: companyTier === 'simple',
            problem_category: project?.problem_category || 'quality',
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
      await showAlert(`Gagal menghitung agregasi: ${err.message}`)
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

  const isLocked = project.measure_is_locked
  const pendingUnlockReq = approvalRequests.find(r => r.entity_type === 'phase_unlock' && r.entity_id === 'measure' && r.status === 'pending')

  const handleRequestUnlock = async () => {
    if (pendingUnlockReq) {
      if (await showConfirm('Batalkan pengajuan buka kunci?')) {
        await cancelApprovalRequest(pendingUnlockReq.id)
        setApprovalRequests(approvalRequests.filter(r => r.id !== pendingUnlockReq.id))
      }
      return
    }
    if (await showConfirm('Minta akses edit ke Konsultan?')) {
      const req: GenericApprovalRequest = {
        id: crypto.randomUUID(), project_id: projectId, entity_type: 'phase_unlock', entity_id: 'measure',
        requested_by: userInfo?.id || 'unknown', requested_at: new Date().toISOString(),
        changes: { phase: 'measure' }, status: 'pending'
      }
      await submitApprovalRequest(req)
      setApprovalRequests([req, ...approvalRequests])
      showToast('Permintaan akses edit terkirim.')
    }
  }

  const handleToggleLock = async (lock: boolean) => {
    if (!isKonsultan) return
    await setProjectPhaseLock(projectId, 'measure', lock)
    setProject({ ...project, measure_is_locked: lock })
    showToast(lock ? 'Fase dikunci.' : 'Kunci fase dibuka.')
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Fase MEASURE — Pengumpulan data, validasi, perhitungan level masalah & rekomendasi sistem
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
          {isLocked && (
            <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
              <Lock className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold text-slate-300">Data Terkunci</span>
              {!isKonsultan ? (
                <button onClick={handleRequestUnlock} className="ml-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 text-[10px] font-bold rounded-lg transition-colors">
                  {pendingUnlockReq ? 'Menunggu Persetujuan' : 'Minta Akses Edit'}
                </button>
              ) : (
                <button onClick={() => handleToggleLock(false)} className="ml-2 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[10px] font-bold rounded-lg transition-colors">
                  Buka Kunci
                </button>
              )}
            </div>
          )}
          {!isLocked && isKonsultan && (
            <button onClick={() => handleToggleLock(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-colors">
              <Unlock className="h-3.5 w-3.5" /> Kunci Manual
            </button>
          )}
          <span className="text-[10px] bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-400 font-mono">
            {uploadedCount}/{dataReqs.length} uploaded · {calculatedCount} dihitung
          </span>
        </div>
      </div>

      <fieldset disabled={isLocked && !isKonsultan} className="group disabled:opacity-80">
      
      <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xls,.xlsx" onChange={processFile} />

      {saveMsg && (
        <div className={`px-4 py-3 rounded-xl text-sm ${saveMsg.includes('Gagal') ? 'bg-red-500/15 border border-red-500/30 text-red-400' : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'}`}>
          {saveMsg}
        </div>
      )}


      {/* ── Phase banner ── */}
      <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/15">
        <div>
          <p className="text-xs font-semibold text-indigo-300">Fase Saat Ini: <span className="uppercase font-black">MEASURE</span></p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Upload data → Sistem analisis → Hitung level masalah → Lanjut ke ANALYZE
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
          <p className="text-sm font-semibold text-indigo-300">Sistem sedang merekomendasikan data yang perlu dikumpulkan...</p>
        </div>
      )}

      {/* ── No charter ── */}
      {!analyzing && !charter?.problem_statement && dataReqs.length === 0 && (
        <div className="py-12 text-center border border-dashed border-amber-800/30 rounded-2xl bg-amber-950/5 space-y-2">
          <AlertCircle className="h-8 w-8 mx-auto text-amber-600" />
          <p className="text-sm font-semibold text-amber-400">Project Charter belum diisi</p>
          <p className="text-xs text-slate-500">Analisis membutuhkan Problem Statement dari Project Charter.</p>
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

          {(() => {
            const relevantReqs = dataReqs.filter(r => r.is_relevant !== false && r.group !== 'context');
            const contextReqs = dataReqs.filter(r => r.is_relevant !== false && r.group === 'context');
            const irrelevantReqs = dataReqs.filter(r => r.is_relevant === false);

            const renderReqCard = (req: MeasureDataRequirement, idx: number) => {
              const isExpanded = expandedId === req.id
              const isUploaded = req.status === 'Sudah diupload' || req.status === 'Tervalidasi'
              
              let minRows = 10;
              let reqNumeric = true;
              if (req.recommended_methods && req.recommended_methods.length > 0) {
                minRows = 1;
                reqNumeric = false;
                req.recommended_methods.forEach(m => {
                  const key = matchMethodToWhitelist(m.method);
                  if (key && SUPPORTED_METHODS[key]) {
                    const stats = SUPPORTED_METHODS[key];
                    if (stats.minSamples > minRows) minRows = stats.minSamples;
                    if (stats.requiresNumeric) reqNumeric = true;
                  }
                });
              }

              return (
                <div key={req.id} className={`rounded-2xl border ${isUploaded ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-950/30'} overflow-hidden transition-all`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-200">{idx + 1}. {req.name}</span>
                        {req.source === 'ai' && <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">Auto</span>}
                        {req.group && getGroupBadges(project?.problem_category || 'quality')[req.group] && (() => {
                          const badges = getGroupBadges(project?.problem_category || 'quality')
                          const getTooltipText = (g: string) => {
                            if (g === 'primary_defect') return 'Data utama sebagai pembilang (numerator) dalam rumus kalkulasi metrik'
                            if (g === 'primary_volume') return 'Data utama sebagai penyebut (denominator) dalam rumus kalkulasi metrik'
                            if (g === 'primary_ctq') return 'Critical to Quality: Atribut hasil produksi yang paling penting bagi pelanggan'
                            if (g === 'supporting') return 'Key Performance Indicator: Indikator Kinerja Utama yang mendukung proses'
                            return null
                          }
                          const tt = getTooltipText(req.group)
                          return (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badges[req.group].style}`}>
                              {tt ? <Tooltip text={tt}>{badges[req.group].label}</Tooltip> : badges[req.group].label}
                            </span>
                          )
                        })()}
                        {req.group === 'supporting' && req.is_relevant !== false && (
                          <button onClick={() => handleToggleRelevant(req.id, req.is_relevant)} className="ml-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] rounded border border-slate-700 text-slate-400">
                            Tandai Tidak Relevan
                          </button>
                        )}
                        {req.is_relevant === false && (
                          <button onClick={() => handleToggleRelevant(req.id, req.is_relevant)} className="ml-2 px-2 py-1 bg-emerald-900/50 hover:bg-emerald-800 text-[10px] rounded border border-emerald-800 text-emerald-400">
                            Tandai Relevan
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{req.description}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-900/50 p-2 rounded-lg border border-slate-800 inline-flex">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span><strong>Alasan:</strong> {req.reason}</span>
                      </div>
                      {req.example_columns?.length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-1 mb-2">Kolom disarankan: {req.example_columns.join(', ')}</p>
                      )}
                      
                      {companyTier === 'simple' ? (
                        <div className="mt-2 text-[10px] text-emerald-400/90 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                          <span className="font-bold flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-3.5 h-3.5" /> Panduan Pengisian Data:</span>
                          <ul className="list-disc list-inside space-y-1 ml-1 text-emerald-400/70">
                            <li><strong>Apa yang harus diisi?</strong> Berdasarkan data yang diminta, Anda cukup mengetik <strong>satu angka perkiraan</strong> untuk: <br/><strong className="text-emerald-300">"{req.description}"</strong></li>
                            <li><strong>Contoh:</strong> Ketik angkanya saja (misal: <code>5</code>, <code>80</code>, atau <code>15000</code>) yang paling menggambarkan kondisi usaha Anda saat ini.</li>
                          </ul>
                        </div>
                      ) : (
                        <div className="mt-2 text-[10px] text-emerald-400/90 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                          <span className="font-bold flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-3.5 h-3.5" /> Standar Isi File {req.recommended_methods?.length ? '(Rekomendasi Sistem)' : ''}:</span>
                          <ul className="list-disc list-inside space-y-1 ml-1 text-emerald-400/70">
                            <li><strong>Format Tabel:</strong> (.csv / .xlsx) persis seperti urutan kolom di template.</li>
                            <li><strong>Minimal Baris:</strong> Siapkan minimal {minRows} baris data (sampel).</li>
                            {reqNumeric ? (
                              <li><strong>Tipe Data:</strong> Pastikan terdapat minimal 1 kolom nilai/pengukuran yang berisi <strong>angka numerik murni</strong>.</li>
                            ) : (
                              <li><strong>Tipe Data:</strong> Boleh berupa teks (kategorikal) ataupun angka.</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${isUploaded ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {req.status}
                      </span>

                      <div className="flex items-center gap-2">
                        {companyTier === 'simple' && (
                           <div className="flex flex-col gap-1.5 mt-2">
                             <div className="flex items-center gap-2">
                               <input type="text" placeholder="Ketik angkanya di sini..." value={req.manual_data || ''}
                                 onChange={(e) => handleSaveManualData(req.id, e.target.value)}
                                 onBlur={(e) => handleBlurManualData(req.id, e.target.value)}
                                 className="bg-slate-900 border border-slate-700 text-xs px-3 py-2 rounded-xl text-slate-200"
                               />
                               {(() => {
                                 const text = (req.name + ' ' + req.description).toLowerCase();
                                 if (text.includes('waktu') || text.includes('lama') || text.includes('keterlambatan')) {
                                   return <span className="text-[10px] text-slate-400 font-medium">(Hari / Jam / Menit)</span>;
                                 }
                                 if (text.includes('biaya') || text.includes('harga') || text.includes('rugi') || text.includes('cost')) {
                                   return <span className="text-[10px] text-slate-400 font-medium">(Nominal Rupiah)</span>;
                                 }
                                 if (text.includes('tingkat') || text.includes('akurasi') || text.includes('persentase') || text.includes('efisiensi') || text.includes('rasio')) {
                                   return <span className="text-[10px] text-slate-400 font-medium">(Persentase %)</span>;
                                 }
                                 if (text.includes('jumlah') || text.includes('total') || text.includes('volume') || text.includes('produksi') || text.includes('cacat')) {
                                   return <span className="text-[10px] text-slate-400 font-medium">(Pcs / Unit / Kg)</span>;
                                 }
                                 return null;
                               })()}
                             </div>
                           </div>
                        )}
                        {companyTier !== 'simple' && req.example_columns && req.example_columns.length > 0 && (
                          <button onClick={() => handleDownloadTemplate(req)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 bg-slate-900 border border-slate-700 hover:text-slate-200 hover:bg-slate-800 transition-all">
                            <Download className="w-4 h-4" />
                            Unduh Template
                          </button>
                        )}
                        {companyTier !== 'simple' && (
                          <button onClick={() => handleUploadClick(req.id)} disabled={uploadingId === req.id}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isUploaded ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                            {uploadingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (isUploaded ? <RefreshCw className="w-4 h-4" /> : <UploadCloud className="w-4 h-4" />)}
                            {isUploaded ? 'Upload Ulang' : 'Upload File'}
                          </button>
                        )}
                      </div>

                      {isUploaded && (
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

                  {isExpanded && (
                    <div className="border-t border-slate-800/50 p-5 bg-slate-900/30 space-y-5">
                      {req.upload_warning && (
                        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-400">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <p>{req.upload_warning}</p>
                        </div>
                      )}

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
                            <h4 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Rekomendasi Metode</h4>
                            {req.recommended_methods?.length ? (
                              <div className="space-y-2">
                                {req.recommended_methods.map((m: any, i: number) => {
                                  const matchedMethodKey = matchMethodToWhitelist(m.method)
                                  return (
                                    <div key={i} className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl space-y-2">
                                      <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                                        <span className="text-xs font-bold text-amber-400">{m.method}</span>
                                        {matchedMethodKey && (
                                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">✓ Didukung</span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-400 leading-relaxed">{m.reason}</p>
                                      
                                      {matchedMethodKey && (
                                        <p className="text-[10px] text-emerald-400 mt-2 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                                          💡 Metode ini akan diterapkan otomatis saat Anda klik 'Hitung Metrik Utama Proyek' di bagian bawah halaman.
                                        </p>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-500 italic">Belum ada rekomendasi.</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            };

            return (
              <>
                {/* RELEVANT REQS */}
                {relevantReqs.map((req, idx) => renderReqCard(req, idx))}

                {/* CONTEXT REQS */}
                {contextReqs.length > 0 && (
                  <div className="mt-6 border-t border-slate-800/50 pt-4 space-y-4">
                    <button onClick={() => setShowContext(!showContext)} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm font-bold bg-slate-900/50 hover:bg-slate-800 px-4 py-2 rounded-xl transition-all w-full text-left">
                      {showContext ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      + Tambah Detail / Catatan ({contextReqs.length} Data Konteks Tersedia)
                    </button>
                    {showContext && contextReqs.map((req, idx) => renderReqCard(req, idx + relevantReqs.length))}
                  </div>
                )}

                {/* IRRELEVANT REQS */}
                {irrelevantReqs.length > 0 && (
                  <div className="mt-6 border-t border-slate-800/50 pt-4 space-y-4">
                    <button onClick={() => setShowIrrelevant(!showIrrelevant)} className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm font-bold bg-slate-900/30 hover:bg-slate-800/50 px-4 py-2 rounded-xl transition-all w-full text-left">
                      {showIrrelevant ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      Kategori Tidak Relevan ({irrelevantReqs.length} Item)
                    </button>
                    {showIrrelevant && irrelevantReqs.map((req, idx) => renderReqCard(req, idx + relevantReqs.length + contextReqs.length))}
                  </div>
                )}
              </>
            );
          })()}
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
              Hitung Metrik Utama Proyek
            </button>
          </div>

          {/* ── Dashboard Hasil Agregasi ── */}
          {charter?.measure_summary && (
            <div className="mt-8 p-6 bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-indigo-400" />
                <h4 className="text-lg font-bold text-slate-200">Hasil Analisis Level Masalah</h4>
              </div>

              {companyTier !== 'simple' && charter.measure_summary.warnings && charter.measure_summary.warnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl space-y-2">
                  <h5 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Peringatan Perhitungan
                  </h5>
                  <ul className="list-disc list-inside text-xs text-amber-300 space-y-1">
                    {charter.measure_summary.warnings.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visual Metric */}
                {companyTier === 'simple' ? (
                  <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col justify-center space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-black text-indigo-400">Ringkasan Kondisi</div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Metrik Saat Ini</p>
                    </div>
                    <div className="text-xs text-slate-300 space-y-2 bg-slate-950/50 p-4 rounded-lg">
                      {charter.measure_summary.supporting_kpis && charter.measure_summary.supporting_kpis.length > 0 ? (
                         charter.measure_summary.supporting_kpis.map((kpi: any, idx: number) => (
                            <div key={idx} className="flex justify-between border-b border-slate-800/50 pb-1.5 pt-1.5 first:pt-0 last:border-0 last:pb-0">
                               <span className="text-slate-400 pr-2">{kpi.name}</span>
                               <span className="font-bold text-indigo-300 text-right">{kpi.value}</span>
                            </div>
                         ))
                      ) : (
                         <div className="text-center text-slate-500 italic">Data telah tercatat di sistem untuk dianalisis pada tahap berikutnya.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center space-y-2">
                    {charter.measure_summary.type === 'dynamic' ? (
                      <>
                        <div className="text-4xl font-black text-indigo-400">{charter.measure_summary.primary_metric?.value} <span className="text-2xl">{charter.measure_summary.primary_metric?.unit}</span></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{charter.measure_summary.primary_metric?.name}</p>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-400">
                          <Gauge className="w-3 h-3" />
                          Metode: {charter.measure_summary.primary_metric?.method_used}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-4xl font-black text-indigo-400">
                          {charter.measure_summary.primary_metric?.value !== undefined ? charter.measure_summary.primary_metric.value : 'N/A'}
                          <span className="text-2xl ml-1">{charter.measure_summary.primary_metric?.unit || ''}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <Tooltip text="Metrik kontekstual yang disesuaikan dengan kategori masalah proyek">
                            {charter.measure_summary.primary_metric?.name || 'Sigma Level Gabungan'}
                          </Tooltip>
                        </p>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-400">
                          <Gauge className="w-3 h-3" />
                          Interpretasi: {charter.measure_summary.primary_metric?.interpretation?.interpretation || 'N/A'}
                        </div>
                        <div className="mt-4 text-[10px] text-slate-500 space-y-1 bg-slate-950 p-3 rounded-lg w-full">
                          <p className="flex justify-between"><span>Kategori Masalah:</span> <span className="font-bold text-slate-300 capitalize">{project?.problem_category || 'N/A'}</span></p>
                          <p className="flex justify-between"><span>Total Masalah/Defect:</span> <span className="font-bold text-slate-300">{charter.measure_summary.total_defects}</span></p>
                          <p className="flex justify-between"><span>Total Keseluruhan (Volume):</span> <span className="font-bold text-slate-300">{charter.measure_summary.total_volume}</span></p>
                          {charter.measure_summary.overall_dpmo !== undefined && (
                            <p className="flex justify-between"><Tooltip text="Defects Per Million Opportunities">DPMO:</Tooltip> <span className="font-bold text-slate-300">{charter.measure_summary.overall_dpmo}</span></p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* AI Interpretation */}
                {(() => {
                  let interpretation = charter.measure_summary.type === 'dynamic' 
                    ? charter.measure_summary.primary_metric?.interpretation 
                    : charter.measure_summary.ai_interpretation;
                    
                  if (interpretation?.interpretation && typeof interpretation.interpretation === 'object') {
                    interpretation = interpretation.interpretation;
                  }
                    
                  if (!interpretation) return null;

                  return (
                    <div className="bg-indigo-500/5 p-5 rounded-xl border border-indigo-500/20 space-y-3">
                      <h5 className="text-xs font-bold text-indigo-300 uppercase flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> Interpretasi Sistem
                      </h5>
                      <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
                        {interpretation.level_assessment && companyTier !== 'simple' && (
                          <div>
                            <span className="font-bold text-slate-500 uppercase">Level:</span>
                            <p className="mt-0.5">{interpretation.level_assessment}</p>
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-500 uppercase">Interpretasi:</span>
                          <p className="mt-0.5">{typeof interpretation.interpretation === 'string' ? interpretation.interpretation : JSON.stringify(interpretation.interpretation)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })()}
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

      </fieldset>

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
