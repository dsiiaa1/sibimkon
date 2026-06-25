'use client'

import { createClient } from './supabase/client'
import { getMockDB, updateMockDB, Project, Company, ProjectCharter, Assessment, FishboneNode, WhyNode, ActionPlan } from './mockData'

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
        responses: { questions: assess.responses }
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
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('measure_vom').select('*')
      .eq('project_id', projectId).order('priority', { ascending: true })
    if (error) throw error
    return data || []
  } catch (err) {
    console.warn('[getVom] failed:', err)
    return []
  }
}

export async function saveVom(projectId: string, vomList: any[]): Promise<void> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { error: delErr } = await sb.from('measure_vom').delete().eq('project_id', projectId)
    if (delErr) throw delErr
    if (vomList.length > 0) {
      const rows = vomList.map((v) => {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.id)
        return { id: isUUID ? v.id : undefined, project_id: projectId, dimension: v.dimension, problem: v.problem, impact: v.impact, priority: v.priority }
      })
      const { error: insErr } = await sb.from('measure_vom').insert(rows)
      if (insErr) throw insErr
    }
    console.log('[saveVom] saved', vomList.length, 'items')
  } catch (err) {
    console.warn('[saveVom] failed:', err)
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
  if (!sb) throw new Error('Supabase client tidak tersedia')

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
    return (data?.items as any[]) || []
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
    if (!data) return null
    return { people: Number(data.people_score || 70), process: Number(data.process_score || 65), system: Number(data.system_score || 60), result: Number(data.result_score || 75) }
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
    const { error } = await sb.from('evidence_files').insert({
      project_id: projectId, action_plan_id: record.action_plan_id, action_title: record.action_title,
      file_name: record.file_name, file_url: record.file_url,
      kpi_actual_value: record.kpi_actual_value, kpi_unit: record.kpi_unit,
      uploaded_by_id: record.uploaded_by_id || null, uploaded_by_name: record.uploaded_by_name,
      uploaded_by_role: record.uploaded_by_role, uploaded_at: new Date().toISOString(),
    })
    if (error) console.warn('[saveEvidenceRecord] Supabase error (non-critical):', error.message)
  } catch (err) { console.warn('[saveEvidenceRecord] failed, localStorage only:', err) }
}

export async function getEvidenceRecords(projectId: string, actionPlanId?: string): Promise<EvidenceRecord[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    let q = sb.from('evidence_files').select('*').eq('project_id', projectId).order('uploaded_at', { ascending: false })
    if (actionPlanId) q = q.eq('action_plan_id', actionPlanId)
    const { data, error } = await q
    if (error) throw error
    return (data || []).map((d: any) => ({
      id: d.id, action_plan_id: d.action_plan_id, action_title: d.action_title,
      file_name: d.file_name, file_url: d.file_url, kpi_actual_value: d.kpi_actual_value,
      kpi_unit: d.kpi_unit, uploaded_by_id: d.uploaded_by_id, uploaded_by_name: d.uploaded_by_name,
      uploaded_by_role: d.uploaded_by_role, uploaded_at: d.uploaded_at,
    }))
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
