'use client'

import { createClient } from './supabase/client'
import { getMockDB, updateMockDB, Project, Company, ProjectCharter, Assessment, FishboneNode, WhyNode, ActionPlan, MeasureProblem, AnalyzeNeed, EvidenceItem, ConsultantControlNote } from './mockData'

// Client dibuat fresh setiap panggilan agar selalu pakai session terbaru
function getSupabase() {
  if (typeof window === 'undefined') return null
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null
  return createClient()
}

// ── PROJECTS ─────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('bimkon_projects').select('*, companies(name)')
    if (error) throw error
    return (data || []).map((p: any) => ({
      id: p.id, project_code: p.project_code, title: p.title,
      description: p.description, company_id: p.company_id,
      company_name: p.companies?.name || 'Unknown', consultant_id: p.consultant_id,
      status: p.status, start_date: p.start_date, target_end_date: p.target_end_date,
      baseline_score: Number(p.baseline_productivity_index || 0),
      current_score: Number(p.current_productivity_index || 0)
    }))
  } catch (err) {
    console.warn('[getProjects] fallback to mockDB:', err)
    return getMockDB().projects
  }
}

export async function createProject(project: Omit<Project, 'id' | 'project_code'>): Promise<Project> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('bimkon_projects').insert({
      title: project.title, description: project.description,
      company_id: project.company_id, consultant_id: project.consultant_id,
      status: project.status, start_date: project.start_date,
      target_end_date: project.target_end_date, current_phase: 'define'
    }).select('*, companies(name)').single()
    if (error) throw error
    return {
      id: data.id, project_code: data.project_code, title: data.title,
      description: data.description, company_id: data.company_id,
      company_name: data.companies?.name || 'Unknown', consultant_id: data.consultant_id,
      status: data.status, start_date: data.start_date, target_end_date: data.target_end_date,
      baseline_score: Number(data.baseline_productivity_index || 0),
      current_score: Number(data.current_productivity_index || 0)
    }
  } catch (err) {
    console.warn('[createProject] fallback to mockDB:', err)
    const db = getMockDB()
    const newProj: Project = {
      ...project, id: 'proj-' + Math.random().toString(36).substr(2, 9),
      project_code: `BK-2026-000${db.projects.length + 1}`,
      baseline_score: 0, current_score: 0
    }
    updateMockDB('projects', [...db.projects, newProj])
    return newProj
  }
}

// ── COMPANIES ────────────────────────────────────────────────────────────────

export async function getCompanies(): Promise<Company[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('companies').select('*')
    if (error) throw error
    return data || []
  } catch (err) {
    console.warn('[getCompanies] fallback to mockDB:', err)
    return getMockDB().companies
  }
}

export async function createCompany(company: Omit<Company, 'id'>): Promise<Company> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('companies').insert({
      name: company.name, address: company.address, province: company.province,
      city: company.city, business_field: company.business_field,
      total_employees: company.total_employees, certifications: company.certifications || [],
      pic_name: company.pic_name, pic_position: company.pic_position,
      pic_phone: company.pic_phone, pic_email: company.pic_email,
    }).select('*').single()
    if (error) throw error
    return { ...data }
  } catch (err) {
    console.warn('[createCompany] fallback to mockDB:', err)
    const newCompany: Company = { ...company, id: 'comp-' + Math.random().toString(36).substr(2, 9) }
    const db = getMockDB()
    updateMockDB('companies', [...db.companies, newCompany])
    return newCompany
  }
}

export async function updateCompany(companyId: string, fields: Partial<Company> & Record<string, any>): Promise<void> {
  const db = getMockDB()
  updateMockDB('companies', db.companies.map((c: Company) => c.id === companyId ? { ...c, ...fields } : c))
  try {
    const sb = getSupabase()
    if (!sb) return
    const { error } = await sb.from('companies').update({
      ...(fields.name !== undefined && { name: fields.name }),
      ...(fields.address !== undefined && { address: fields.address }),
      ...(fields.total_employees !== undefined && { total_employees: fields.total_employees }),
      ...(fields.business_field !== undefined && { business_field: fields.business_field }),
      ...(fields.main_product !== undefined && { main_products: fields.main_product }),
      ...(fields.certifications !== undefined && { certifications: fields.certifications }),
      ...(fields.kadin_membership !== undefined && {
        kadin_member: fields.kadin_membership === 'kadin' || fields.kadin_membership === 'keduanya',
        apindo_member: fields.kadin_membership === 'apindo' || fields.kadin_membership === 'keduanya',
      }),
      ...(fields.labor_union !== undefined && { has_union: !!fields.labor_union }),
      ...(fields.pkb_status !== undefined && { has_pkb: fields.pkb_status !== 'tidak_ada' }),
      ...(fields.pic_name !== undefined && { pic_name: fields.pic_name }),
      ...(fields.pic_position !== undefined && { pic_position: fields.pic_position }),
      ...(fields.pic_phone !== undefined && { pic_phone: fields.pic_phone }),
      ...(fields.pic_email !== undefined && { pic_email: fields.pic_email }),
      updated_at: new Date().toISOString(),
    }).eq('id', companyId)
    if (error) throw error
  } catch (err) {
    console.warn('[updateCompany] Supabase failed, saved to mockDB only:', err)
  }
}

// ── DEFINE: Project Charter ───────────────────────────────────────────────────

export async function getProjectCharter(projectId: string): Promise<ProjectCharter | null> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('project_charters').select('*').eq('project_id', projectId).single()
    if (error) throw error
    return data
  } catch (err) {
    console.warn('[getProjectCharter] fallback to mockDB:', err)
    return getMockDB().charters[projectId] || null
  }
}

export async function saveProjectCharter(charter: ProjectCharter): Promise<void> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { error } = await sb.from('project_charters').upsert({
      project_id: charter.project_id, problem_statement: charter.problem_statement,
      objectives: charter.objectives, productivity_target: charter.productivity_target,
      scope: charter.scope, team_members: charter.team_members
    })
    if (error) throw error
  } catch (err) {
    console.warn('[saveProjectCharter] fallback to mockDB:', err)
    const db = getMockDB()
    db.charters[charter.project_id] = charter
    updateMockDB('charters', db.charters)
  }
}

// ── MEASURE: Assessments ──────────────────────────────────────────────────────

export async function getAssessments(projectId: string): Promise<Assessment[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('measure_assessments').select('*').eq('project_id', projectId)
    if (error) throw error
    return (data || []).map((d: any) => ({
      project_id: d.project_id, dimension: d.dimension,
      percentage_score: Number(d.percentage_score || 0),
      responses: d.responses?.questions || []
    }))
  } catch (err) {
    console.warn('[getAssessments] fallback to mockDB:', err)
    return getMockDB().assessments[projectId] || []
  }
}

export async function saveAssessments(projectId: string, assessments: Assessment[]): Promise<void> {
  const db = getMockDB()
  db.assessments[projectId] = assessments
  updateMockDB('assessments', db.assessments)
  try {
    const sb = getSupabase()
    if (!sb) return
    for (const assess of assessments) {
      const { error } = await sb.from('measure_assessments').upsert({
        project_id: projectId, dimension: assess.dimension,
        percentage_score: assess.percentage_score,
        responses: { questions: assess.responses },
        assessment_version: 1
      }, { onConflict: 'project_id,dimension,assessment_version' })
      if (error) throw error
    }
    const avgIndex = Math.round(assessments.reduce((a, c) => a + c.percentage_score, 0) / assessments.length)
    const { data: existing } = await sb.from('bimkon_projects')
      .select('baseline_productivity_index').eq('id', projectId).maybeSingle()
    const baseline = existing?.baseline_productivity_index ? Number(existing.baseline_productivity_index) : avgIndex
    await sb.from('bimkon_projects').update({
      baseline_productivity_index: baseline,
      current_productivity_index: avgIndex,
      updated_at: new Date().toISOString()
    }).eq('id', projectId)
  } catch (err) {
    console.warn('[saveAssessments] Supabase failed, saved to mockDB only:', err)
  }
}

// ── MEASURE: VOM ──────────────────────────────────────────────────────────────

export async function getVom(projectId: string): Promise<any[]> {
  // Coba dari Supabase dulu
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('measure_vom').select('*')
      .eq('project_id', projectId).order('priority', { ascending: true })
    if (error) throw error
    // Sync hasil ke localStorage sebagai cache
    if (typeof window !== 'undefined') {
      localStorage.setItem(`sibimkon_vom_${projectId}`, JSON.stringify(data || []))
    }
    return data || []
  } catch (err) {
    console.warn('[getVom] fallback to localStorage:', err)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`sibimkon_vom_${projectId}`)
      return saved ? JSON.parse(saved) : []
    }
    return []
  }
}

export async function saveVom(projectId: string, vomList: any[]): Promise<void> {
  // Simpan ke localStorage dulu sebagai fallback
  if (typeof window !== 'undefined') {
    localStorage.setItem(`sibimkon_vom_${projectId}`, JSON.stringify(vomList))
  }
  try {
    const sb = getSupabase()
    if (!sb) return // Sudah disimpan ke localStorage di atas
    const { error: delErr } = await sb.from('measure_vom').delete().eq('project_id', projectId)
    if (delErr) throw delErr
    if (vomList.length > 0) {
      const rows = vomList.map((v) => ({
        project_id: projectId, dimension: v.dimension, problem: v.problem, impact: v.impact, priority: v.priority
      }))
      const { error: insErr } = await sb.from('measure_vom').insert(rows)
      if (insErr) throw insErr
    }
    console.log('[saveVom] saved', vomList.length, 'items')
  } catch (err) {
    console.warn('[saveVom] Supabase failed, localStorage only:', err)
  }
}

// ── ANALYZE: Fishbone ─────────────────────────────────────────────────────────

export async function getFishbones(projectId: string): Promise<FishboneNode[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('analyze_fishbone').select('nodes')
      .eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    return (data?.nodes as FishboneNode[]) || []
  } catch (err) {
    console.warn('[getFishbones] fallback to mockDB:', err)
    return getMockDB().fishbones[projectId] || []
  }
}

export async function saveFishbones(projectId: string, items: FishboneNode[]): Promise<void> {
  const db = getMockDB(); db.fishbones[projectId] = items; updateMockDB('fishbones', db.fishbones)
  try {
    const sb = getSupabase()
    if (!sb) return
    const { data: existing } = await sb.from('analyze_fishbone').select('id').eq('project_id', projectId).limit(1).maybeSingle()
    if (existing?.id) {
      const { error } = await sb.from('analyze_fishbone').update({ nodes: items, updated_at: new Date().toISOString() }).eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await sb.from('analyze_fishbone').insert({ project_id: projectId, title: 'Fishbone Diagram', nodes: items })
      if (error) throw error
    }
  } catch (err) { console.warn('[saveFishbones] Supabase failed, mockDB only:', err) }
}

// ── ANALYZE: 5-Why ────────────────────────────────────────────────────────────

export async function getFiveWhys(projectId: string): Promise<WhyNode[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('analyze_5why').select('why_tree')
      .eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    return (data?.why_tree as WhyNode[]) || []
  } catch (err) {
    console.warn('[getFiveWhys] fallback to mockDB:', err)
    return getMockDB().fiveWhys[projectId] || []
  }
}

export async function saveFiveWhys(projectId: string, whyTree: WhyNode[]): Promise<void> {
  const db = getMockDB(); db.fiveWhys[projectId] = whyTree; updateMockDB('fiveWhys', db.fiveWhys)
  try {
    const sb = getSupabase()
    if (!sb) return
    const { data: existing } = await sb.from('analyze_5why').select('id').eq('project_id', projectId).limit(1).maybeSingle()
    if (existing?.id) {
      const { error } = await sb.from('analyze_5why').update({ why_tree: whyTree, updated_at: new Date().toISOString() }).eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await sb.from('analyze_5why').insert({ project_id: projectId, problem_statement: 'Analisis 5-Why', why_tree: whyTree })
      if (error) throw error
    }
  } catch (err) { console.warn('[saveFiveWhys] Supabase failed, mockDB only:', err) }
}

// ── IMPROVE: Action Plans ─────────────────────────────────────────────────────

export async function getActionPlans(projectId: string): Promise<ActionPlan[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('improve_actions').select('*').eq('project_id', projectId)
    if (error) throw error
    return (data || []).map((d: any) => ({
      id: d.id, project_id: d.project_id, title: d.action_title,
      description: d.description, methodology: d.methodology, dimension: d.dimension,
      kpi_name: d.kpi_name, kpi_baseline: Number(d.kpi_baseline || 0),
      kpi_target: Number(d.kpi_target || 0), kpi_unit: d.kpi_unit,
      kpi_actual: d.kpi_actual != null ? Number(d.kpi_actual) : undefined,
      cost_saving_manual: d.cost_saving_manual != null ? Number(d.cost_saving_manual) : undefined,
      investment_manual: d.investment_manual != null ? Number(d.investment_manual) : undefined,
      pic_name: d.pic_name, start_date: d.start_date,
      end_date: d.end_date, status: d.status, progress_percentage: d.progress_percentage
    }))
  } catch (err) {
    console.warn('[getActionPlans] fallback to mockDB:', err)
    return getMockDB().actionPlans[projectId] || []
  }
}

export async function saveActionPlans(projectId: string, actions: ActionPlan[]): Promise<void> {
  const db = getMockDB(); db.actionPlans[projectId] = actions; updateMockDB('actionPlans', db.actionPlans)
  const sb = getSupabase()
  // Data sudah tersimpan ke mockDB di atas — jangan throw, cukup return
  if (!sb) return

  // Fetch existing IDs dari Supabase
  const { data: existing, error: fetchErr } = await sb.from('improve_actions').select('id').eq('project_id', projectId)
  if (fetchErr) throw new Error(`Gagal fetch existing: ${fetchErr.message}`)
  const existingIds = new Set((existing || []).map((e: any) => e.id))
  const incomingIds = new Set(actions.map(a => a.id))

  // Hapus yang sudah tidak ada
  const toDelete = [...existingIds].filter(id => !incomingIds.has(id))
  if (toDelete.length > 0) {
    const { error } = await sb.from('improve_actions').delete().in('id', toDelete)
    if (error) throw new Error(`Gagal delete: ${error.message}`)
  }

  if (actions.length === 0) return

  // Pisahkan: existing (update) vs baru (insert)
  const toUpdate = actions.filter(a => existingIds.has(a.id))
  const toInsert = actions.filter(a => !existingIds.has(a.id))

  // Update existing rows
  for (const act of toUpdate) {
    const { error } = await sb.from('improve_actions').update({
      action_title: act.title, description: act.description,
      methodology: act.methodology, dimension: act.dimension, kpi_name: act.kpi_name,
      kpi_baseline: act.kpi_baseline, kpi_target: act.kpi_target, kpi_unit: act.kpi_unit,
      kpi_actual: act.kpi_actual != null ? act.kpi_actual : null,
      cost_saving_manual: act.cost_saving_manual != null ? act.cost_saving_manual : null,
      investment_manual: act.investment_manual != null ? act.investment_manual : null,
      pic_name: act.pic_name,
      start_date: act.start_date, end_date: act.end_date,
      status: act.status, progress_percentage: act.progress_percentage
    }).eq('id', act.id)
    if (error) throw new Error(`Gagal update action ${act.id}: ${error.message}`)
  }

  // Insert new rows — tanpa kolom id, biarkan Supabase generate
  if (toInsert.length > 0) {
    const rows = toInsert.map(act => ({
      project_id: projectId, action_title: act.title, description: act.description,
      methodology: act.methodology, dimension: act.dimension, kpi_name: act.kpi_name,
      kpi_baseline: act.kpi_baseline, kpi_target: act.kpi_target, kpi_unit: act.kpi_unit,
      cost_saving_manual: act.cost_saving_manual != null ? act.cost_saving_manual : null,
      investment_manual: act.investment_manual != null ? act.investment_manual : null,
      pic_name: act.pic_name,
      start_date: act.start_date, end_date: act.end_date,
      status: act.status, progress_percentage: act.progress_percentage
    }))
    const { error } = await sb.from('improve_actions').insert(rows)
    if (error) throw new Error(`Gagal insert action plans: ${error.message} | detail: ${JSON.stringify(error)}`)
  }
}

// ── CONTROL: Audit Checklist ──────────────────────────────────────────────────

export async function getControlAudit(projectId: string): Promise<any[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('audit_checklists').select('items')
      .eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    if (data?.items && (data.items as any[]).length > 0) {
      return data.items as any[]
    }
    // Fallback ke localStorage jika tidak ada data di DB
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`sibimkon_audit_${projectId}`) : null
    return saved ? JSON.parse(saved) : []
  } catch (err) {
    console.warn('[getControlAudit] fallback to localStorage:', err)
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`sibimkon_audit_${projectId}`) : null
    return saved ? JSON.parse(saved) : []
  }
}

export async function saveControlAudit(projectId: string, items: any[]): Promise<void> {
  if (typeof window !== 'undefined') localStorage.setItem(`sibimkon_audit_${projectId}`, JSON.stringify(items))
  try {
    const sb = getSupabase()
    if (!sb) return
    const compliant = items.filter((i: any) => i.completed).length
    const pct = items.length > 0 ? Math.round((compliant / items.length) * 100) : 0
    const { data: existing } = await sb.from('audit_checklists').select('id').eq('project_id', projectId).limit(1).maybeSingle()
    if (existing?.id) {
      const { error } = await sb.from('audit_checklists').update({ items, total_items: items.length, compliant_items: compliant, compliance_percentage: pct, updated_at: new Date().toISOString() }).eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await sb.from('audit_checklists').insert({ project_id: projectId, category: 'General', items, total_items: items.length, compliant_items: compliant, compliance_percentage: pct })
      if (error) throw error
    }
  } catch (err) { console.warn('[saveControlAudit] Supabase failed, localStorage only:', err) }
}

// ── CONTROL: PSI ──────────────────────────────────────────────────────────────

export async function getControlPsi(projectId: string): Promise<{ people: number; process: number; system: number; result: number } | null> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('sustainability_assessments')
      .select('people_score, process_score, system_score, result_score').eq('project_id', projectId).maybeSingle()
    if (error) throw error
    if (data) {
      return { people: Number(data.people_score || 70), process: Number(data.process_score || 65), system: Number(data.system_score || 60), result: Number(data.result_score || 75) }
    }
    // Fallback ke localStorage jika tidak ada data di DB
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`sibimkon_psi_${projectId}`) : null
    return saved ? JSON.parse(saved) : null
  } catch (err) {
    console.warn('[getControlPsi] fallback to localStorage:', err)
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`sibimkon_psi_${projectId}`) : null
    return saved ? JSON.parse(saved) : null
  }
}

export async function saveControlPsi(projectId: string, psi: { people: number; process: number; system: number; result: number }): Promise<void> {
  if (typeof window !== 'undefined') localStorage.setItem(`sibimkon_psi_${projectId}`, JSON.stringify(psi))
  try {
    const sb = getSupabase()
    if (!sb) return
    const psiTotal = Math.round((psi.people + psi.process + psi.system + psi.result) / 4)
    const { error } = await sb.from('sustainability_assessments').upsert({
      project_id: projectId, people_score: psi.people, process_score: psi.process,
      system_score: psi.system, result_score: psi.result, psi_total: psiTotal,
      updated_at: new Date().toISOString()
    }, { onConflict: 'project_id' })
    if (error) throw error
  } catch (err) { console.warn('[saveControlPsi] Supabase failed, localStorage only:', err) }
}

// ── DMAIC Phase ───────────────────────────────────────────────────────────────

export type DmaicPhase = 'draft' | 'define' | 'measure' | 'analyze' | 'improve' | 'control' | 'completed'

export async function updateProjectPhase(projectId: string, newPhase: DmaicPhase): Promise<void> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { error } = await sb.from('bimkon_projects').update({ status: newPhase, current_phase: newPhase }).eq('id', projectId)
    if (error) throw error
  } catch (err) {
    console.warn('[updateProjectPhase] fallback to mockDB:', err)
    const db = getMockDB()
    updateMockDB('projects', db.projects.map((p: Project) => p.id === projectId ? { ...p, status: newPhase } : p))
  }
}

/**
 * updateProjectScore
 *
 * Update `current_productivity_index` (current_score) di project.
 * Dipanggil setelah KPI aktual diinput di fase Improve agar angka
 * Produktivitas Aktual di Reports/header ikut berubah tanpa harus
 * kembali ke halaman Measure.
 *
 * Kalkulasi: rata-rata persentase pencapaian seluruh action plan
 *   achievement% = clamp((actual - baseline) / (target - baseline) * 100, 0, 100)
 * lalu blended dengan baseline_score:
 *   new_current = baseline + (100 - baseline) * avg_achievement / 100
 */
export async function updateProjectScore(projectId: string, actionPlans: ActionPlan[]): Promise<number> {
  const plansWithActual = actionPlans.filter(a => a.kpi_actual !== undefined && a.kpi_target !== a.kpi_baseline)

  let newScore: number

  if (plansWithActual.length === 0) {
    // Belum ada KPI aktual — kembalikan score existing
    const projects = await getProjects()
    const proj = projects.find((p: Project) => p.id === projectId)
    return proj?.current_score ?? 0
  }

  const avgAchievement = plansWithActual.reduce((acc, a) => {
    const range = Math.abs(a.kpi_target - a.kpi_baseline)
    // Support both "higher is better" dan "lower is better"
    const improvement = a.kpi_target > a.kpi_baseline
      ? (a.kpi_actual! - a.kpi_baseline)
      : (a.kpi_baseline - a.kpi_actual!)
    const pct = range > 0 ? Math.min(100, Math.max(0, (improvement / range) * 100)) : 0
    return acc + pct
  }, 0) / plansWithActual.length

  // Ambil baseline dari project
  const projects = await getProjects()
  const proj = projects.find((p: Project) => p.id === projectId)
  const baseline = proj?.baseline_score ?? 0

  // Blended formula: baseline + headroom * achievement
  newScore = Math.round(baseline + (100 - baseline) * (avgAchievement / 100))
  newScore = Math.min(100, Math.max(0, newScore))

  // Simpan ke mockDB
  const db = getMockDB()
  updateMockDB('projects', db.projects.map((p: Project) =>
    p.id === projectId ? { ...p, current_score: newScore } : p
  ))

  // Simpan ke Supabase
  try {
    const sb = getSupabase()
    if (sb) {
      await sb.from('bimkon_projects').update({
        current_productivity_index: newScore,
        updated_at: new Date().toISOString()
      }).eq('id', projectId)
    }
  } catch (err) {
    console.warn('[updateProjectScore] Supabase fallback to mockDB only:', err)
  }

  return newScore
}

// ── Evidence Files ────────────────────────────────────────────────────────────

export interface EvidenceRecord {
  id: string; action_plan_id: string; action_title?: string; file_name: string
  file_url: string; kpi_actual_value?: number; kpi_unit?: string
  uploaded_by_id?: string; uploaded_by_name?: string; uploaded_by_role?: string; uploaded_at?: string
}

export async function saveEvidenceRecord(projectId: string, record: Omit<EvidenceRecord, 'id'>): Promise<void> {
  if (typeof window !== 'undefined') {
    const key = `sibimkon_evidence_${projectId}`
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    existing.push({ ...record, id: 'ev-' + Math.random().toString(36).substr(2, 9), uploaded_at: record.uploaded_at || new Date().toISOString() })
    localStorage.setItem(key, JSON.stringify(existing))
  }
  try {
    const sb = getSupabase()
    if (!sb) return
    const { error } = await sb.from('action_evidence').insert({
      project_id: projectId, action_id: record.action_plan_id,
      evidence_type: 'document',
      title: record.action_title,
      description: record.file_name,
      file_url: record.file_url,
      file_name: record.file_name,
      kpi_actual_value: record.kpi_actual_value, kpi_unit: record.kpi_unit,
      uploaded_by: record.uploaded_by_id || null,
    })
    if (error) console.warn('[saveEvidenceRecord] Supabase error (non-critical):', error.message)
  } catch (err) { console.warn('[saveEvidenceRecord] failed, localStorage only:', err) }
}

export async function getEvidenceRecords(projectId: string, actionPlanId?: string): Promise<EvidenceRecord[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    let q = sb.from('action_evidence').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    if (actionPlanId) q = q.eq('action_id', actionPlanId)
    const { data, error } = await q
    if (error) throw error
    return (data || []).map((d: any) => ({
      id: d.id, action_plan_id: d.action_id, action_title: d.title,
      file_name: d.file_name, file_url: d.file_url, kpi_actual_value: d.kpi_actual_value,
      kpi_unit: d.kpi_unit, uploaded_by_id: d.uploaded_by,
      uploaded_at: d.created_at,
    } as EvidenceRecord))
  } catch {
    if (typeof window === 'undefined') return []
    const all: EvidenceRecord[] = JSON.parse(localStorage.getItem(`sibimkon_evidence_${projectId}`) || '[]')
    return actionPlanId ? all.filter(e => e.action_plan_id === actionPlanId) : all
  }
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  project_id: string; action_plan_id?: string; actor_id?: string; actor_role?: string
  event_type: 'status_change' | 'evidence_upload' | 'kpi_update' | 'plan_created' | 'plan_deleted'; detail: string
}

export async function saveAuditLog(entry: AuditLogEntry): Promise<void> {
  if (typeof window !== 'undefined') {
    const key = `sibimkon_status_audit_${entry.project_id}`
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    existing.unshift({ ...entry, id: 'audit-' + Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() })
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 200)))
  }
  try {
    const sb = getSupabase()
    if (!sb) return
    const { error } = await sb.from('action_audit_log').insert({
      project_id: entry.project_id, action_plan_id: entry.action_plan_id || null,
      actor_id: entry.actor_id || null, actor_role: entry.actor_role || null,
      event_type: entry.event_type, detail: entry.detail, created_at: new Date().toISOString(),
    })
    if (error) console.warn('[saveAuditLog] Supabase error (non-critical):', error.message)
  } catch (err) { console.warn('[saveAuditLog] failed, localStorage only:', err) }
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function saveNotification(notification: { user_id: string; project_id: string; type: string; title: string; message: string }): Promise<void> {
  if (typeof window !== 'undefined') {
    const key = `sibimkon_mock_notifications_${notification.user_id}`
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    existing.unshift({ id: 'notif-' + Math.random().toString(36).substr(2, 9), ...notification, created_at: new Date().toISOString(), is_read: false })
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)))
  }
  try {
    const sb = getSupabase()
    if (!sb) return
    const { error } = await sb.from('notifications').insert({ ...notification, is_read: false })
    if (error) console.warn('[saveNotification] Supabase error (non-critical):', error.message)
  } catch (err) { console.warn('[saveNotification] failed, localStorage only:', err) }
}

// ═══════════════════════════════════════════════════════════════════════════
// REVISI 2026 — Fungsi-fungsi baru untuk modul Measure, Analyze, Improve, Control
// ═══════════════════════════════════════════════════════════════════════════

// ── MEASURE: Kategorisasi Masalah & Rekomendasi Metode ────────────────────────

type DimensionValue = 'productivity' | 'quality' | 'cost' | 'delivery' | 'safety' | 'morale'

/**
 * classifyProblemToPQCDSM
 *
 * Menganalisis teks masalah dan menentukan secara otomatis masuk ke
 * dimensi PQCDSM mana. Mengembalikan SEMUA dimensi yang relevan
 * (satu masalah bisa menyentuh lebih dari satu dimensi), diurutkan
 * dari yang paling dominan.
 *
 * @param text - teks masalah dari charter atau input manual
 * @returns array dimensi yang relevan, urut dari skor tertinggi
 */
export function classifyProblemToPQCDSM(
  text: string
): Array<{ dimension: DimensionValue; score: number; matchedKeywords: string[] }> {
  const lower = text.toLowerCase()

  const DIMENSION_KEYWORDS: Record<DimensionValue, string[]> = {
    productivity: [
      'produksi','output','target','efisiensi','kapasitas','throughput','lini',
      'proses','mesin','operator','waktu','bottleneck','downtime','utilitas',
      'pemasaran','penjualan','sales','marketing','digital','online','omzet',
      'pendapatan','revenue','customer','pelanggan','market','promosi',
    ],
    quality: [
      'kualitas','mutu','defect','cacat','reject','keluhan','komplain',
      'retur','recall','inspeksi','standar','toleransi','spesifikasi',
      'qc','qm','iso','sertifikasi','audit mutu','gagal',
    ],
    cost: [
      'biaya','cost','pengeluaran','anggaran','budget','rugi','kerugian',
      'boros','waste','material','energi','overhead','margin','harga pokok',
      'hpp','investasi','modal','hutang','efisiensi biaya',
    ],
    delivery: [
      'pengiriman','delivery','keterlambatan','terlambat','lead time','deadline',
      'jadwal','on time','tepat waktu','distribusi','logistik','order',
      'permintaan','stok','inventori','backorder','ekspedisi',
    ],
    safety: [
      'keselamatan','k3','kecelakaan','insiden','accident','bahaya','hazard',
      'apd','p2k3','smk3','risiko','unsafe','penyakit','ergonomi','lingkungan',
      'kebakaran','limbah','polusi','bising',
    ],
    morale: [
      'karyawan','sdm','absensi','turnover','resign','motivasi','semangat',
      'pelatihan','training','kompetensi','skill','gaji','reward','punishment',
      'budaya','komunikasi','konflik','kepemimpinan','tim','teamwork',
    ],
  }

  const results = (Object.entries(DIMENSION_KEYWORDS) as [DimensionValue, string[]][]).map(
    ([dim, keywords]) => {
      const matched = keywords.filter((kw) => lower.includes(kw))
      return { dimension: dim, score: matched.length, matchedKeywords: matched }
    }
  )

  // Urutkan dari skor tertinggi, filter yang score > 0
  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
}

/**
 * Mapping dimensi PQCDSM ke daftar metode yang relevan.
 */
const METHOD_RECOMMENDATIONS: Record<string, Array<{ method: string; reason: string; keywords: string[] }>> = {
  productivity: [
    { method: 'Lean Manufacturing',          reason: 'Mengeliminasi pemborosan (waste) yang menghambat produktivitas lini produksi',       keywords: ['produksi','mesin','proses','efisiensi','output','target','lini','operator','waktu','bottleneck','waste','pemborosan'] },
    { method: 'Kaizen',                       reason: 'Perbaikan berkelanjutan kecil-kecil yang terakumulasi menjadi peningkatan signifikan', keywords: ['perbaikan','bertahap','proses','standar','konsisten','rutin'] },
    { method: 'Line Balancing',               reason: 'Menyeimbangkan beban kerja tiap stasiun untuk mengurangi bottleneck produksi',        keywords: ['lini','stasiun','bottleneck','sewing','assembly','balancing','beban'] },
    { method: 'TPM (Total Productive Maintenance)', reason: 'Meningkatkan ketersediaan mesin dan mencegah downtime tak terjadwal',          keywords: ['mesin','perawatan','downtime','kerusakan','maintenance','peralatan'] },
    { method: 'Value Stream Mapping',         reason: 'Memetakan aliran nilai untuk mengidentifikasi area pemborosan',                       keywords: ['aliran','peta','value','stream','proses','mapping','inventori'] },
    { method: 'Digital Marketing & CRM',      reason: 'Meningkatkan jangkauan pelanggan dan efisiensi proses penjualan secara digital',      keywords: ['penjualan','pemasaran','marketing','digital','pelanggan','customer','sales','door','online','media','promosi','jangkauan'] },
    { method: 'Sales Process Improvement',    reason: 'Menyederhanakan dan menstandarkan proses penjualan untuk meningkatkan konversi',      keywords: ['penjualan','sales','konversi','proses','door to door','kunjungan'] },
  ],
  quality: [
    { method: 'QCC / GKM (Gugus Kendali Mutu)', reason: 'Melibatkan tim lapangan dalam pemecahan masalah mutu secara kolaboratif',          keywords: ['mutu','kualitas','defect','cacat','reject','keluhan','complaint','inspeksi'] },
    { method: 'Six Sigma (DMAIC)',            reason: 'Mengurangi variasi dan cacat produk secara sistematis berbasis data',                  keywords: ['defect','cacat','variasi','sigma','reject','produk','kualitas'] },
    { method: 'Poka-Yoke',                    reason: 'Mencegah kesalahan di titik proses dengan mekanisme anti-salah',                      keywords: ['kesalahan','salah','error','anti','cegah','mekanisme','jig'] },
    { method: 'SPC (Statistical Process Control)', reason: 'Memantau kestabilan proses produksi dengan chart statistik',                    keywords: ['statistik','kontrol','chart','variasi','proses','kapabilitas'] },
    { method: 'TQM (Total Quality Management)', reason: 'Membangun budaya mutu menyeluruh dari manajemen hingga operator',                  keywords: ['budaya','mutu','menyeluruh','sistem','sertifikasi','iso','standar'] },
    { method: 'Layanan Pelanggan (Customer Service)', reason: 'Meningkatkan kepuasan pelanggan melalui standar layanan yang terukur',       keywords: ['pelanggan','customer','layanan','kepuasan','komplain','keluhan','servis'] },
  ],
  cost: [
    { method: 'Lean Manufacturing',           reason: 'Mengeliminasi 8 jenis pemborosan yang menambah biaya tanpa nilai',                   keywords: ['biaya','cost','pemborosan','waste','material','bahan','energi','overproduction'] },
    { method: 'Activity Based Costing',       reason: 'Mengidentifikasi aktivitas yang tidak bernilai tambah dan membebani biaya',           keywords: ['biaya','aktivitas','overhead','alokasi','cost center','analisis'] },
    { method: 'Value Engineering',            reason: 'Mengoptimalkan fungsi produk dan proses dengan biaya lebih rendah',                   keywords: ['desain','fungsi','optimasi','engineering','value','spesifikasi'] },
    { method: 'Kaizen Costing',               reason: 'Penurunan biaya bertahap melalui perbaikan proses berkelanjutan',                    keywords: ['biaya','penurunan','bertahap','proses','efisiensi','cost reduction'] },
    { method: 'Manajemen Rantai Pasok (SCM)', reason: 'Mengoptimalkan pengadaan dan logistik untuk menekan biaya operasional',              keywords: ['supplier','pengadaan','logistik','bahan baku','procurement','rantai pasok','harga'] },
    { method: 'Anggaran & Cost Control',      reason: 'Pengendalian anggaran operasional secara disiplin untuk mencapai target efisiensi',   keywords: ['anggaran','budget','pengeluaran','kontrol','keuangan','efisiensi','hemat'] },
  ],
  delivery: [
    { method: 'JIT (Just-In-Time)',           reason: 'Memproduksi dan mengirim sesuai permintaan untuk mempersingkat lead time',           keywords: ['pengiriman','delivery','lead time','terlambat','tepat waktu','order','jadwal'] },
    { method: 'Lean Manufacturing',           reason: 'Mengurangi waktu tunggu dan work-in-process inventory di lini',                      keywords: ['waktu','tunggu','antrian','wip','inventory','proses','aliran'] },
    { method: 'Supply Chain Management',      reason: 'Mengoptimalkan alur material dari supplier hingga ke pelanggan',                      keywords: ['supplier','material','bahan','logistik','pengiriman','stok','rantai'] },
    { method: 'S&OP (Sales & Operations Planning)', reason: 'Sinkronisasi perencanaan produksi dengan permintaan pasar',                    keywords: ['perencanaan','forecast','produksi','penjualan','sinkron','demand','rencana'] },
    { method: 'Manajemen Pergudangan',        reason: 'Optimalisasi sistem gudang dan picking untuk mempercepat proses pengiriman',          keywords: ['gudang','warehouse','picking','stok','penyimpanan','FIFO','inventori'] },
  ],
  safety: [
    { method: 'SMK3 (Sistem Manajemen K3)',   reason: 'Menerapkan sistem manajemen K3 sesuai standar nasional PP 50/2012',                  keywords: ['k3','keselamatan','smk3','kesehatan','kerja','sertifikasi','sistem','standar'] },
    { method: 'HIRADC / IBPR',                reason: 'Identifikasi bahaya, penilaian risiko, dan pengendalian K3 di tempat kerja',          keywords: ['bahaya','risiko','hazard','identifikasi','penilaian','kecelakaan','insiden'] },
    { method: 'Behavior-Based Safety (BBS)',  reason: 'Mengubah perilaku kerja tidak aman melalui observasi dan coaching',                  keywords: ['perilaku','behavior','tidak aman','unsafe','observasi','kebiasaan','budaya'] },
    { method: '5S / 5R',                      reason: 'Menciptakan tempat kerja yang aman, rapi, dan terkendali',                           keywords: ['5s','5r','rapi','bersih','area','tempat kerja','housekeeping','tata letak'] },
    { method: 'APD & Prosedur K3',            reason: 'Standarisasi penggunaan APD dan prosedur keselamatan di seluruh area kerja',         keywords: ['apd','helm','sarung tangan','masker','prosedur','SOP','perlindungan'] },
  ],
  morale: [
    { method: 'Knowledge Management',         reason: 'Mengelola dan mentransfer pengetahuan agar kompetensi tersebar merata',              keywords: ['pengetahuan','knowledge','kompetensi','skill','transfer','dokumentasi','pelatihan'] },
    { method: 'Competency-Based HR',          reason: 'Mengembangkan kompetensi karyawan sesuai kebutuhan jabatan dan target organisasi',   keywords: ['kompetensi','jabatan','hr','sdm','sertifikasi','pengembangan','karir'] },
    { method: 'Kaizen / Suggestion System',   reason: 'Melibatkan karyawan dalam perbaikan melalui sistem saran dan reward inovasi',        keywords: ['saran','ide','inovasi','karyawan','keterlibatan','partisipasi','reward'] },
    { method: 'Performance Management System', reason: 'Menghubungkan kinerja individu dengan target organisasi secara transparan',         keywords: ['kinerja','target','penilaian','KPI','review','performance','evaluasi'] },
    { method: 'Employee Engagement Program',  reason: 'Meningkatkan keterlibatan dan motivasi karyawan untuk mengurangi turnover',          keywords: ['motivasi','turnover','absensi','engagement','loyalitas','kepuasan','retensi'] },
    { method: 'Pelatihan & Pengembangan SDM', reason: 'Program pelatihan terstruktur untuk meningkatkan keterampilan teknis dan soft skill', keywords: ['pelatihan','training','workshop','upskilling','reskilling','keterampilan','belajar'] },
  ],
}

/**
 * Auto-generate rekomendasi metode berdasarkan dimensi PQCDSM DAN teks masalah.
 *
 * Algoritma:
 * 1. Ambil semua metode untuk dimensi yang dipilih
 * 2. Hitung skor relevansi tiap metode berdasarkan kecocokan keyword dengan teks masalah
 * 3. Urutkan dari skor tertinggi ke terendah
 * 4. Kembalikan top 5 metode yang paling relevan
 *
 * @param dimension - dimensi PQCDSM yang dipilih
 * @param problemText - teks masalah dari charter atau input manual (opsional)
 */
export function autoRecommendMethods(
  dimension: string,
  problemText?: string
): Array<{ method: string; reason: string; priority: number }> {
  const methods = METHOD_RECOMMENDATIONS[dimension] || METHOD_RECOMMENDATIONS['productivity']

  if (!problemText || problemText.trim().length < 10) {
    // Jika tidak ada teks masalah, kembalikan urutan default
    return methods.slice(0, 5).map((m, idx) => ({ method: m.method, reason: m.reason, priority: idx + 1 }))
  }

  // Normalisasi teks masalah untuk pencocokan
  const lowerText = problemText.toLowerCase()

  // Hitung skor relevansi tiap metode
  const scored = methods.map((m) => {
    const score = m.keywords.reduce((acc, kw) => {
      // Skor lebih tinggi jika keyword muncul lebih dari sekali
      const count = (lowerText.split(kw.toLowerCase()).length - 1)
      return acc + count
    }, 0)
    return { ...m, score }
  })

  // Urutkan: skor relevansi tertinggi dulu, lalu urutan default sebagai tiebreaker
  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, 5).map((m, idx) => ({
    method: m.method,
    reason: m.reason,
    priority: idx + 1,
  }))
}

export async function getMeasureProblems(projectId: string): Promise<MeasureProblem[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb
      .from('measure_problems')
      .select('*')
      .eq('project_id', projectId)
      .order('priority_rank', { ascending: true })
    if (error) throw error
    return (data || []).map((d: any) => ({
      id: d.id,
      project_id: d.project_id,
      problem_text: d.problem_text,
      source: d.source || 'manual',
      pqcdsm_dimension: d.pqcdsm_dimension,
      recommended_methods: d.recommended_methods || [],
      dimension_reason: d.notes || '',   // notes kolom dipakai simpan dimension_reason
      impact: d.impact,
      priority_rank: d.priority_rank,
      // Flag apakah data ini sudah dari Gemini AI (bukan keyword matching lama)
      // Ditandai dari notes field yang berisi dimension_reason (AI selalu isi ini)
      ai_analyzed: !!(d.notes && d.notes.length > 0),
    })) as MeasureProblem[]
  } catch (err) {
    console.warn('[getMeasureProblems] fallback to localStorage:', err)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`sibimkon_measure_problems_${projectId}`)
      return saved ? JSON.parse(saved) : []
    }
    return []
  }
}

export async function saveMeasureProblems(projectId: string, problems: MeasureProblem[]): Promise<void> {
  // localStorage dulu sebagai fallback
  if (typeof window !== 'undefined') {
    localStorage.setItem(`sibimkon_measure_problems_${projectId}`, JSON.stringify(problems))
  }
  try {
    const sb = getSupabase()
    if (!sb) return
    // Delete semua lalu re-insert (sederhana, cocok untuk jumlah masalah yang kecil)
    await sb.from('measure_problems').delete().eq('project_id', projectId)
    if (problems.length > 0) {
      const rows = problems.map((p) => ({
        project_id: projectId,
        problem_text: p.problem_text,
        source: p.source,
        pqcdsm_dimension: p.pqcdsm_dimension,
        recommended_methods: p.recommended_methods,
        impact: p.impact || null,
        priority_rank: p.priority_rank,
        // Simpan dimension_reason di kolom notes sebagai penanda data dari AI
        notes: (p as any).dimension_reason || p.notes || null,
      }))
      const { error } = await sb.from('measure_problems').insert(rows)
      if (error) throw error
    }
  } catch (err) {
    console.warn('[saveMeasureProblems] Supabase failed, localStorage only:', err)
  }
}

// ── ANALYZE: Kebutuhan Implementasi ──────────────────────────────────────────

export async function getAnalyzeNeeds(projectId: string): Promise<AnalyzeNeed[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb
      .from('analyze_needs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map((d: any) => ({
      id: d.id,
      project_id: d.project_id,
      method_name: d.method_name,
      pqcdsm_dimension: d.pqcdsm_dimension,
      need_category: d.need_category,
      need_item: d.need_item,
      quantity: d.quantity,
      estimated_cost: d.estimated_cost != null ? Number(d.estimated_cost) : undefined,
      responsible: d.responsible,
      notes: d.notes,
      is_available: Boolean(d.is_available),
    })) as AnalyzeNeed[]
  } catch (err) {
    console.warn('[getAnalyzeNeeds] fallback to localStorage:', err)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`sibimkon_analyze_needs_${projectId}`)
      return saved ? JSON.parse(saved) : []
    }
    return []
  }
}

export async function saveAnalyzeNeeds(projectId: string, needs: AnalyzeNeed[]): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`sibimkon_analyze_needs_${projectId}`, JSON.stringify(needs))
  }
  try {
    const sb = getSupabase()
    if (!sb) return
    await sb.from('analyze_needs').delete().eq('project_id', projectId)
    if (needs.length > 0) {
      const rows = needs.map((n) => ({
        project_id: projectId,
        method_name: n.method_name,
        pqcdsm_dimension: n.pqcdsm_dimension || null,
        need_category: n.need_category,
        need_item: n.need_item,
        quantity: n.quantity || null,
        estimated_cost: n.estimated_cost != null ? n.estimated_cost : null,
        responsible: n.responsible || null,
        notes: n.notes || null,
        is_available: n.is_available,
      }))
      const { error } = await sb.from('analyze_needs').insert(rows)
      if (error) throw error
    }
  } catch (err) {
    console.warn('[saveAnalyzeNeeds] Supabase failed, localStorage only:', err)
  }
}

// ── IMPROVE: Bukti dengan status verifikasi ───────────────────────────────────

export async function getEvidenceItems(projectId: string, actionPlanId?: string): Promise<EvidenceItem[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    let q = sb.from('action_evidence').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    if (actionPlanId) q = q.eq('action_id', actionPlanId)
    const { data, error } = await q
    if (error) throw error
    return (data || []).map((d: any) => ({
      id: d.id,
      project_id: d.project_id,
      action_plan_id: d.action_id,
      action_title: d.title,
      file_name: d.file_name,
      file_url: d.file_url,
      kpi_submitted_value: d.kpi_actual_value != null ? Number(d.kpi_actual_value) : undefined,
      kpi_unit: d.kpi_unit,
      evidence_status: d.evidence_status || 'pending',
      reviewer_id: d.reviewer_id,
      reviewed_at: d.reviewed_at,
      reviewer_notes: d.reviewer_notes,
      uploaded_by_id: d.uploaded_by,
      uploaded_at: d.created_at,
    })) as EvidenceItem[]
  } catch (err) {
    console.warn('[getEvidenceItems] fallback to localStorage:', err)
    if (typeof window === 'undefined') return []
    const all: EvidenceItem[] = JSON.parse(localStorage.getItem(`sibimkon_evidence_${projectId}`) || '[]')
    return actionPlanId ? all.filter((e) => e.action_plan_id === actionPlanId) : all
  }
}

/** Perusahaan upload bukti — status otomatis 'pending' */
export async function submitEvidence(
  projectId: string,
  record: {
    action_plan_id: string
    action_title?: string
    file_name: string
    file_url: string
    kpi_submitted_value?: number
    kpi_unit?: string
    uploaded_by_id?: string
    uploaded_by_name?: string
    uploaded_by_role?: string
  }
): Promise<EvidenceItem> {
  const newItem: EvidenceItem = {
    id: 'ev-' + Math.random().toString(36).substr(2, 9),
    project_id: projectId,
    action_plan_id: record.action_plan_id,
    action_title: record.action_title,
    file_name: record.file_name,
    file_url: record.file_url,
    kpi_submitted_value: record.kpi_submitted_value,
    kpi_unit: record.kpi_unit,
    evidence_status: 'pending',
    uploaded_by_id: record.uploaded_by_id,
    uploaded_by_name: record.uploaded_by_name,
    uploaded_by_role: record.uploaded_by_role,
    uploaded_at: new Date().toISOString(),
  }

  // Simpan ke localStorage
  if (typeof window !== 'undefined') {
    const key = `sibimkon_evidence_${projectId}`
    const existing: EvidenceItem[] = JSON.parse(localStorage.getItem(key) || '[]')
    existing.unshift(newItem)
    localStorage.setItem(key, JSON.stringify(existing))
  }

  // Simpan ke Supabase
  try {
    const sb = getSupabase()
    if (sb) {
      const { data, error } = await sb.from('action_evidence').insert({
        project_id: projectId,
        action_id: record.action_plan_id,
        evidence_type: 'document',
        title: record.action_title,
        file_name: record.file_name,
        file_url: record.file_url,
        kpi_actual_value: record.kpi_submitted_value ?? null,
        kpi_unit: record.kpi_unit ?? null,
        uploaded_by: record.uploaded_by_id ?? null,
        evidence_status: 'pending',
      }).select('id').single()
      if (!error && data?.id) newItem.id = data.id
    }
  } catch (err) {
    console.warn('[submitEvidence] Supabase failed, localStorage only:', err)
  }

  return newItem
}

/**
 * Konsultan verifikasi bukti + input nilai KPI aktual.
 * Mengupdate action_evidence.evidence_status → 'verified'
 * dan improve_actions.verified_kpi_actual.
 */
export async function verifyEvidence(
  projectId: string,
  evidenceId: string,
  actionPlanId: string,
  verifiedKpiActual: number,
  reviewerNotes: string,
  reviewerId: string,
  status: 'verified' | 'rejected' = 'verified'
): Promise<void> {
  const now = new Date().toISOString()

  // Update localStorage: evidence
  if (typeof window !== 'undefined') {
    const key = `sibimkon_evidence_${projectId}`
    const existing: EvidenceItem[] = JSON.parse(localStorage.getItem(key) || '[]')
    const updated = existing.map((e) =>
      e.id === evidenceId
        ? { ...e, evidence_status: status, reviewer_id: reviewerId, reviewed_at: now, reviewer_notes: reviewerNotes }
        : e
    )
    localStorage.setItem(key, JSON.stringify(updated))

    // Update localStorage: action plans
    const plansKey = `sibimkon_actionPlans`
    const allPlans: Record<string, ActionPlan[]> = JSON.parse(localStorage.getItem(plansKey) || '{}')
    if (allPlans[projectId] && status === 'verified') {
      allPlans[projectId] = allPlans[projectId].map((a) =>
        a.id === actionPlanId
          ? { ...a, verified_kpi_actual: verifiedKpiActual, kpi_actual: verifiedKpiActual, verified_by: reviewerId, verified_at: now }
          : a
      )
      localStorage.setItem(plansKey, JSON.stringify(allPlans))
    }
  }

  // Update Supabase
  try {
    const sb = getSupabase()
    if (!sb) return

    // Update evidence status
    const { error: evErr } = await sb.from('action_evidence').update({
      evidence_status: status,
      reviewer_id: reviewerId,
      reviewed_at: now,
      reviewer_notes: reviewerNotes,
    }).eq('id', evidenceId)
    if (evErr) throw evErr

    // Update action plan dengan nilai aktual terverifikasi
    if (status === 'verified') {
      const { error: actErr } = await sb.from('improve_actions').update({
        verified_kpi_actual: verifiedKpiActual,
        kpi_actual: verifiedKpiActual,
        verified_by: reviewerId,
        verified_at: now,
      }).eq('id', actionPlanId)
      if (actErr) throw actErr
    }
  } catch (err) {
    console.warn('[verifyEvidence] Supabase failed, localStorage only:', err)
  }
}

// ── CONTROL: Catatan Konsultan ────────────────────────────────────────────────

export async function getConsultantNotes(projectId: string): Promise<ConsultantControlNote[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb
      .from('consultant_control_notes')
      .select('*, profiles(full_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map((d: any) => ({
      id: d.id,
      project_id: d.project_id,
      action_plan_id: d.action_plan_id,
      note_text: d.note_text,
      note_type: d.note_type || 'general',
      is_visible_to_company: Boolean(d.is_visible_to_company),
      created_by: d.created_by,
      created_by_name: d.profiles?.full_name || 'Konsultan',
      created_at: d.created_at,
    })) as ConsultantControlNote[]
  } catch (err) {
    console.warn('[getConsultantNotes] fallback to localStorage:', err)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`sibimkon_consultant_notes_${projectId}`)
      return saved ? JSON.parse(saved) : []
    }
    return []
  }
}

export async function saveConsultantNote(
  projectId: string,
  note: Omit<ConsultantControlNote, 'id' | 'created_at'>
): Promise<ConsultantControlNote> {
  const newNote: ConsultantControlNote = {
    ...note,
    id: 'note-' + Math.random().toString(36).substr(2, 9),
    created_at: new Date().toISOString(),
  }

  // Simpan ke localStorage
  if (typeof window !== 'undefined') {
    const key = `sibimkon_consultant_notes_${projectId}`
    const existing: ConsultantControlNote[] = JSON.parse(localStorage.getItem(key) || '[]')
    existing.unshift(newNote)
    localStorage.setItem(key, JSON.stringify(existing))
  }

  // Simpan ke Supabase
  try {
    const sb = getSupabase()
    if (sb) {
      const { data, error } = await sb.from('consultant_control_notes').insert({
        project_id: projectId,
        action_plan_id: note.action_plan_id || null,
        note_text: note.note_text,
        note_type: note.note_type,
        is_visible_to_company: note.is_visible_to_company,
        created_by: note.created_by || null,
      }).select('id').single()
      if (!error && data?.id) newNote.id = data.id
    }
  } catch (err) {
    console.warn('[saveConsultantNote] Supabase failed, localStorage only:', err)
  }

  return newNote
}

export async function deleteConsultantNote(projectId: string, noteId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    const key = `sibimkon_consultant_notes_${projectId}`
    const existing: ConsultantControlNote[] = JSON.parse(localStorage.getItem(key) || '[]')
    localStorage.setItem(key, JSON.stringify(existing.filter((n) => n.id !== noteId)))
  }
  try {
    const sb = getSupabase()
    if (sb) {
      const { error } = await sb.from('consultant_control_notes').delete().eq('id', noteId)
      if (error) throw error
    }
  } catch (err) {
    console.warn('[deleteConsultantNote] Supabase failed, localStorage only:', err)
  }
}
