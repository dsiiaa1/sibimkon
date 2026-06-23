const id = {
  // Sidebar / Navigation
  nav: {
    dashboard: 'Dashboard',
    companies: 'Daftar Perusahaan',
    profile: 'Profil Perusahaan',
    projects: 'Proyek BIMKON',
    admin: 'Nasional / Admin',
    dmaicTitle: 'Tahapan DMAIC',
    define: '1. Define (Profil & Charter)',
    measure: '2. Measure (PQCDSM)',
    analyze: '3. Analyze (RCA & AI)',
    improve: '4. Improve (Action Plan)',
    control: '5. Control (KPI & PSI)',
    reports: '6. Laporan Akhir',
    logout: 'Keluar Aplikasi',
  },

  // Header
  header: {
    notifications: 'Notifikasi',
    markRead: 'Tandai dibaca',
    noNotifications: 'Tidak ada notifikasi baru.',
    language: 'Bahasa',
  },

  // Common actions
  common: {
    save: 'Simpan',
    cancel: 'Batal',
    delete: 'Hapus',
    add: 'Tambah',
    edit: 'Edit',
    search: 'Cari',
    filter: 'Filter',
    loading: 'Memuat...',
    loadingSibimkon: 'Memuat SIBIMKON...',
    back: 'Kembali',
    next: 'Selanjutnya',
    submit: 'Kirim',
    close: 'Tutup',
    confirm: 'Konfirmasi',
    yes: 'Ya',
    no: 'Tidak',
  },

  // Dashboard page
  dashboard: {
    title: 'Dashboard Konsultan',
    welcome: 'Selamat datang kembali',
    activeProjects: 'Proyek Aktif',
    avgProductivity: 'Rata-rata Produktivitas',
    companiesGuided: 'Perusahaan Didampingi',
    aiInsights: 'Insight AI',
    startProject: 'Mulai Proyek Baru',
    recentActivities: 'Aktivitas Terkini',
    quickStats: 'Statistik Cepat',
  },

  // Projects page
  projects: {
    title: 'Daftar Proyek BIMKON',
    newProject: 'Mulai Proyek Baru',
    status: 'Status',
    company: 'Perusahaan',
    startDate: 'Tanggal Mulai',
    endDate: 'Target Selesai',
    productivity: 'Indeks Produktivitas',
    phase: 'Fase',
    noProjects: 'Belum ada proyek. Mulai proyek baru!',
  },

  // Define page
  define: {
    title: 'Fase DEFINE',
    subtitle: 'Mendefinisikan profil, charter proyek, dan prioritas masalah',
    companyProfile: 'Profil Perusahaan Klien',
    companyName: 'Nama Perusahaan',
    businessField: 'Bidang Usaha',
    mainProduct: 'Produk Utama',
    totalEmployees: 'Jumlah Karyawan',
    address: 'Alamat',
    kadinMembership: 'Keanggotaan KADIN/APINDO',
    laborUnion: 'Serikat Pekerja',
    pkb: 'Perjanjian Kerja Bersama (PKB)',
    certifications: 'Daftar Sertifikasi',
    saveProfile: 'Simpan Profil',
    charter: 'Project Charter',
    problemStatement: 'Pernyataan Masalah (Problem Statement)',
    objectives: 'Tujuan & Sasaran (Objectives)',
    productivityTarget: 'Target Produktivitas',
    scope: 'Ruang Lingkup (Scope)',
    teamMembers: 'Tim Pelaksana Improvement (Perusahaan)',
    memberName: 'Nama Anggota',
    memberPosition: 'Jabatan Perusahaan',
    memberRole: 'Peran dalam Tim',
    noTeamMembers: 'Belum ada anggota tim terdaftar.',
    saveCharter: 'Simpan Project Charter',
  },

  // Measure page
  measure: {
    title: 'Fase MEASURE',
    subtitle: 'Baseline Assessment PQCDSM & Productivity Index',
    productivityIndex: 'Productivity Index',
    saveAssessment: 'Simpan Assessment',
    questionnaire: 'Kuesioner Baseline',
    standardWeight: 'Bobot: 1.0 (Standard)',
    score: 'Skor',
    scoreGuide: '1 = Sangat Buruk · 5 = Sangat Baik',
    radarChart: 'Radar Chart Produktivitas',
    barChart: 'Grafik Batang Skor',
    vom: 'Voice of Management',
    vomContext: 'Gunakan sebagai konteks penilaian kuesioner',
    vomDimension: 'Dimensi PQCDSM',
    vomProblem: 'Keluhan / Prioritas Masalah',
    vomImpact: 'Dampak (Impact)',
    vomNoData: 'Belum ada catatan Voice of Management. Tambahkan di atas.',
    vomAdd: 'Catat Keluhan Manajemen Baru',
  },

  // Analyze page
  analyze: {
    title: 'Fase ANALYZE',
    subtitle: 'Root Cause Analysis & AI Recommendations',
  },

  // Improve page
  improve: {
    title: 'Fase IMPROVE',
    subtitle: 'Rencana Aksi Perbaikan',
  },

  // Control page
  control: {
    title: 'Fase CONTROL',
    subtitle: 'Monitoring KPI & Post-Improvement',
  },

  // Reports
  reports: {
    title: 'Laporan Akhir',
    subtitle: 'Ringkasan hasil proyek dan sertifikat',
    generatePdf: 'Unduh PDF Laporan',
    certificate: 'E-Sertifikat',
  },

  // Admin page
  admin: {
    titleNational: 'Panel Admin SIBIMKON',
    titleRegional: 'Panel Admin SIBIMKON',
    totalCompanies: 'Total Perusahaan Terdaftar',
    activeConsultants: 'Konsultan Aktif',
    avgProductivity: 'Rata-rata Produktivitas',
    completedProjects: 'Proyek Selesai',
    registerCompany: 'Daftarkan Perusahaan Potensial',
    jurisdiction: 'Wilayah Yurisdiksi',
  },
} as const

export type TranslationKeys = {
  [K in keyof typeof id]: {
    [P in keyof typeof id[K]]: string
  }
}
export default id
