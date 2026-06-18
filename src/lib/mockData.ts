'use client'

// Local state/localStorage database manager for SIBIMKON.
// Provides realistic mockup data when Supabase connection is not fully loaded or for instant demoing.

export interface Profile {
  id: string
  full_name: string
  email: string
  role: 'konsultan' | 'perusahaan' | 'admin_disnaker' | 'admin_kemnaker'
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
  baseline_score?: number
  current_score?: number
}

export interface ProjectCharter {
  project_id: string
  problem_statement: string
  objectives: string
  productivity_target: string
  scope: string
  team_members: Array<{ name: string; position: string; role: string }>
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

export interface ActionPlan {
  id: string
  project_id: string
  title: string
  description: string
  methodology: string
  dimension: string
  kpi_name: string
  kpi_baseline: number
  kpi_target: number
  kpi_unit: string
  kpi_actual?: number
  pic_name: string
  start_date: string
  end_date: string
  status: 'belum_mulai' | 'sedang_berjalan' | 'selesai' | 'tertunda'
  progress_percentage: number
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

const INITIAL_FISHBONES: Record<string, FishboneNode[]> = {
  'proj-1': [
    { id: 'fb-1', category: 'man', text: 'Operator kurang teliti saat menjahit kerutan' },
    { id: 'fb-2', category: 'man', text: 'Operator baru belum ditraining secara penuh' },
    { id: 'fb-3', category: 'machine', text: 'Tension benang mesin jahit sering berubah sendiri' },
    { id: 'fb-4', category: 'machine', text: 'Perawatan mesin obras tidak terjadwal (no PM)' },
    { id: 'fb-5', category: 'method', text: 'Belum ada SOP penyeimbangan lini jahit (line balancing)' },
    { id: 'fb-6', category: 'material', text: 'Benang jahit dari supplier X mudah putus' }
  ]
}

const INITIAL_5WHY: Record<string, WhyNode[]> = {
  'proj-1': [
    {
      level: 1,
      why: 'Mengapa defect jahit tinggi?',
      answer: 'Karena operator sering salah jahit di bagian kerutan.',
      children: [
        {
          level: 2,
          why: 'Mengapa operator sering salah?',
          answer: 'Karena mereka terburu-buru mengejar target harian.',
          children: [
            {
              level: 3,
              why: 'Mengapa terburu-buru?',
              answer: 'Karena line balancing kurang seimbang sehingga terjadi bottleneck di sewing.',
              children: [
                {
                  level: 4,
                  why: 'Mengapa line balancing tidak seimbang?',
                  answer: 'Karena supervisor tidak punya tool untuk mengukur standar waktu pengerjaan per stasiun.',
                  children: [
                    {
                      level: 5,
                      why: 'Mengapa tidak punya tool standar waktu?',
                      answer: 'Karena belum pernah dilakukan Time Study dan penetapan SOP baru.'
                    }
                  ]
                }
              ]
            }
          ]
        }
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
      fishbones: INITIAL_FISHBONES,
      fiveWhys: INITIAL_5WHY,
      actionPlans: INITIAL_ACTION_PLANS
    }
  }

  // Load from localStorage or set defaults
  const getOrSet = (key: string, defaultValue: any) => {
    const data = localStorage.getItem(`sibimkon_${key}`)
    if (data) return JSON.parse(data)
    localStorage.setItem(`sibimkon_${key}`, JSON.stringify(defaultValue))
    return defaultValue
  }

  return {
    companies: getOrSet('companies', INITIAL_COMPANIES),
    projects: getOrSet('projects', INITIAL_PROJECTS),
    charters: getOrSet('charters', INITIAL_CHARTERS),
    assessments: getOrSet('assessments', INITIAL_ASSESSMENTS),
    fishbones: getOrSet('fishbones', INITIAL_FISHBONES),
    fiveWhys: getOrSet('fiveWhys', INITIAL_5WHY),
    actionPlans: getOrSet('actionPlans', INITIAL_ACTION_PLANS)
  }
}

export const updateMockDB = (key: string, data: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`sibimkon_${key}`, JSON.stringify(data))
  }
}
