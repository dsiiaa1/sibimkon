import { createClient } from './supabase/client'
import { getMockDB, updateMockDB, Project, Company, ProjectCharter, Assessment, FishboneNode, WhyNode, ActionPlan } from './mockData'

// Buat client fresh setiap panggilan agar selalu pakai session terbaru
function getSupabase() {
  if (typeof process === 'undefined') return null
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null
  return createClient()
}

// Helper to check if Supabase is connected and the table exists.
// Fix: instansiasi client hanya 1x per panggilan untuk menghindari memory leak.
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const sb = getSupabase()
    if (!sb) return false
    const { error } = await sb.from(tableName).select('*').limit(0)
    // PGRST116 = table not found, 42P01 = undefined table (Postgres)
    if (error && (
      error.code === 'PGRST116' ||
      error.code === '42P01' ||
      error.message?.includes('does not exist') ||
      error.message?.includes('relation')
    )) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export async function getProjects(): Promise<Project[]> {
  try {
    const hasTable = await checkTableExists('bimkon_projects')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await getSupabase()!
      .from('bimkon_projects')
      .select('*, companies(name)')

    if (error) throw error

    return (data || []).map((p: any) => ({
      id: p.id,
      project_code: p.project_code,
      title: p.title,
      description: p.description,
      company_id: p.company_id,
      company_name: p.companies?.name || 'Unknown',
      consultant_id: p.consultant_id,
      status: p.status,
      start_date: p.start_date,
      target_end_date: p.target_end_date,
      baseline_score: Number(p.baseline_productivity_index || 0),
      current_score: Number(p.current_productivity_index || 0)
    }))
  } catch (err) {
    console.warn('getSupabase()! getProjects failed, falling back to mock storage.', err)
    return getMockDB().projects
  }
}

export async function createProject(project: Omit<Project, 'id' | 'project_code'>): Promise<Project> {
  try {
    const hasTable = await checkTableExists('bimkon_projects')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await getSupabase()!
      .from('bimkon_projects')
      .insert({
        title: project.title,
        description: project.description,
        company_id: project.company_id,
        consultant_id: project.consultant_id,
        status: project.status,
        start_date: project.start_date,
        target_end_date: project.target_end_date,
        current_phase: 'define'
      })
      .select('*, companies(name)')
      .single()

    if (error) throw error

    return {
      id: data.id,
      project_code: data.project_code,
      title: data.title,
      description: data.description,
      company_id: data.company_id,
      company_name: data.companies?.name || 'Unknown',
      consultant_id: data.consultant_id,
      status: data.status,
      start_date: data.start_date,
      target_end_date: data.target_end_date,
      baseline_score: Number(data.baseline_productivity_index || 0),
      current_score: Number(data.current_productivity_index || 0)
    }
  } catch (err) {
    console.warn('getSupabase()! createProject failed, falling back to mock storage.', err)
    const db = getMockDB()
    const newProj: Project = {
      ...project,
      id: 'proj-' + Math.random().toString(36).substr(2, 9),
      project_code: `BK-2026-000${db.projects.length + 1}`,
      baseline_score: 0,
      current_score: 0
    }
    const updated = [...db.projects, newProj]
    updateMockDB('projects', updated)
    return newProj
  }
}

export async function createCompany(company: Omit<Company, 'id'>): Promise<Company> {
  try {
    const hasTable = await checkTableExists('companies')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await getSupabase()!
      .from('companies')
      .insert({
        name: company.name,
        address: company.address,
        province: company.province,
        city: company.city,
        business_field: company.business_field,
        total_employees: company.total_employees,
        certifications: company.certifications || [],
        pic_name: company.pic_name,
        pic_position: company.pic_position,
        pic_phone: company.pic_phone,
        pic_email: company.pic_email,
      })
      .select('*')
      .single()

    if (error) throw error

    return {
      id: data.id,
      name: data.name,
      address: data.address,
      province: data.province,
      city: data.city,
      business_field: data.business_field,
      total_employees: data.total_employees,
      certifications: data.certifications || [],
      pic_name: company.pic_name,
      pic_position: company.pic_position,
      pic_phone: company.pic_phone,
      pic_email: company.pic_email,
    }
  } catch (err) {
    console.warn('getSupabase()! createCompany failed, falling back to mock storage.', err)
    const db = getMockDB()
    const newCompany: Company = {
      ...company,
      id: 'comp-' + Math.random().toString(36).substr(2, 9),
    }
    const updated = [...db.companies, newCompany]
    updateMockDB('companies', updated)
    return newCompany
  }
}

export async function getCompanies(): Promise<Company[]> {
  try {
    const hasTable = await checkTableExists('companies')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await getSupabase()!.from('companies').select('*')
    if (error) throw error

    return data || []
  } catch (err) {
    console.warn('getSupabase()! getCompanies failed, falling back to mock storage.', err)
    return getMockDB().companies
  }
}

// ── updateCompany — save profil perusahaan ke Supabase ──────────────────────
export async function updateCompany(companyId: string, fields: Partial<Company>): Promise<void> {
  // Selalu update mockDB dulu untuk konsistensi UI
  const db = getMockDB()
  const updatedCompanies = db.companies.map((c: Company) =>
    c.id === companyId ? { ...c, ...fields } : c
  )
  updateMockDB('companies', updatedCompanies)

  try {
    const hasTable = await checkTableExists('companies')
    if (!hasTable) return

    const { error } = await getSupabase()!
      .from('companies')
      .update({
        ...(fields.name !== undefined && { name: fields.name }),
        ...(fields.address !== undefined && { address: fields.address }),
        ...(fields.total_employees !== undefined && { total_employees: fields.total_employees }),
        ...(fields.business_field !== undefined && { business_field: fields.business_field }),
        ...(fields.main_product !== undefined && { main_products: fields.main_product }),
        ...(fields.certifications !== undefined && { certifications: fields.certifications }),
        // kadin_membership → kadin_member + apindo_member (boolean flags di DB)
        ...(fields.kadin_membership !== undefined && {
          kadin_member: fields.kadin_membership === 'kadin' || fields.kadin_membership === 'keduanya',
          apindo_member: fields.kadin_membership === 'apindo' || fields.kadin_membership === 'keduanya',
        }),
        // labor_union → has_union (boolean di DB)
        ...(fields.labor_union !== undefined && { has_union: !!fields.labor_union }),
        // pkb_status → has_pkb (boolean di DB)
        ...(fields.pkb_status !== undefined && { has_pkb: fields.pkb_status !== 'tidak_ada' }),
        ...(fields.pic_name !== undefined && { pic_name: fields.pic_name }),
        ...(fields.pic_position !== undefined && { pic_position: fields.pic_position }),
        ...(fields.pic_phone !== undefined && { pic_phone: fields.pic_phone }),
        ...(fields.pic_email !== undefined && { pic_email: fields.pic_email }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId)

    if (error) throw error
  } catch (err) {
    console.warn('Supabase updateCompany failed, data saved to mockDB only.', err)
  }
}

export async function getProjectCharter(projectId: string): Promise<ProjectCharter | null> {
  try {
    const hasTable = await checkTableExists('project_charters')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await getSupabase()!
      .from('project_charters')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.warn('getSupabase()! getProjectCharter failed, falling back to mock storage.', err)
    return getMockDB().charters[projectId] || null
  }
}

export async function saveProjectCharter(charter: ProjectCharter): Promise<void> {
  try {
    const hasTable = await checkTableExists('project_charters')
    if (!hasTable) throw new Error('Table does not exist')

    const { error } = await getSupabase()!
      .from('project_charters')
      .upsert({
        project_id: charter.project_id,
        problem_statement: charter.problem_statement,
        objectives: charter.objectives,
        productivity_target: charter.productivity_target,
        scope: charter.scope,
        team_members: charter.team_members
      })

    if (error) throw error
  } catch (err) {
    console.warn('getSupabase()! saveProjectCharter failed, falling back to mock storage.', err)
    const db = getMockDB()
    db.charters[charter.project_id] = charter
    updateMockDB('charters', db.charters)
  }
}

export async function getAssessments(projectId: string): Promise<Assessment[]> {
  try {
    const hasTable = await checkTableExists('measure_assessments')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await getSupabase()!
      .from('measure_assessments')
      .select('*')
      .eq('project_id', projectId)

    if (error) throw error

    return (data || []).map((d: any) => ({
      project_id: d.project_id,
      dimension: d.dimension,
      percentage_score: Number(d.percentage_score || 0),
      responses: d.responses?.questions || []
    }))
  } catch (err) {
    console.warn('getSupabase()! getAssessments failed, falling back to mock storage.', err)
    return getMockDB().assessments[projectId] || []
  }
}

export async function saveAssessments(projectId: string, assessments: Assessment[]): Promise<void> {
  // Selalu sync mockDB dulu agar UI tidak block
  const db = getMockDB()
  db.assessments[projectId] = assessments
  updateMockDB('assessments', db.assessments)

  try {
    const hasTable = await checkTableExists('measure_assessments')
    if (!hasTable) return

    const sb = getSupabase()!
    for (const assess of assessments) {
      const { error } = await sb
        .from('measure_assessments')
        .upsert({
          project_id: projectId,
          dimension: assess.dimension,
          percentage_score: assess.percentage_score,
          responses: { questions: assess.responses }
        }, { onConflict: 'project_id,dimension,assessment_version' })
      if (error) {
        console.error('saveAssessments upsert error:', error)
        throw error
      }
    }

    // Fix #2: Sync skor rata-rata ke bimkon_projects di Supabase
    const avgIndex = Math.round(
      assessments.reduce((acc, a) => acc + a.percentage_score, 0) / assessments.length
    )
    // Baca baseline saat ini — kalau belum ada, set sekarang
    const { data: existingProject } = await sb
      .from('bimkon_projects')
      .select('baseline_productivity_index, current_productivity_index')
      .eq('id', projectId)
      .maybeSingle()

    const baselineVal = existingProject?.baseline_productivity_index
      ? Number(existingProject.baseline_productivity_index)
      : avgIndex

    await sb
      .from('bimkon_projects')
      .update({
        baseline_productivity_index: baselineVal,
        current_productivity_index: avgIndex,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

  } catch (err) {
    console.warn('saveAssessments Supabase failed, data saved to mockDB only.', err)
  }
}

export async function getVom(projectId: string): Promise<any[]> {
  try {
    const hasTable = await checkTableExists('measure_vom')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await getSupabase()!
      .from('measure_vom')
      .select('*')
      .eq('project_id', projectId)
      .order('priority', { ascending: true })

    if (error) {
      console.error('getSupabase()! getVom Error Details:', error)
      throw error
    }

    return data || []
  } catch (err) {
    console.warn('getSupabase()! getVom failed, falling back to local/mock logic. Details:', err)
    return []
  }
}

export async function saveVom(projectId: string, vomList: any[]): Promise<void> {
  try {
    const hasTable = await checkTableExists('measure_vom')
    if (!hasTable) throw new Error('Table measure_vom does not exist')

    const { error: deleteErr } = await getSupabase()!
      .from('measure_vom')
      .delete()
      .eq('project_id', projectId)

    if (deleteErr) {
      console.error('[saveVom] Delete error:', deleteErr)
      throw deleteErr
    }

    if (vomList.length > 0) {
      const upsertData = vomList.map((v) => {
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.id)
        return {
          id: isValidUUID ? v.id : undefined,
          project_id: projectId,
          dimension: v.dimension,
          problem: v.problem,
          impact: v.impact,
          priority: v.priority
        }
      })

      const { error: insertErr } = await getSupabase()!
        .from('measure_vom')
        .insert(upsertData)

      if (insertErr) {
        console.error('[saveVom] Insert error:', insertErr)
        throw insertErr
      }
    }
    console.log('[saveVom] Saved', vomList.length, 'VOM items for project', projectId)
  } catch (err) {
    console.warn('[saveVom] Failed, details:', err)
  }
}

// ── ANALYZE: Fishbone ────────────────────────────────────────────────────────

export async function getFishbones(projectId: string): Promise<FishboneNode[]> {
  try {
    const hasTable = await checkTableExists('analyze_fishbone')
    if (!hasTable) throw new Error('Table does not exist')

    // schema menyimpan fishbone sebagai 1 baris per project dengan JSONB nodes
    const { data, error } = await getSupabase()!
      .from('analyze_fishbone')
      .select('nodes')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    // nodes adalah array FishboneNode {id, category, text}
    return (data?.nodes as FishboneNode[]) || []
  } catch (err) {
    console.warn('getSupabase()! getFishbones failed, falling back to mock storage.', err)
    return getMockDB().fishbones[projectId] || []
  }
}

export async function saveFishbones(projectId: string, items: FishboneNode[]): Promise<void> {
  // Selalu sync mockDB dulu agar UI konsisten
  const db = getMockDB()
  db.fishbones[projectId] = items
  updateMockDB('fishbones', db.fishbones)

  try {
    const hasTable = await checkTableExists('analyze_fishbone')
    if (!hasTable) return

    const sb = getSupabase()!
    const { data: existing } = await sb
      .from('analyze_fishbone')
      .select('id')
      .eq('project_id', projectId)
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await sb
        .from('analyze_fishbone')
        .update({ nodes: items, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await sb
        .from('analyze_fishbone')
        .insert({ project_id: projectId, title: 'Fishbone Diagram', nodes: items })
      if (error) throw error
    }
  } catch (err) {
    console.warn('saveFishbones Supabase failed, data saved to mockDB only.', err)
  }
}

// ── ANALYZE: 5-Why ───────────────────────────────────────────────────────────

export async function getFiveWhys(projectId: string): Promise<WhyNode[]> {
  try {
    const hasTable = await checkTableExists('analyze_5why')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await getSupabase()!
      .from('analyze_5why')
      .select('why_tree')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return (data?.why_tree as WhyNode[]) || []
  } catch (err) {
    console.warn('getSupabase()! getFiveWhys failed, falling back to mock storage.', err)
    return getMockDB().fiveWhys[projectId] || []
  }
}

export async function saveFiveWhys(projectId: string, whyTree: WhyNode[]): Promise<void> {
  // Selalu sync mockDB dulu agar UI konsisten
  const db = getMockDB()
  db.fiveWhys[projectId] = whyTree
  updateMockDB('fiveWhys', db.fiveWhys)

  try {
    const hasTable = await checkTableExists('analyze_5why')
    if (!hasTable) return

    const sb = getSupabase()!
    const { data: existing } = await sb
      .from('analyze_5why')
      .select('id')
      .eq('project_id', projectId)
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await sb
        .from('analyze_5why')
        .update({ why_tree: whyTree, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await sb
        .from('analyze_5why')
        .insert({ project_id: projectId, problem_statement: 'Analisis 5-Why', why_tree: whyTree })
      if (error) throw error
    }
  } catch (err) {
    console.warn('saveFiveWhys Supabase failed, data saved to mockDB only.', err)
  }
}

export async function getActionPlans(projectId: string): Promise<ActionPlan[]> {
  try {
    const hasTable = await checkTableExists('improve_actions')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await getSupabase()!
      .from('improve_actions')
      .select('*')
      .eq('project_id', projectId)

    if (error) throw error

    return (data || []).map((d: any) => ({
      id: d.id,
      project_id: d.project_id,
      title: d.action_title,
      description: d.description,
      methodology: d.methodology,
      dimension: d.dimension,
      kpi_name: d.kpi_name,
      kpi_baseline: Number(d.kpi_baseline || 0),
      kpi_target: Number(d.kpi_target || 0),
      kpi_unit: d.kpi_unit,
      kpi_actual: d.kpi_actual,
      pic_name: d.pic_name,
      start_date: d.start_date,
      end_date: d.end_date,
      status: d.status,
      progress_percentage: d.progress_percentage
    }))
  } catch (err) {
    console.warn('getSupabase()! getActionPlans failed, falling back to mock storage.', err)
    return getMockDB().actionPlans[projectId] || []
  }
}

export async function saveActionPlans(projectId: string, actions: ActionPlan[]): Promise<void> {
  // Selalu sync mockDB agar UI konsisten apapun yang terjadi
  const db = getMockDB()
  db.actionPlans[projectId] = actions
  updateMockDB('actionPlans', db.actionPlans)

  try {
    const hasTable = await checkTableExists('improve_actions')
    if (!hasTable) return // fallback sudah dilakukan di atas

    const sb = getSupabase()!
    const { data: existing, error: fetchErr } = await sb
      .from('improve_actions')
      .select('id')
      .eq('project_id', projectId)

    if (fetchErr) throw fetchErr

    const existingIds = (existing || []).map((e: any) => e.id)
    const newIds = actions.map(a => a.id)

    const idsToDelete = existingIds.filter((id: string) => !newIds.includes(id))
    if (idsToDelete.length > 0) {
      const { error: deleteErr } = await sb
        .from('improve_actions')
        .delete()
        .in('id', idsToDelete)
      if (deleteErr) throw deleteErr
    }

    if (actions.length > 0) {
      const upsertData = actions.map(act => {
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(act.id)
        const item: any = {
          project_id: projectId,
          action_title: act.title,
          description: act.description,
          methodology: act.methodology,
          dimension: act.dimension,
          kpi_name: act.kpi_name,
          kpi_baseline: act.kpi_baseline,
          kpi_target: act.kpi_target,
          kpi_unit: act.kpi_unit,
          kpi_actual: act.kpi_actual || null,
          pic_name: act.pic_name,
          start_date: act.start_date,
          end_date: act.end_date,
          status: act.status,
          progress_percentage: act.progress_percentage
        }
        if (isValidUUID) item.id = act.id
        return item
      })

      const { error: upsertErr } = await sb
        .from('improve_actions')
        .upsert(upsertData)
      if (upsertErr) throw upsertErr
    }
  } catch (err) {
    console.warn('getSupabase()! saveActionPlans failed, data saved to mockDB only.', err)
  }
}

// ── CONTROL: Audit Checklist ─────────────────────────────────────────────────

export async function getControlAudit(projectId: string): Promise<any[]> {
  try {
    const hasTable = await checkTableExists('audit_checklists')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await getSupabase()!
      .from('audit_checklists')
      .select('items')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return (data?.items as any[]) || []
  } catch (err) {
    console.warn('getSupabase()! getControlAudit failed, falling back to localStorage.', err)
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`sibimkon_audit_${projectId}`) : null
    return saved ? JSON.parse(saved) : []
  }
}

export async function saveControlAudit(projectId: string, items: any[]): Promise<void> {
  // selalu simpan ke localStorage dulu (instant UI)
  if (typeof window !== 'undefined') {
    localStorage.setItem(`sibimkon_audit_${projectId}`, JSON.stringify(items))
  }

  try {
    const hasTable = await checkTableExists('audit_checklists')
    if (!hasTable) throw new Error('Table does not exist')

    const compliant = items.filter((i: any) => i.completed).length
    const pct = items.length > 0 ? Math.round((compliant / items.length) * 100) : 0

    const { data: existing } = await getSupabase()!
      .from('audit_checklists')
      .select('id')
      .eq('project_id', projectId)
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await getSupabase()!
        .from('audit_checklists')
        .update({
          items,
          total_items: items.length,
          compliant_items: compliant,
          compliance_percentage: pct,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await getSupabase()!
        .from('audit_checklists')
        .insert({
          project_id: projectId,
          category: 'General',
          items,
          total_items: items.length,
          compliant_items: compliant,
          compliance_percentage: pct
        })
      if (error) throw error
    }
  } catch (err) {
    console.warn('getSupabase()! saveControlAudit failed, data saved to localStorage only.', err)
  }
}

// ── CONTROL: PSI ─────────────────────────────────────────────────────────────

export async function getControlPsi(projectId: string): Promise<{ people: number; process: number; system: number; result: number } | null> {
  try {
    const hasTable = await checkTableExists('sustainability_assessments')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await getSupabase()!
      .from('sustainability_assessments')
      .select('people_score, process_score, system_score, result_score')
      .eq('project_id', projectId)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      people: Number(data.people_score || 70),
      process: Number(data.process_score || 65),
      system: Number(data.system_score || 60),
      result: Number(data.result_score || 75),
    }
  } catch (err) {
    console.warn('getSupabase()! getControlPsi failed, falling back to localStorage.', err)
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`sibimkon_psi_${projectId}`) : null
    return saved ? JSON.parse(saved) : null
  }
}

export async function saveControlPsi(projectId: string, psi: { people: number; process: number; system: number; result: number }): Promise<void> {
  // simpan localStorage dulu
  if (typeof window !== 'undefined') {
    localStorage.setItem(`sibimkon_psi_${projectId}`, JSON.stringify(psi))
  }

  try {
    const hasTable = await checkTableExists('sustainability_assessments')
    if (!hasTable) throw new Error('Table does not exist')

    const psiTotal = Math.round((psi.people + psi.process + psi.system + psi.result) / 4)

    const { error } = await getSupabase()!
      .from('sustainability_assessments')
      .upsert({
        project_id: projectId,
        people_score: psi.people,
        process_score: psi.process,
        system_score: psi.system,
        result_score: psi.result,
        psi_total: psiTotal,
        updated_at: new Date().toISOString()
      }, { onConflict: 'project_id' })

    if (error) throw error
  } catch (err) {
    console.warn('getSupabase()! saveControlPsi failed, data saved to localStorage only.', err)
  }
}

// ── Advance DMAIC phase explicitly ──────────────────────────────────────────
export type DmaicPhase = 'draft' | 'define' | 'measure' | 'analyze' | 'improve' | 'control' | 'completed'

export async function updateProjectPhase(projectId: string, newPhase: DmaicPhase): Promise<void> {
  try {
    const hasTable = await checkTableExists('bimkon_projects')
    if (!hasTable) throw new Error('Table does not exist')
    const { error } = await getSupabase()!
      .from('bimkon_projects')
      .update({ status: newPhase, current_phase: newPhase })
      .eq('id', projectId)
    if (error) throw error
  } catch {
    const db = getMockDB()
    const updated = db.projects.map((p: Project) =>
      p.id === projectId ? { ...p, status: newPhase } : p
    )
    updateMockDB('projects', updated)
  }
}

// ── IMPROVE: Evidence Files ──────────────────────────────────────────────────

export interface EvidenceRecord {
  id: string
  action_plan_id: string
  action_title?: string
  file_name: string
  file_url: string
  kpi_actual_value?: number
  kpi_unit?: string
  uploaded_by_id?: string
  uploaded_by_name?: string
  uploaded_by_role?: string
  uploaded_at?: string
}

export async function saveEvidenceRecord(projectId: string, record: Omit<EvidenceRecord, 'id'>): Promise<void> {
  // Always persist to localStorage first (instant, offline-safe)
  if (typeof window !== 'undefined') {
    const key = `sibimkon_evidence_${projectId}`
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    existing.push({
      ...record,
      id: 'ev-' + Math.random().toString(36).substr(2, 9),
      uploaded_at: record.uploaded_at || new Date().toISOString(),
    })
    localStorage.setItem(key, JSON.stringify(existing))
  }

  try {
    const hasTable = await checkTableExists('evidence_files')
    if (!hasTable) return

    const { error } = await getSupabase()!
      .from('evidence_files')
      .insert({
        project_id: projectId,
        action_plan_id: record.action_plan_id,
        action_title: record.action_title,
        file_name: record.file_name,
        file_url: record.file_url,
        kpi_actual_value: record.kpi_actual_value,
        kpi_unit: record.kpi_unit,
        uploaded_by_id: record.uploaded_by_id || null,
        uploaded_by_name: record.uploaded_by_name,
        uploaded_by_role: record.uploaded_by_role,
        uploaded_at: new Date().toISOString(),
      })
    if (error) console.warn('saveEvidenceRecord Supabase error (non-critical):', error.message)
  } catch (err) {
    console.warn('saveEvidenceRecord failed, data in localStorage only.', err)
  }
}

export async function getEvidenceRecords(projectId: string, actionPlanId?: string): Promise<EvidenceRecord[]> {
  try {
    const hasTable = await checkTableExists('evidence_files')
    if (!hasTable) throw new Error('Table does not exist')

    let query = getSupabase()!
      .from('evidence_files')
      .select('*')
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false })

    if (actionPlanId) {
      query = query.eq('action_plan_id', actionPlanId)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []).map((d: any) => ({
      id: d.id,
      action_plan_id: d.action_plan_id,
      action_title: d.action_title,
      file_name: d.file_name,
      file_url: d.file_url,
      kpi_actual_value: d.kpi_actual_value,
      kpi_unit: d.kpi_unit,
      uploaded_by_id: d.uploaded_by_id,
      uploaded_by_name: d.uploaded_by_name,
      uploaded_by_role: d.uploaded_by_role,
      uploaded_at: d.uploaded_at,
    }))
  } catch {
    // Fallback: read from localStorage
    if (typeof window === 'undefined') return []
    const key = `sibimkon_evidence_${projectId}`
    const all: EvidenceRecord[] = JSON.parse(localStorage.getItem(key) || '[]')
    return actionPlanId ? all.filter(e => e.action_plan_id === actionPlanId) : all
  }
}

// ── IMPROVE: Audit Log ───────────────────────────────────────────────────────

export interface AuditLogEntry {
  project_id: string
  action_plan_id?: string
  actor_id?: string
  actor_role?: string
  event_type: 'status_change' | 'evidence_upload' | 'kpi_update' | 'plan_created' | 'plan_deleted'
  detail: string
}

export async function saveAuditLog(entry: AuditLogEntry): Promise<void> {
  // Always persist locally first
  if (typeof window !== 'undefined') {
    const key = `sibimkon_status_audit_${entry.project_id}`
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    existing.unshift({ ...entry, id: 'audit-' + Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() })
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 200))) // cap at 200 entries
  }

  try {
    const hasTable = await checkTableExists('action_audit_log')
    if (!hasTable) return

    const { error } = await getSupabase()!
      .from('action_audit_log')
      .insert({
        project_id: entry.project_id,
        action_plan_id: entry.action_plan_id || null,
        actor_id: entry.actor_id || null,
        actor_role: entry.actor_role || null,
        event_type: entry.event_type,
        detail: entry.detail,
        created_at: new Date().toISOString(),
      })
    if (error) console.warn('saveAuditLog Supabase error (non-critical):', error.message)
  } catch (err) {
    console.warn('saveAuditLog failed, data in localStorage only.', err)
  }
}

// ── Notifications ────────────────────────────────────────────────────────────

export async function saveNotification(notification: {
  user_id: string
  project_id: string
  type: string
  title: string
  message: string
}): Promise<void> {
  // Always save to localStorage mock first
  if (typeof window !== 'undefined') {
    const key = `sibimkon_mock_notifications_${notification.user_id}`
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    existing.unshift({
      id: 'notif-' + Math.random().toString(36).substr(2, 9),
      ...notification,
      created_at: new Date().toISOString(),
      is_read: false,
    })
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)))
  }

  try {
    const hasTable = await checkTableExists('notifications')
    if (!hasTable) return

    const { error } = await getSupabase()!
      .from('notifications')
      .insert({ ...notification, is_read: false })
    if (error) console.warn('saveNotification Supabase error (non-critical):', error.message)
  } catch (err) {
    console.warn('saveNotification failed, saved to localStorage only.', err)
  }
}
