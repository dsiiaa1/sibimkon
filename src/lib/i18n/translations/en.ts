import type { TranslationKeys } from './id'

const en: TranslationKeys = {
  // Sidebar / Navigation
  nav: {
    dashboard: 'Dashboard',
    companies: 'Client Companies',
    profile: 'Company Profile',
    projects: 'BIMKON Projects',
    admin: 'National / Admin',
    dmaicTitle: 'DMAIC Stages',
    define: '1. Define (Profile & Charter)',
    measure: '2. Measure (PQCDSM)',
    analyze: '3. Analyze (RCA & AI)',
    improve: '4. Improve (Action Plan)',
    control: '5. Control (KPI & PSI)',
    reports: '6. Final Report',
    logout: 'Sign Out',
  },

  // Header
  header: {
    notifications: 'Notifications',
    markRead: 'Mark all read',
    noNotifications: 'No new notifications.',
    language: 'Language',
  },

  // Common actions
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    add: 'Add',
    edit: 'Edit',
    search: 'Search',
    filter: 'Filter',
    loading: 'Loading...',
    loadingSibimkon: 'Loading SIBIMKON...',
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    close: 'Close',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
  },

  // Dashboard page
  dashboard: {
    title: 'Consultant Dashboard',
    welcome: 'Welcome back',
    activeProjects: 'Active Projects',
    avgProductivity: 'Avg. Productivity',
    companiesGuided: 'Companies Guided',
    aiInsights: 'AI Insights',
    startProject: 'Start New Project',
    recentActivities: 'Recent Activities',
    quickStats: 'Quick Stats',
  },

  // Projects page
  projects: {
    title: 'BIMKON Project List',
    newProject: 'Start New Project',
    status: 'Status',
    company: 'Company',
    startDate: 'Start Date',
    endDate: 'Target Completion',
    productivity: 'Productivity Index',
    phase: 'Phase',
    noProjects: 'No projects yet. Start a new project!',
  },

  // Define page
  define: {
    title: 'DEFINE Phase',
    subtitle: 'Define company profile, project charter, and priority issues',
    companyProfile: 'Client Company Profile',
    companyName: 'Company Name',
    businessField: 'Business Field',
    mainProduct: 'Main Product',
    totalEmployees: 'Total Employees',
    address: 'Address',
    kadinMembership: 'KADIN/APINDO Membership',
    laborUnion: 'Labor Union',
    pkb: 'Collective Bargaining Agreement (PKB)',
    certifications: 'Certifications List',
    saveProfile: 'Save Profile',
    charter: 'Project Charter',
    problemStatement: 'Problem Statement',
    objectives: 'Objectives & Goals',
    productivityTarget: 'Productivity Target',
    scope: 'Scope',
    teamMembers: 'Improvement Team Members (Company)',
    memberName: 'Member Name',
    memberPosition: 'Company Position',
    memberRole: 'Team Role',
    noTeamMembers: 'No team members registered yet.',
    saveCharter: 'Save Project Charter',
  },

  // Measure page
  measure: {
    title: 'MEASURE Phase',
    subtitle: 'Baseline Assessment PQCDSM & Productivity Index',
    productivityIndex: 'Productivity Index',
    saveAssessment: 'Save Assessment',
    questionnaire: 'Baseline Questionnaire',
    standardWeight: 'Weight: 1.0 (Standard)',
    score: 'Score',
    scoreGuide: '1 = Very Poor · 5 = Excellent',
    radarChart: 'Productivity Radar Chart',
    barChart: 'Score Bar Chart',
    vom: 'Voice of Management',
    vomContext: 'Use as context for questionnaire scoring',
    vomDimension: 'PQCDSM Dimension',
    vomProblem: 'Complaint / Priority Issue',
    vomImpact: 'Impact',
    vomNoData: 'No Voice of Management records yet. Add above.',
    vomAdd: 'Record New Management Complaint',
  },

  // Analyze page
  analyze: {
    title: 'ANALYZE Phase',
    subtitle: 'Root Cause Analysis & AI Recommendations',
  },

  // Improve page
  improve: {
    title: 'IMPROVE Phase',
    subtitle: 'Improvement Action Plan',
  },

  // Control page
  control: {
    title: 'CONTROL Phase',
    subtitle: 'KPI Monitoring & Post-Improvement',
  },

  // Reports
  reports: {
    title: 'Final Report',
    subtitle: 'Project results summary and certificate',
    generatePdf: 'Download PDF Report',
    certificate: 'E-Certificate',
  },

  // Admin page
  admin: {
    titleNational: 'National Admin Panel — Kemnaker RI',
    titleRegional: 'Regional Admin Panel — Disnaker',
    totalCompanies: 'Total Registered Companies',
    activeConsultants: 'Active Consultants',
    avgProductivity: 'Average Productivity',
    completedProjects: 'Completed Projects',
    registerCompany: 'Register Potential Company',
    jurisdiction: 'Jurisdiction Area',
  },
} as const

export default en
