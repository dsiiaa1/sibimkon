'use client'

import { createClient } from './supabase/client'
import { getMockDB, updateMockDB, Project, Company, ProjectCharter, Assessment, ActionPlan, MeasureProblem, AnalyzeNeed, EvidenceItem, ConsultantControlNote, MeasureDataRequirement, AnalyzeResult } from './mockData'

function handleDbError(error: any): never {
  console.error('[DB Error]', error)
  if (typeof window !== 'undefined') {
    alert(`Gagal menyimpan ke database Supabase:\n${error.message || JSON.stringify(error)}\n\n(Pastikan struktur tabel dan RLS di Supabase sudah sesuai)`)
  }
  throw error
}

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
    if (error) handleDbError(error)
    return (data || []).map((p: any) => ({
      id: p.id, project_code: p.project_code, title: p.title,
      description: p.description, company_id: p.company_id,
      company_name: p.companies?.name || 'Unknown', consultant_id: p.consultant_id,
      status: p.status, start_date: p.start_date, target_end_date: p.target_end_date,
      baseline_score: Number(p.baseline_productivity_index || 0),
      baseline_reasoning: p.baseline_reasoning,
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
    const newProjectCode = `BK-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`

    const { data, error } = await sb.from('bimkon_projects').insert({
      project_code: newProjectCode,
      title: project.title, description: project.description,
      company_id: project.company_id, consultant_id: project.consultant_id,
      status: project.status, start_date: project.start_date,
      target_end_date: project.target_end_date, current_phase: 'define'
    }).select('*, companies(name)').single()
    if (error) handleDbError(error)
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
    if (error) handleDbError(error)
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
    if (error) handleDbError(error)
    return { ...data }
  } catch (err) {
    const newCompany: Company = { ...company, id: 'comp-' + Math.random().toString(36).substr(2, 9) }
    const db = getMockDB()
    updateMockDB('companies', [...db.companies, newCompany])
    return newCompany
  }
}

export async function updateCompany(companyId: string, fields: Partial<Company> & Record<string, any>): Promise<void> {
  const db = getMockDB()
  updateMockDB('companies', db.companies.map((c: Company) => c.id === companyId ? { ...c, ...fields } : c))
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
  if (error) handleDbError(error)
}

// ── DEFINE: Project Charter ───────────────────────────────────────────────────

export async function getProjectCharter(projectId: string): Promise<ProjectCharter | null> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('project_charters').select('*').eq('project_id', projectId).maybeSingle()
    if (error) handleDbError(error)
    return data
  } catch (err) {
    console.warn('[getProjectCharter] fallback to mockDB:', err)
    return getMockDB().charters[projectId] || null
  }
}

export async function saveProjectCharter(charter: ProjectCharter): Promise<void> {
  const db = getMockDB()
  db.charters[charter.project_id] = charter
  updateMockDB('charters', db.charters)

  const sb = getSupabase()
  if (!sb) return

  const { error } = await sb.from('project_charters').upsert({
    project_id: charter.project_id, problem_statement: charter.problem_statement,
    objectives: charter.objectives, productivity_target: charter.productivity_target,
    scope: charter.scope, team_members: charter.team_members,
    measure_summary: charter.measure_summary ?? null
  }, { onConflict: 'project_id' })
  if (error) handleDbError(error)
}

// ── MEASURE: Assessments ──────────────────────────────────────────────────────

export async function getAssessments(projectId: string): Promise<Assessment[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('measure_assessments').select('*').eq('project_id', projectId)
    if (error) handleDbError(error)
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
  
  const sb = getSupabase()
  if (!sb) return
  
  for (const assess of assessments) {
    const { error } = await sb.from('measure_assessments').upsert({
      project_id: projectId, dimension: assess.dimension,
      percentage_score: assess.percentage_score,
      responses: { questions: assess.responses },
      assessment_version: 1
    }, { onConflict: 'project_id,dimension,assessment_version' })
    if (error) handleDbError(error)
  }
  const avgIndex = Math.round(assessments.reduce((a, c) => a + c.percentage_score, 0) / assessments.length)
  const { data: existing } = await sb.from('bimkon_projects')
    .select('baseline_productivity_index').eq('id', projectId).maybeSingle()
  const baseline = existing?.baseline_productivity_index ? Number(existing.baseline_productivity_index) : avgIndex
  
  const { error: updErr } = await sb.from('bimkon_projects').update({
    baseline_productivity_index: baseline,
    current_productivity_index: avgIndex,
    updated_at: new Date().toISOString()
  }).eq('id', projectId)
  
  if (updErr) handleDbError(updErr)
}

export async function updateProjectBaseline(projectId: string, baselineScore: number, baselineReasoning: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  
  const { error: updErr } = await sb.from('bimkon_projects').update({
    baseline_productivity_index: baselineScore,
    baseline_reasoning: baselineReasoning,
    updated_at: new Date().toISOString()
  }).eq('id', projectId)
  
  if (updErr) handleDbError(updErr)
}

// ── MEASURE: Data Requirements (NEW) ──────────────────────────────────────────

/** Helper: cek apakah string adalah UUID v4 valid (untuk filter mockup ID) */
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export async function getMeasureDataRequirements(projectId: string): Promise<MeasureDataRequirement[]> {
  // Skip Supabase query entirely for mockup project IDs (not valid UUID)
  if (!isValidUUID(projectId)) {
    return getMockDB().measureDataReqs[projectId] || []
  }

  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('measure_data_requirements').select('*').eq('project_id', projectId).order('created_at', { ascending: true })
    if (error) throw error
    // Map DB column data_group → group in TypeScript
    return (data || []).map((row: any) => ({
      ...row,
      group: row.data_group ?? row.group ?? 'context',
    })) as MeasureDataRequirement[]
  } catch (err) {
    console.warn('[getMeasureDataRequirements] fallback to mockDB:', err)
    return getMockDB().measureDataReqs[projectId] || []
  }
}

export async function saveMeasureDataRequirements(projectId: string, reqs: MeasureDataRequirement[]): Promise<MeasureDataRequirement[]> {
  const db = getMockDB()
  db.measureDataReqs[projectId] = reqs
  updateMockDB('measureDataReqs', db.measureDataReqs)

  // Skip Supabase entirely for mockup project IDs
  if (!isValidUUID(projectId)) return reqs

  const sb = getSupabase()
  if (!sb) return reqs

  try {
    // 1. Delete all existing rows for this project
    await sb.from('measure_data_requirements').delete().eq('project_id', projectId)

    if (reqs.length === 0) return reqs

    // 2. Insert fresh rows (let Supabase generate UUIDs for non-UUID IDs)
    const rows = reqs.map(r => ({
      ...(isValidUUID(r.id) ? { id: r.id } : {}),
      project_id: projectId,
      name: r.name,
      description: r.description,
      reason: r.reason,
      expected_format: r.expected_format,
      example_columns: r.example_columns,
      status: r.status,
      parsed_summary: r.parsed_summary ?? null,
      recommended_methods: r.recommended_methods ?? null,
      source: r.source,
      file_url: r.file_url ?? null,
      data_group: r.group ?? 'context',
      role_note: r.role_note ?? null,
    }))

    const { data: inserted, error } = await sb
      .from('measure_data_requirements')
      .insert(rows)
      .select()

    if (error) {
      console.warn('[saveMeasureDataRequirements] insert error:', error)
      return reqs
    }

    // 3. Merge Supabase-generated UUIDs back into local data
    if (inserted && inserted.length === reqs.length) {
      const synced = reqs.map((r, i) => ({
        ...r,
        id: inserted[i].id,
        project_id: inserted[i].project_id,
      }))
      // Update localStorage with synced IDs
      db.measureDataReqs[projectId] = synced
      updateMockDB('measureDataReqs', db.measureDataReqs)
      return synced
    }
    return reqs
  } catch (err: any) {
    console.warn('[saveMeasureDataRequirements] Supabase error (data tetap tersimpan di localStorage):', err)
    return reqs
  }
}

// ── MEASURE: VOM ──────────────────────────────────────────────────────────────

export async function getVom(projectId: string): Promise<any[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('measure_vom').select('*')
      .eq('project_id', projectId).order('priority', { ascending: true })
    if (error) handleDbError(error)
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
  if (typeof window !== 'undefined') {
    localStorage.setItem(`sibimkon_vom_${projectId}`, JSON.stringify(vomList))
  }
  const sb = getSupabase()
  if (!sb) return
  const { error: delErr } = await sb.from('measure_vom').delete().eq('project_id', projectId)
  if (delErr) handleDbError(delErr)
  if (vomList.length > 0) {
    const rows = vomList.map((v) => ({
      project_id: projectId, dimension: v.dimension, problem: v.problem, impact: v.impact, priority: v.priority
    }))
    const { error: insErr } = await sb.from('measure_vom').insert(rows)
    if (insErr) handleDbError(insErr)
  }
}


// ── IMPROVE: Action Plans ─────────────────────────────────────────────────────

export async function getActionPlans(projectId: string): Promise<ActionPlan[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')

    // Try with steps join first, fallback to without steps if table not ready
    let data: any[] | null = null
    let hasSteps = true
    const { data: d1, error: e1 } = await sb.from('improve_actions')
      .select('*, steps:action_plan_steps(*)')
      .eq('project_id', projectId)
    if (e1) {
      // Fallback: query without steps join
      hasSteps = false
      const { data: d2, error: e2 } = await sb.from('improve_actions')
        .select('*')
        .eq('project_id', projectId)
      if (e2) handleDbError(e2)
      data = d2
    } else {
      data = d1
    }

    return (data || []).map((d: any) => ({
      id: d.id, project_id: d.project_id, problem_title: d.problem_title, title: d.action_title,
      description: d.description, methodology: d.methodology, dimension: d.dimension,
      kpi_name: d.kpi_name, kpi_baseline: Number(d.kpi_baseline || 0),
      kpi_target: Number(d.kpi_target || 0), kpi_unit: d.kpi_unit,
      kpi_actual: d.kpi_actual != null ? Number(d.kpi_actual) : undefined,
      verified_kpi_actual: d.verified_kpi_actual != null ? Number(d.verified_kpi_actual) : undefined,
      verified_by: d.verified_by, verified_at: d.verified_at,
      cost_saving_manual: d.cost_saving_manual != null ? Number(d.cost_saving_manual) : undefined,
      investment_manual: d.investment_manual != null ? Number(d.investment_manual) : undefined,
      pic_name: d.pic_name, start_date: d.start_date,
      end_date: d.end_date, status: d.status, progress_percentage: d.progress_percentage,
      ai_analysis: typeof d.ai_analysis === 'string' ? JSON.parse(d.ai_analysis) : d.ai_analysis,
      steps: hasSteps ? (d.steps || []) : []
    }))
  } catch (err) {
    console.warn('[getActionPlans] fallback to mockDB:', err)
    return getMockDB().actionPlans[projectId] || []
  }
}

export async function saveActionPlans(projectId: string, actions: ActionPlan[]): Promise<void> {
  const db = getMockDB(); db.actionPlans[projectId] = actions; updateMockDB('actionPlans', db.actionPlans)
  const sb = getSupabase()
  if (!sb) return

  const { data: existing, error: fetchErr } = await sb.from('improve_actions').select('id').eq('project_id', projectId)
  if (fetchErr) throw fetchErr
  const existingIds = new Set((existing || []).map((e: any) => e.id))
  const incomingIds = new Set(actions.map(a => a.id))

  const toDelete = [...existingIds].filter(id => !incomingIds.has(id))
  if (toDelete.length > 0) {
    const { error } = await sb.from('improve_actions').delete().in('id', toDelete)
    if (error) handleDbError(error)
  }
  if (actions.length === 0) return
  const toUpdate = actions.filter(a => existingIds.has(a.id))
  const toInsert = actions.filter(a => !existingIds.has(a.id))
  for (const act of toUpdate) {
    const { error } = await sb.from('improve_actions').update({
      action_title: act.title, description: act.description,
      methodology: act.methodology, dimension: act.dimension, kpi_name: act.kpi_name,
      kpi_baseline: act.kpi_baseline, kpi_target: act.kpi_target, kpi_unit: act.kpi_unit,
      kpi_actual: act.kpi_actual != null ? act.kpi_actual : null,
      verified_kpi_actual: act.verified_kpi_actual != null ? act.verified_kpi_actual : null,
      verified_by: act.verified_by, verified_at: act.verified_at,
      cost_saving_manual: act.cost_saving_manual != null ? act.cost_saving_manual : null,
      investment_manual: act.investment_manual != null ? act.investment_manual : null,
      pic_name: act.pic_name, problem_title: act.problem_title || null,
      start_date: act.start_date, end_date: act.end_date,
      status: act.status, progress_percentage: act.progress_percentage,
      ai_analysis: act.ai_analysis ? JSON.stringify(act.ai_analysis) : null
    }).eq('id', act.id)
    if (error) handleDbError(error)
  }
  if (toInsert.length > 0) {
    const rows = toInsert.map(act => ({
      id: act.id, project_id: projectId, action_title: act.title, description: act.description,
      methodology: act.methodology, dimension: act.dimension, kpi_name: act.kpi_name,
      kpi_baseline: act.kpi_baseline, kpi_target: act.kpi_target, kpi_unit: act.kpi_unit,
      kpi_actual: act.kpi_actual != null ? act.kpi_actual : null,
      verified_kpi_actual: act.verified_kpi_actual != null ? act.verified_kpi_actual : null,
      verified_by: act.verified_by, verified_at: act.verified_at,
      cost_saving_manual: act.cost_saving_manual != null ? act.cost_saving_manual : null,
      investment_manual: act.investment_manual != null ? act.investment_manual : null,
      pic_name: act.pic_name, problem_title: act.problem_title || null,
      start_date: act.start_date, end_date: act.end_date,
      status: act.status, progress_percentage: act.progress_percentage,
      ai_analysis: act.ai_analysis ? JSON.stringify(act.ai_analysis) : null
    }))
    const { error } = await sb.from('improve_actions').insert(rows)
    if (error) handleDbError(error)
  }

  // Handle steps (graceful — don't block main save if table not ready)
  const allSteps = actions.flatMap(a => (a.steps || []).map(s => ({ ...s, action_plan_id: a.id })))
  if (allSteps.length > 0) {
    try {
      const { error } = await sb.from('action_plan_steps').upsert(
        allSteps.map((s, idx) => ({
          id: s.id,
          action_plan_id: s.action_plan_id,
          description: s.action || s.description || 'Langkah',
          is_completed: s.is_completed,
          pic: s.pic || null,
          step_order: idx
        })),
        { onConflict: 'id' }
      )
      if (error) console.warn('[saveActionPlans] steps upsert error (non-fatal):', error.message)
    } catch (err: any) {
      console.warn('[saveActionPlans] steps upsert failed (non-fatal):', err.message)
    }
  }
}

// ── CONTROL: Audit Checklist ──────────────────────────────────────────────────

export async function getControlAudit(projectId: string): Promise<any[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('audit_checklists').select('items')
      .eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) handleDbError(error)
    if (data?.items && (data.items as any[]).length > 0) {
      return data.items as any[]
    }
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
  const sb = getSupabase()
  if (!sb) return
  const compliant = items.filter((i: any) => i.completed).length
  const pct = items.length > 0 ? Math.round((compliant / items.length) * 100) : 0
  const { data: existing } = await sb.from('audit_checklists').select('id').eq('project_id', projectId).limit(1).maybeSingle()
  if (existing?.id) {
    const { error } = await sb.from('audit_checklists').update({ items, total_items: items.length, compliant_items: compliant, compliance_percentage: pct, updated_at: new Date().toISOString() }).eq('id', existing.id)
    if (error) handleDbError(error)
  } else {
    const { error } = await sb.from('audit_checklists').insert({ project_id: projectId, category: 'General', items, total_items: items.length, compliant_items: compliant, compliance_percentage: pct })
    if (error) handleDbError(error)
  }
}

// ── CONTROL: PSI ──────────────────────────────────────────────────────────────

export async function getControlPsi(projectId: string): Promise<{ people: number; process: number; system: number; result: number, people_notes?: string, process_notes?: string, system_notes?: string, result_notes?: string } | null> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('sustainability_assessments')
      .select('people_score, process_score, system_score, result_score, people_notes, process_notes, system_notes, result_notes').eq('project_id', projectId).maybeSingle()
    if (error) handleDbError(error)
    if (data) {
      return { 
        people: Number(data.people_score || 70), process: Number(data.process_score || 65), system: Number(data.system_score || 60), result: Number(data.result_score || 75),
        people_notes: data.people_notes || '', process_notes: data.process_notes || '', system_notes: data.system_notes || '', result_notes: data.result_notes || ''
      }
    }
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`sibimkon_psi_${projectId}`) : null
    return saved ? JSON.parse(saved) : null
  } catch (err) {
    console.warn('[getControlPsi] fallback to localStorage:', err)
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`sibimkon_psi_${projectId}`) : null
    return saved ? JSON.parse(saved) : null
  }
}

export async function saveControlPsi(projectId: string, psi: { people: number; process: number; system: number; result: number, people_notes?: string, process_notes?: string, system_notes?: string, result_notes?: string }): Promise<void> {
  if (typeof window !== 'undefined') localStorage.setItem(`sibimkon_psi_${projectId}`, JSON.stringify(psi))
  const sb = getSupabase()
  if (!sb) return
  const psiTotal = Math.round((psi.people + psi.process + psi.system + psi.result) / 4)
  const { error } = await sb.from('sustainability_assessments').upsert({
    project_id: projectId, people_score: psi.people, process_score: psi.process,
    system_score: psi.system, result_score: psi.result, psi_total: psiTotal,
    people_notes: psi.people_notes, process_notes: psi.process_notes,
    system_notes: psi.system_notes, result_notes: psi.result_notes,
    updated_at: new Date().toISOString()
  }, { onConflict: 'project_id' })
  if (error) {
    if (typeof window !== 'undefined') alert('Gagal simpan PSI: ' + error.message)
    throw error
  }
}

// ── DMAIC Phase ───────────────────────────────────────────────────────────────

export type DmaicPhase = 'draft' | 'define' | 'measure' | 'analyze' | 'improve' | 'control' | 'completed'

export async function updateProjectPhase(projectId: string, newPhase: DmaicPhase): Promise<void> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { error } = await sb.from('bimkon_projects').update({ status: newPhase, current_phase: newPhase }).eq('id', projectId)
    if (error) handleDbError(error)
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
    if (error) handleDbError(error)
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
    if (error) handleDbError(error)
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
  // localStorage sebagai backup cepat
  if (typeof window !== 'undefined') {
    localStorage.setItem(`sibimkon_measure_problems_${projectId}`, JSON.stringify(problems))
  }
  const sb = getSupabase()
  if (!sb) return
  // Delete semua lalu re-insert (sederhana, cocok untuk jumlah masalah yang kecil)
  const { error: delErr } = await sb.from('measure_problems').delete().eq('project_id', projectId)
  if (delErr) {
    console.error('[saveMeasureProblems] Delete error:', delErr)
    if (typeof window !== 'undefined') alert('Gagal menghapus data lama: ' + delErr.message)
  }
  if (problems.length > 0) {
    const rows = problems.map((p) => ({
      project_id: projectId,
      problem_text: p.problem_text,
      source: p.source,
      pqcdsm_dimension: p.pqcdsm_dimension,
      recommended_methods: p.recommended_methods,
      impact: p.impact || null,
      priority_rank: p.priority_rank,
      // Kembalikan penyimpanan dimension_reason ke notes agar tidak error missing column
      notes: (p as any).dimension_reason || p.notes || null,
    }))
    const { error } = await sb.from('measure_problems').insert(rows)
    if (error) {
      console.error('[saveMeasureProblems] Insert error:', error)
      if (typeof window !== 'undefined') alert('Gagal menyimpan ke database: ' + error.message)
      throw error  // propagate ke pemanggil agar user tahu gagal
    }
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
  const sb = getSupabase()
  if (!sb) return
  
  const { error: delErr } = await sb.from('analyze_needs').delete().eq('project_id', projectId)
  if (delErr) {
    if (typeof window !== 'undefined') alert('Gagal menghapus Analisis Kebutuhan lama: ' + delErr.message)
    throw delErr
  }
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
    const { error: insErr } = await sb.from('analyze_needs').insert(rows)
    if (insErr) {
      if (typeof window !== 'undefined') alert('Gagal menyimpan Analisis Kebutuhan: ' + insErr.message)
      throw insErr
    }
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
    if (error) {
      console.error('[getEvidenceItems] Supabase error:', error.message, error.details)
      throw error
    }
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
      uploaded_by_name: d.uploaded_by_name,
      uploaded_by_role: d.uploaded_by_role,
      uploaded_at: d.created_at,
    })) as EvidenceItem[]
  } catch (err: any) {
    console.error('[getEvidenceItems] Exception, fallback to localStorage:', err?.message || err)
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
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('action_evidence').insert({
      project_id:       projectId,
      action_id:        record.action_plan_id,
      evidence_type:    'document',
      title:            record.action_title ?? null,
      file_name:        record.file_name,
      file_url:         record.file_url,
      kpi_actual_value: record.kpi_submitted_value ?? null,
      kpi_unit:         record.kpi_unit ?? null,
      uploaded_by:      record.uploaded_by_id ?? null,
      uploaded_by_name: record.uploaded_by_name ?? null,
      uploaded_by_role: record.uploaded_by_role ?? null,
      evidence_status:  'pending',
    }).select('id').single()
    if (error) {
      console.error('[submitEvidence] Supabase insert error:', error.message, error.details, error.hint)
    } else if (data?.id) {
      newItem.id = data.id
    }
  } catch (err: any) {
    console.error('[submitEvidence] Exception:', err?.message || err)
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

// ── IMPROVE: Checklist Evidence ────────────────────────────────────────────────

export interface ChecklistEvidenceItem {
  id: string
  step_id: string
  file_url: string
  file_name: string
  file_type?: string
  file_size?: number
  uploaded_by?: string
  uploaded_by_name?: string
  uploaded_by_role?: string
  uploaded_at: string
  verification_status: 'pending' | 'approved' | 'rejected'
  verified_by?: string
  verified_at?: string
  rejection_note?: string
}

export async function getChecklistEvidences(stepIds: string[]): Promise<ChecklistEvidenceItem[]> {
  if (!stepIds || stepIds.length === 0) return []
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb
      .from('checklist_evidence')
      .select('*')
      .in('step_id', stepIds)
      .order('uploaded_at', { ascending: false })
    if (error) throw error
    return data as ChecklistEvidenceItem[]
  } catch (err: any) {
    console.warn('[getChecklistEvidences] Exception:', err?.message || err)
    return []
  }
}

export async function submitChecklistEvidence(
  stepId: string,
  record: {
    file_name: string
    file_url: string
    file_type?: string
    file_size?: number
    uploaded_by?: string
    uploaded_by_name?: string
    uploaded_by_role?: string
  }
): Promise<ChecklistEvidenceItem> {
  const newItem: ChecklistEvidenceItem = {
    id: 'cev-' + Math.random().toString(36).substr(2, 9),
    step_id: stepId,
    file_url: record.file_url,
    file_name: record.file_name,
    file_type: record.file_type,
    file_size: record.file_size,
    uploaded_by: record.uploaded_by,
    uploaded_by_name: record.uploaded_by_name,
    uploaded_by_role: record.uploaded_by_role,
    uploaded_at: new Date().toISOString(),
    verification_status: 'pending'
  }

  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data, error } = await sb.from('checklist_evidence').insert({
      step_id: stepId,
      file_url: record.file_url,
      file_name: record.file_name,
      file_type: record.file_type,
      file_size: record.file_size,
      uploaded_by: record.uploaded_by,
      uploaded_by_name: record.uploaded_by_name,
      uploaded_by_role: record.uploaded_by_role,
      verification_status: 'pending'
    }).select('*').single()
    
    if (error) {
      console.error('[submitChecklistEvidence] Supabase error:', error.message)
    } else if (data) {
      return data as ChecklistEvidenceItem
    }
  } catch (err: any) {
    console.error('[submitChecklistEvidence] Exception:', err?.message || err)
  }
  return newItem
}

export async function verifyChecklistEvidence(
  evidenceId: string,
  status: 'approved' | 'rejected',
  note: string,
  reviewerId: string
): Promise<void> {
  const now = new Date().toISOString()
  try {
    const sb = getSupabase()
    if (!sb) return

    const { error } = await sb.from('checklist_evidence').update({
      verification_status: status,
      rejection_note: note,
      verified_by: reviewerId,
      verified_at: now
    }).eq('id', evidenceId)
    
    if (error) throw error
  } catch (err: any) {
    console.warn('[verifyChecklistEvidence] failed:', err)
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


// ── ANALYZE: AI Analysis Results ─────────────────────────────────────────────

export async function getAnalyzeResult(projectId: string): Promise<AnalyzeResult | null> {
  const db = getMockDB()
  const localResult = db.analyzeResults?.[projectId] || null

  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')
    const { data } = await sb.from('analyze_results').select('*').eq('project_id', projectId).maybeSingle()
    if (data) {
      const sbResult = data as AnalyzeResult
      // Ensure recommendations is always an array
      if (!Array.isArray(sbResult.recommendations)) {
        sbResult.recommendations = []
      }
      // Ensure priority_result is always an array or null
      if (sbResult.priority_result && !Array.isArray(sbResult.priority_result)) {
        sbResult.priority_result = undefined
      }
      // Merge: if Supabase has no priority_result but localStorage does, use localStorage's
      if (!sbResult.priority_result?.length && localResult?.priority_result?.length) {
        sbResult.priority_result = localResult.priority_result
      }
      
      // Fix for when Supabase upsert failed previously, leaving an empty recommendations array in DB
      // while localStorage has the successfully generated data.
      if (!sbResult.recommendations?.length && localResult?.recommendations?.length) {
        sbResult.recommendations = localResult.recommendations
      }
      
      return sbResult
    }
  } catch (err) {
    console.warn('[getAnalyzeResult] fallback to mockDB/localStorage:', err)
  }
  // Normalize local result too
  if (localResult && !Array.isArray(localResult.recommendations)) {
    localResult.recommendations = []
  }
  return localResult
}

export async function saveAnalyzeResult(projectId: string, result: AnalyzeResult): Promise<void> {
  const db = getMockDB()
  if (!db.analyzeResults) db.analyzeResults = {}
  db.analyzeResults[projectId] = result
  updateMockDB('analyzeResults', db.analyzeResults)

  const sb = getSupabase()
  if (!sb) return

  try {
    const { error } = await sb.from('analyze_results').upsert({
      project_id: projectId,
      recommendations: result.recommendations,
      priority_result: result.priority_result || [],
      status: result.status,
      updated_at: new Date().toISOString(),
      // Fix for legacy NOT NULL constraints in DB schema
      recommended_method: '-',
      selected_method: '-',
      reasoning: '-',
      summary: '-'
    }, { onConflict: 'project_id' })
    if (error) {
      console.warn('[saveAnalyzeResult] Supabase upsert error:', error)
      throw error
    }
  } catch (err: any) {
    console.warn('[saveAnalyzeResult] Supabase failed, using localStorage only:', err?.message || err)
  }
}

// ── CONTROL: Efficiency Targets (AI) ──────────────────────────────────────────

export async function getEfficiencyTargets(projectId: string): Promise<any[]> {
  try {
    const sb = getSupabase()
    if (!sb) throw new Error('No Supabase client')

    const { data, error } = await sb.from('efficiency_targets')
      .select('*, actuals:efficiency_actuals(*)')
      .eq('project_id', projectId)
      .order('generated_at', { ascending: false })

    if (error) handleDbError(error)
    return data || []
  } catch (err) {
    console.warn('[getEfficiencyTargets] fallback to mockDB or empty:', err)
    return []
  }
}

export async function saveEfficiencyTargets(projectId: string, targets: any[]): Promise<void> {
  const sb = getSupabase()
  if (!sb) return

  if (targets.length === 0) return

  try {
    const rows = targets.map((t) => ({
      id: t.id,
      action_plan_id: t.action_plan_id,
      project_id: projectId,
      raw_text: t.raw_text,
      metric_name: t.metric_name,
      baseline_value: t.baseline_value || null,
      target_value: t.target_value,
      duration: t.duration,
      duration_unit: t.duration_unit,
      needs_manual_review: t.needs_manual_review
    }))

    const { error } = await sb.from('efficiency_targets').upsert(rows, { onConflict: 'id' })
    if (error) handleDbError(error)
  } catch (err) {
    console.warn('[saveEfficiencyTargets] failed:', err)
  }
}

export async function saveEfficiencyActuals(actuals: any[]): Promise<void> {
  const sb = getSupabase()
  if (!sb) return

  if (actuals.length === 0) return

  try {
    const rows = actuals.map((a) => ({
      id: a.id,
      efficiency_target_id: a.efficiency_target_id,
      checkpoint_number: a.checkpoint_number,
      due_date: a.due_date,
      actual_value: a.actual_value,
      input_by: a.input_by || null,
      input_at: a.input_at || null,
      note: a.note || ''
    }))

    const { error } = await sb.from('efficiency_actuals').upsert(rows, { onConflict: 'id' })
    if (error) handleDbError(error)
  } catch (err) {
    console.warn('[saveEfficiencyActuals] failed:', err)
  }
}
