'use client'

import { createClient } from './supabase/client'
import { getMockDB, updateMockDB, Project, Company, ProjectCharter, Assessment, FishboneNode, WhyNode, ActionPlan } from './mockData'

const supabase = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ? createClient()
  : null as any

// Helper to check if Supabase is connected and has the tables
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    if (!supabase) return false
    const { error } = await supabase.from(tableName).select('id').limit(1)
    if (error && (error.code === 'PGRST116' || error.message.includes('does not exist'))) {
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

    const { data, error } = await supabase
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
    console.warn('Supabase getProjects failed, falling back to mock storage.', err)
    return getMockDB().projects
  }
}

export async function createProject(project: Omit<Project, 'id' | 'project_code'>): Promise<Project> {
  try {
    const hasTable = await checkTableExists('bimkon_projects')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await supabase
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
    console.warn('Supabase createProject failed, falling back to mock storage.', err)
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

export async function getCompanies(): Promise<Company[]> {
  try {
    const hasTable = await checkTableExists('companies')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await supabase.from('companies').select('*')
    if (error) throw error

    return data || []
  } catch (err) {
    console.warn('Supabase getCompanies failed, falling back to mock storage.', err)
    return getMockDB().companies
  }
}

export async function getProjectCharter(projectId: string): Promise<ProjectCharter | null> {
  try {
    const hasTable = await checkTableExists('project_charters')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await supabase
      .from('project_charters')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.warn('Supabase getProjectCharter failed, falling back to mock storage.', err)
    return getMockDB().charters[projectId] || null
  }
}

export async function saveProjectCharter(charter: ProjectCharter): Promise<void> {
  try {
    const hasTable = await checkTableExists('project_charters')
    if (!hasTable) throw new Error('Table does not exist')

    const { error } = await supabase
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
    console.warn('Supabase saveProjectCharter failed, falling back to mock storage.', err)
    const db = getMockDB()
    db.charters[charter.project_id] = charter
    updateMockDB('charters', db.charters)
  }
}

export async function getAssessments(projectId: string): Promise<Assessment[]> {
  try {
    const hasTable = await checkTableExists('measure_assessments')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await supabase
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
    console.warn('Supabase getAssessments failed, falling back to mock storage.', err)
    return getMockDB().assessments[projectId] || []
  }
}

export async function saveAssessments(projectId: string, assessments: Assessment[]): Promise<void> {
  try {
    const hasTable = await checkTableExists('measure_assessments')
    if (!hasTable) throw new Error('Table does not exist')

    for (const assess of assessments) {
      const { error } = await supabase
        .from('measure_assessments')
        .upsert({
          project_id: projectId,
          dimension: assess.dimension,
          percentage_score: assess.percentage_score,
          responses: { questions: assess.responses }
        })
      if (error) throw error
    }
  } catch (err) {
    console.warn('Supabase saveAssessments failed, falling back to mock storage.', err)
    const db = getMockDB()
    db.assessments[projectId] = assessments
    updateMockDB('assessments', db.assessments)
  }
}

export async function getFishbones(projectId: string): Promise<FishboneNode[]> {
  try {
    const hasTable = await checkTableExists('analyze_fishbone')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await supabase
      .from('analyze_fishbone')
      .select('*')
      .eq('project_id', projectId)

    if (error) throw error

    return data || []
  } catch (err) {
    console.warn('Supabase getFishbones failed, falling back to mock storage.', err)
    return getMockDB().fishbones[projectId] || []
  }
}

export async function getActionPlans(projectId: string): Promise<ActionPlan[]> {
  try {
    const hasTable = await checkTableExists('improve_actions')
    if (!hasTable) throw new Error('Table does not exist')

    const { data, error } = await supabase
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
    console.warn('Supabase getActionPlans failed, falling back to mock storage.', err)
    return getMockDB().actionPlans[projectId] || []
  }
}

// ── Advance DMAIC phase explicitly ──────────────────────────────────────────
export type DmaicPhase = 'draft' | 'define' | 'measure' | 'analyze' | 'improve' | 'control' | 'completed'

export async function updateProjectPhase(projectId: string, newPhase: DmaicPhase): Promise<void> {
  try {
    const hasTable = await checkTableExists('bimkon_projects')
    if (!hasTable) throw new Error('Table does not exist')
    const { error } = await supabase
      .from('bimkon_projects')
      .update({ status: newPhase, current_phase: newPhase })
      .eq('id', projectId)
    if (error) throw error
  } catch {
    // Fallback: update mockDB
    const db = getMockDB()
    const updated = db.projects.map((p: Project) =>
      p.id === projectId ? { ...p, status: newPhase } : p
    )
    updateMockDB('projects', updated)
  }
}
