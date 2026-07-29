'use client'

// Local state/localStorage database manager for Smart Productive.
// Provides realistic mockup data when Supabase connection is not fully loaded or for instant demoing.

export interface GenericApprovalRequest {
  id: string
  project_id: string
  entity_type: 'efficiency_target' | 'action_plan_step' | string
  entity_id: string
  requested_by: string
  requested_at: string
  changes: Record<string, any>
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reviewed_by?: string
  reviewed_at?: string
  reject_reason?: string
}

export interface Profile {
  id: string
  full_name: string
  email: string
  role: 'konsultan' | 'perusahaan' | 'admin'
  organization?: string
}

export interface Company {
  id: string
  name: string
  address: string
  province: string
  city: string
  business_field: string
  total_employees: number
  certifications?: string[]
  pic_name?: string
  pic_position?: string
  pic_phone?: string
  pic_email?: string
  // Extended fields (sesuai kolom DB Supabase)
  main_product?: string          // maps to main_products di DB
  kadin_membership?: string      // 'tidak_aktif' | 'kadin' | 'apindo' | 'keduanya'
  labor_union?: string           // nama serikat pekerja
  pkb_status?: string            // 'tidak_ada' | 'ada_aktif' | 'proses_perpanjangan'
  tier?: 'simple' | 'menengah' | 'besar'
  tier_source?: 'auto' | 'manual'
  classification_answers?: any
  jumlah_tenaga_kerja?: number
  onboarding_completed?: boolean
  onboarding_completed_at?: string
  tier_set_at?: string
  // §4 PRD Tier Simple — omzet tahunan (dual-kriteria determineTier)
  annual_revenue_idr?: number | null
  // §6.6 PRD — rekomendasi upgrade tier
  tier_upgrade_recommended?: boolean
  tier_recommended_value?: string
  tier_upgrade_reviewed_by?: string
  tier_upgrade_reviewed_at?: string
}

export interface CompanyBaselineAssessment {
  id: string
  company_id: string
  status: 'draft' | 'submitted' | 'locked'
  
  // Field unik kuesioner
  tahun_pendirian?: string
  kepemilikan?: string
  pemilik_gender?: string
  asal_investasi?: string
  konsumen_utama?: string
  ekspor?: boolean
  ekspor_persen_produksi?: number
  
  // Struktur Staf
  struktur_staf?: any
  jam_kerja_keseluruhan?: string
  upah_digital?: boolean
  upah_digital_persen?: number
  
  // 6 dimensi PQCDSM
  dimensi_production?: any
  dimensi_quality?: any
  dimensi_cost?: any
  dimensi_delivery?: any
  dimensi_safety?: any
  dimensi_morale?: any
  
  // Ringkasan penilaian
  ringkasan_masalah_utama?: string
  ringkasan_rencana_program?: string
  ringkasan_kegiatan_training?: string
  bagan_organisasi?: string
  proses_produksi?: string
  
  submitted_at?: string
  created_at?: string
  updated_at?: string
}

export interface AiIdentifiedProblem {
  id: string
  assessment_id: string
  company_id: string
  title: string
  description: string
  pqcdsm_dimensions: string[]
  urgency_indicator: string
  sumber_jawaban?: string[]
  status: 'pending' | 'approved' | 'dismissed'
  reviewed_by?: string
  approved_at?: string
  project_charter_id?: string
  project_id?: string
  created_at?: string
}

export interface Project {
  id: string
  project_code: string
  title: string
  description: string
  company_id: string
  company_name: string
  consultant_id: string
  status: 'draft' | 'define' | 'measure' | 'analyze' | 'improve' | 'control' | 'completed'
  start_date: string
  target_end_date: string
  dimensi_pqcdsm?: string
  urgency_indicator?: string
  baseline_score?: number
  baseline_reasoning?: string
  current_score?: number
  define_is_locked?: boolean
  measure_is_locked?: boolean
  analyze_is_locked?: boolean
  improve_is_locked?: boolean
  control_is_locked?: boolean
  problem_category?: string
}

export interface ProjectCharter {
  project_id: string
  problem_statement: string
  objectives: string
  productivity_target: string
  scope: string
  business_case?: string
  timeline?: string
  team_members: Array<{ name: string; position: string; role: string }>
  measure_summary?: any
  field_sources?: Record<string, string>
  ai_drafted_at?: string
  source?: 'manual' | 'ai_generated'
  source_problem_id?: string
}

export interface AssessmentResponse {
  id: string
  question: string
  score: number
  max_score: number
  notes: string
}

export interface Assessment {
  project_id: string
  dimension: 'productivity' | 'quality' | 'cost' | 'delivery' | 'safety' | 'morale'
  responses: AssessmentResponse[]
  percentage_score: number
}

export interface FishboneNode {
  id: string
  category: 'man' | 'machine' | 'method' | 'material' | 'measurement' | 'environment'
  text: string
}

export interface WhyNode {
  level: number
  why: string
  answer: string
  children?: WhyNode[]
}

export interface ParetoItem {
  id?: string
  project_id: string
  problem_name: string
  score: number
}

export interface ActionStep {
  id: string
  action_plan_id: string
  description: string
  is_completed: boolean
  pic?: string
  step_order?: number
  completed_by?: string
  completed_at?: string
  created_at?: string
  updated_at?: string
}

export interface ActionPlan {
  id: string
  project_id: string
  problem_title?: string
  title: string
  description: string
  methodology: string
  dimension: string
  kpi_name: string
  kpi_baseline: number
  kpi_target: number
  kpi_unit: string
  kpi_actual?: number
  /** Nilai KPI aktual terverifikasi — diinput oleh konsultan setelah cek bukti */
  verified_kpi_actual?: number
  verified_by?: string
  verified_at?: string
  /** Estimasi penghematan biaya nyata (Rp) — diinput manual oleh konsultan */
  cost_saving_manual?: number
  /** Estimasi biaya investasi program nyata (Rp) — diinput manual oleh konsultan */
  investment_manual?: number
  steps?: ActionPlanStep[]
  pic_name: string
  start_date: string
  end_date: string
  status: 'belum_mulai' | 'sedang_berjalan' | 'selesai' | 'tertunda'
  progress_percentage: number
  is_deleted?: boolean
  /** Hasil analisis AI (Persiapan, Biaya, ROI, dll) */
  ai_analysis?: ImproveAiAnalysis
}

export interface EfficiencyActual {
  id: string
  efficiency_target_id: string
  checkpoint_number: number
  due_date: string
  actual_value?: number | null
  input_by?: string
  input_at?: string
  note?: string
  created_at?: string
  updated_at?: string
}

export interface EfficiencyTarget {
  id: string
  action_plan_id: string
  project_id: string
  raw_text: string
  metric_name: string
  baseline_value?: number | null
  target_value: number
  duration: number
  duration_unit: string
  needs_manual_review: boolean
  generated_at?: string
  created_at?: string
  updated_at?: string
  
  actuals?: EfficiencyActual[]
}

export interface ImproveAiAnalysis {
  persiapan: string
  sumber_daya: {
    sdm: string
    alat: string
    anggaran_terkait: string
  }
  biaya: {
    estimasi: number
    rincian: string
    rincian_items?: { item: string; jumlah: number; sumber?: 'bukti' | 'estimasi'; keterangan?: string }[]
  }
  manfaat: {
    kualitatif: string
    kuantitatif: string
  }
  target_efisiensi: string
  roi: {
    estimasi_penghematan_tahunan: number
    biaya_implementasi: number
    roi_persen: number
    catatan?: string
    bukti_digunakan?: string[]
    rincian_penghematan_items?: { item: string; jumlah: number; sumber?: 'bukti' | 'estimasi'; keterangan?: string }[]
  }
  langkah_dianalisis?: {
    total: number
    selesai_dengan_bukti: number
    selesai_tanpa_bukti: number
    belum_selesai: number
  }
}

// ── Tipe baru untuk revisi 2026 ───────────────────────────────────────────────

export interface ProjectEditLog {
  id: string
  project_id: string
  edited_by: string
  edited_at: string
  changes: Record<string, any>
}

/** Rekomendasi metode per masalah */
export interface MethodRecommendation {
  method: string
  reason: string
  priority: number
}

/** Masalah dari charter yang dikategorikan ke PQCDSM + rekomendasi metode */
export interface MeasureProblem {
  id: string
  project_id: string
  problem_text: string
  source: 'charter' | 'manual'
  pqcdsm_dimension: 'productivity' | 'quality' | 'cost' | 'delivery' | 'safety' | 'morale'
  /** Alasan AI mengapa masalah ini masuk dimensi ini */
  dimension_reason?: string
  recommended_methods: MethodRecommendation[]
  impact?: string
  priority_rank: number
  notes?: string
  /** true = data sudah dihasilkan Gemini AI, false = data lama dari keyword matching */
  ai_analyzed?: boolean
}

/** Rekomendasi kebutuhan data dari AI di fase Measure */
export interface MeasureDataRequirement {
  id: string
  project_id: string
  name: string
  description: string
  reason: string
  expected_format: string
  example_columns: string[]
  status: 'Belum diupload' | 'Sudah diupload' | 'Tervalidasi' | 'Menunggu Persetujuan Konsultan'
  parsed_summary?: any
  recommended_methods?: Array<{ method: string; reason: string }>
  source: 'ai' | 'manual'
  /** Grup klasifikasi data: primary_defect, primary_volume, primary_ctq, supporting, context */
  group?: 'primary_defect' | 'primary_volume' | 'primary_ctq' | 'supporting' | 'context' | string
  /** Catatan peran data ini dalam perhitungan */
  role_note?: string
  /** Data mentah hasil parsing (seluruh baris) — disimpan di localStorage untuk kalkulasi */
  raw_data?: any[]
  /** URL file yang diupload ke storage */
  file_url?: string
  /** Nama file asli yang diupload */
  file_name?: string
  /** Hasil kalkulasi (opsional) - tidak dipakai lagi */
  calculation_results?: any
  /** Peringatan ringan setelah upload (mis. format tidak sesuai) */
  upload_warning?: string
  /** Relevansi data pendukung KPI untuk perusahaan ini */
  is_relevant?: boolean
  /** Data manual yang dimasukkan jika tier simple */
  manual_data?: string
  /** Hasil perhitungan statistik (hardcoded, bukan AI) */
  calculation_results_final?: {
    method: string
    metrics: Record<string, any>
    warnings: string[]
    ai_interpretation?: {
      level_assessment: string
      standard_used: string
      interpretation: string
      analyze_recommendation: string
    }
  }
}

export interface AnalyzeRecommendation {
  method: string
  reasoning: string
  priority: number
  source: 'ai' | 'custom'
  structure_type?: 'category_list' | 'ranked_list' | 'key_value' | string
  data?: any
}

export interface ActionPlanStep {
  id: string
  action: string
  description?: string // from action_plan_steps table
  pic: string
  timeline: string
  is_completed?: boolean
  self_marked_done?: boolean
  verification_status?: 'pending' | 'approved' | 'rejected'
  file_url?: string
}

export interface PriorityItem {
  no: number
  problem: string
  priority_score: number
  priority_level: string
  justification: string
  related_methods: string[]
  action_plan: ActionPlanStep[]
}

export interface AnalyzeResult {
  project_id: string
  recommendations: AnalyzeRecommendation[]
  priority_result?: PriorityItem[]
  status: 'draft' | 'saved'
}

/** Kebutuhan implementasi metode di fase Analyze */
export interface AnalyzeNeed {
  id: string
  project_id: string
  method_name: string
  pqcdsm_dimension?: string
  need_category: 'sdm' | 'alat' | 'bahan' | 'sop' | 'pelatihan' | 'anggaran' | 'lainnya'
  need_item: string
  quantity?: string
  estimated_cost?: number
  responsible?: string
  notes?: string
  is_available: boolean
}


/** Bukti implementasi dengan status verifikasi */
export interface EvidenceItem {
  id: string
  project_id: string
  action_plan_id: string
  action_title?: string
  file_name: string
  file_url: string
  /** Nilai KPI aktual yang di-submit perusahaan (belum terverifikasi) */
  kpi_submitted_value?: number
  kpi_unit?: string
  evidence_status: 'pending' | 'reviewed' | 'verified' | 'rejected'
  reviewer_id?: string
  reviewed_at?: string
  reviewer_notes?: string
  uploaded_by_id?: string
  uploaded_by_name?: string
  uploaded_by_role?: string
  uploaded_at?: string
}

/** Catatan konsultan di KPI Dashboard (Control) */
export interface ConsultantControlNote {
  id: string
  project_id: string
  action_plan_id?: string
  note_text: string
  note_type: 'general' | 'kpi_comment' | 'warning' | 'recommendation'
  is_visible_to_company: boolean
  created_by?: string
  created_by_name?: string
  created_at: string
}

// Initial mock data
const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp-1',
    name: 'PT Sinar Maju Tekstil',
    address: 'Jl. Raya Industri No. 45, Karawang',
    province: 'Jawa Barat',
    city: 'Karawang',
    business_field: 'Tekstil & Garmen',
    total_employees: 250,
    certifications: ['ISO 9001', 'SMK3'],
    pic_name: 'Budi Santoso',
    pic_position: 'Manager HR & Produksi',
    pic_phone: '081234567890',
    pic_email: 'budi.santoso@sinarmaju.com',
  },
  {
    id: 'comp-2',
    name: 'PT Global Pangan Sentosa',
    address: 'Kawasan Industri Candi Blok C-3, Semarang',
    province: 'Jawa Tengah',
    city: 'Semarang',
    business_field: 'Makanan & Minuman',
    total_employees: 120,
    certifications: ['HACCP', 'Halal MUI'],
    pic_name: 'Dewi Lestari',
    pic_position: 'QA Lead',
    pic_phone: '089876543210',
    pic_email: 'dewi.lestari@globalpangan.com',
  }
]

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    project_code: 'BK-2026-0001',
    title: 'Peningkatan Efisiensi Line Sewing PT Sinar Maju',
    description: 'Bimbingan konsultasi peningkatan produktivitas line sewing dengan metode Lean dan Kaizen.',
    company_id: 'comp-1',
    company_name: 'PT Sinar Maju Tekstil',
    consultant_id: 'user-1',
    status: 'improve',
    start_date: '2026-05-10',
    target_end_date: '2026-08-10',
    baseline_score: 58,
    current_score: 72,
  },
  {
    id: 'proj-2',
    project_code: 'BK-2026-0002',
    title: 'Reduksi Defek Kemasan PT Global Pangan',
    description: 'Analisis akar penyebab tingginya defect kemasan plastik dan implementasi Quality Control Circle.',
    company_id: 'comp-2',
    company_name: 'PT Global Pangan Sentosa',
    consultant_id: 'user-1',
    status: 'analyze',
    start_date: '2026-06-01',
    target_end_date: '2026-09-01',
    baseline_score: 64,
    current_score: 64,
  }
]

const INITIAL_CHARTERS: Record<string, ProjectCharter> = {
  'proj-1': {
    project_id: 'proj-1',
    problem_statement: 'Tingginya defect rate di Line Sewing (5.2% vs target 2%) menyebabkan keterlambatan delivery dan tambahan biaya re-work sebesar Rp 25jt/bulan.',
    objectives: 'Menurunkan defect rate line sewing menjadi <2% dan mempersingkat lead time line setup dari 4 jam menjadi 1.5 jam.',
    productivity_target: 'Peningkatan Output Per Jam (OPH) sebesar 15% dari 120 pcs/jam menjadi 138 pcs/jam.',
    scope: 'Terbatas pada Line Sewing 3 dan Sewing 4 departemen Produksi Karawang.',
    team_members: [
      { name: 'Budi Santoso', position: 'Supervisor Sewing', role: 'Team Leader' },
      { name: 'Siti Aminah', position: 'QC Inspector', role: 'Member' },
      { name: 'Joko Widodo', position: 'Operator Sewing', role: 'Member' }
    ]
  }
}

const INITIAL_ASSESSMENTS: Record<string, Assessment[]> = {
  'proj-1': [
    {
      project_id: 'proj-1',
      dimension: 'productivity',
      percentage_score: 60,
      responses: [
        { id: 'P1', question: 'Kelancaran proses produksi', score: 3, max_score: 5, notes: 'Sering ada bottleneck di bagian balancing sewing' },
        { id: 'P2', question: 'Ketersediaan bahan baku', score: 4, max_score: 5, notes: '' },
        { id: 'P3', question: 'Kondisi dan kerusakan mesin/peralatan', score: 3, max_score: 5, notes: 'Mesin obras sering macet' },
        { id: 'P4', question: 'Pencapaian target produksi', score: 3, max_score: 5, notes: 'Hanya mencapai 80-85% dari target bulanan' },
        { id: 'P5', question: 'Efisiensi penggunaan waktu produksi', score: 2, max_score: 5, notes: 'Banyak waktu terbuang saat changeover line' }
      ]
    },
    {
      project_id: 'proj-1',
      dimension: 'quality',
      percentage_score: 48,
      responses: [
        { id: 'Q1', question: 'Tingkat reject/cacat produk', score: 2, max_score: 5, notes: 'Defect rate jahit kerut di atas toleransi' },
        { id: 'Q2', question: 'Keluhan pelanggan/customer', score: 3, max_score: 5, notes: 'Ada klaim jahitan lepas dari buyer' },
        { id: 'Q3', question: 'Ketersediaan SOP mutu', score: 3, max_score: 5, notes: 'SOP jahit belum diupdate sejak 2023' },
        { id: 'Q4', question: 'Sistem Quality Control', score: 2, max_score: 5, notes: 'QC pasif, inspeksi di akhir line saja' },
        { id: 'Q5', question: 'Pencapaian KPI mutu', score: 2, max_score: 5, notes: 'KPI mutu jarang tercapai' }
      ]
    },
    {
      project_id: 'proj-1',
      dimension: 'cost',
      percentage_score: 56,
      responses: [
        { id: 'C1', question: 'Efisiensi penggunaan bahan/material', score: 3, max_score: 5, notes: 'Wastage benang tinggi' },
        { id: 'C2', question: 'Efisiensi penggunaan energi', score: 4, max_score: 5, notes: '' },
        { id: 'C3', question: 'Kerugian akibat kerusakan mesin', score: 2, max_score: 5, notes: 'Downtime mesin jahit merugikan Rp 5jt/kejadian' },
        { id: 'C4', question: 'Tingkat overproduction/pemborosan', score: 3, max_score: 5, notes: 'Banyak WIP menumpuk' },
        { id: 'C5', question: 'Biaya maintenance dan perbaikan', score: 2, max_score: 5, notes: 'PM tidak rutin' }
      ]
    },
    {
      project_id: 'proj-1',
      dimension: 'delivery',
      percentage_score: 64,
      responses: [
        { id: 'D1', question: 'Ketepatan waktu pengiriman', score: 3, max_score: 5, notes: 'Delay rata-rata 2 hari untuk buyer lokal' },
        { id: 'D2', question: 'Lead time produksi', score: 3, max_score: 5, notes: 'Lead time 14 hari, target 10 hari' },
        { id: 'D3', question: 'Keterlambatan penerimaan bahan', score: 4, max_score: 5, notes: '' },
        { id: 'D4', question: 'Keterlambatan proses produksi', score: 3, max_score: 5, notes: '' },
        { id: 'D5', question: 'Ketersediaan stok/inventory', score: 3, max_score: 5, notes: '' }
      ]
    },
    {
      project_id: 'proj-1',
      dimension: 'safety',
      percentage_score: 72,
      responses: [
        { id: 'S1', question: 'Tingkat kecelakaan kerja', score: 4, max_score: 5, notes: 'Hanya insiden kecil tergores jarum' },
        { id: 'S2', question: 'Ketersediaan dan penggunaan APD', score: 3, max_score: 5, notes: 'Masker sering dilepas oleh operator' },
        { id: 'S3', question: 'Keberadaan dan fungsi P2K3', score: 4, max_score: 5, notes: '' },
        { id: 'S4', question: 'Implementasi SMK3', score: 3, max_score: 5, notes: '' },
        { id: 'S5', question: 'Penilaian risiko K3 berkala', score: 4, max_score: 5, notes: '' }
      ]
    },
    {
      project_id: 'proj-1',
      dimension: 'morale',
      percentage_score: 60,
      responses: [
        { id: 'M1', question: 'Tingkat absensi karyawan', score: 3, max_score: 5, notes: 'Absensi Senin pagi mencapai 8%' },
        { id: 'M2', question: 'Tingkat turnover karyawan', score: 3, max_score: 5, notes: 'Turnover operator 4% per bulan' },
        { id: 'M3', question: 'Program pelatihan dan pengembangan', score: 3, max_score: 5, notes: '' },
        { id: 'M4', question: 'Kompetensi dan sertifikasi pekerja', score: 3, max_score: 5, notes: '' },
        { id: 'M5', question: 'Sistem reward dan penghargaan', score: 3, max_score: 5, notes: 'Belum ada reward peningkatan produktivitas' }
      ]
    }
  ]
}



const INITIAL_ACTION_PLANS: Record<string, ActionPlan[]> = {
  'proj-1': [
    {
      id: 'act-1',
      project_id: 'proj-1',
      title: 'Penerapan Standardized Work & Time Study',
      description: 'Melakukan time study pada semua stasiun jahit sewing line 3 untuk menetapkan standard time dan merancang penyeimbangan beban lini.',
      methodology: 'Lean Manufacturing',
      dimension: 'productivity',
      kpi_name: 'Downtime bottleneck',
      kpi_baseline: 45,
      kpi_target: 10,
      kpi_unit: 'menit/hari',
      kpi_actual: 15,
      pic_name: 'Budi Santoso',
      start_date: '2026-05-15',
      end_date: '2026-06-15',
      status: 'selesai',
      progress_percentage: 100
    },
    {
      id: 'act-2',
      project_id: 'proj-1',
      title: 'Setup Preventive Maintenance Mesin Jahit',
      description: 'Menjadwalkan perawatan rutin mesin setiap sabtu oleh tim maintenance internal dan menyediakan checklist harian sebelum mesin dipakai.',
      methodology: 'TPM (Total Productive Maintenance)',
      dimension: 'productivity',
      kpi_name: 'Kerusakan mesin jahit',
      kpi_baseline: 6,
      kpi_target: 1,
      kpi_unit: 'kejadian/bulan',
      kpi_actual: 2,
      pic_name: 'Tim Maintenance',
      start_date: '2026-06-01',
      end_date: '2026-07-15',
      status: 'sedang_berjalan',
      progress_percentage: 60
    },
    {
      id: 'act-3',
      project_id: 'proj-1',
      title: 'Penerapan Poka-Yoke Pada Mesin Sewing',
      description: 'Memasang pembatas magnetik portable untuk menjaga konsistensi jarak jahitan kerut agar operator tidak melenceng.',
      methodology: 'Kaizen / Poka-Yoke',
      dimension: 'quality',
      kpi_name: 'Defect rate jahit kerut',
      kpi_baseline: 5.2,
      kpi_target: 2.0,
      kpi_unit: '%',
      kpi_actual: 2.8,
      pic_name: 'Siti Aminah',
      start_date: '2026-06-10',
      end_date: '2026-07-25',
      status: 'sedang_berjalan',
      progress_percentage: 50
    }
  ]
}

export const getMockDB = () => {
  if (typeof window === 'undefined') {
    return {
      companies: INITIAL_COMPANIES,
      projects: INITIAL_PROJECTS,
      charters: INITIAL_CHARTERS,
      assessments: INITIAL_ASSESSMENTS,
      actionPlans: INITIAL_ACTION_PLANS,
      measureProblems: {} as Record<string, MeasureProblem[]>,
      analyzeNeeds: {} as Record<string, AnalyzeNeed[]>,
      evidenceItems: {} as Record<string, EvidenceItem[]>,
      consultantNotes: {} as Record<string, ConsultantControlNote[]>,
      measureDataReqs: {} as Record<string, MeasureDataRequirement[]>,
      analyzeResults: {} as Record<string, AnalyzeResult>,
      controlChangeRequests: {} as Record<string, GenericApprovalRequest[]>,
      companyBaselineAssessments: {} as Record<string, CompanyBaselineAssessment>,
      aiIdentifiedProblems: {} as Record<string, AiIdentifiedProblem[]>,
      projectEditLogs: {} as Record<string, ProjectEditLog[]>,
    }
  }

  // Load from localStorage or set defaults
  const getOrSet = (key: string, defaultValue: any) => {
    const data = localStorage.getItem(`smartproductive_${key}`)
    if (data) return JSON.parse(data)
    localStorage.setItem(`smartproductive_${key}`, JSON.stringify(defaultValue))
    return defaultValue
  }

  return {
    companies: getOrSet('companies', INITIAL_COMPANIES),
    projects: getOrSet('projects', INITIAL_PROJECTS),
    charters: getOrSet('charters', INITIAL_CHARTERS),
    assessments: getOrSet('assessments', INITIAL_ASSESSMENTS),
    actionPlans: getOrSet('actionPlans', INITIAL_ACTION_PLANS),
    measureProblems: getOrSet('measureProblems', {}),
    analyzeNeeds: getOrSet('analyzeNeeds', {}),
    evidenceItems: getOrSet('evidenceItems', {}),
    consultantNotes: getOrSet('consultantNotes', {}),
    measureDataReqs: getOrSet('measureDataReqs', {}),
    analyzeResults: getOrSet('analyzeResults', {}),
    controlChangeRequests: getOrSet('controlChangeRequests', {}),
    companyBaselineAssessments: getOrSet('companyBaselineAssessments', {}),
    aiIdentifiedProblems: getOrSet('aiIdentifiedProblems', {}),
    projectEditLogs: getOrSet('projectEditLogs', {}),
  }
}

export const updateMockDB = (key: string, data: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`smartproductive_${key}`, JSON.stringify(data))
  }
}

export interface TierReviewRequest {
  id: string
  company_id: string
  requested_by: string
  requested_at: string
  message?: string
  status: 'open' | 'resolved'
  resolved_by?: string
  resolved_at?: string
}
