'use server'

import { createClient } from '@/lib/supabase/server'

// ---------- Types ----------
export type ReadinessStatus = 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'rejected'

export interface BusinessProcess {
  id?: string
  company_id: string
  process_name: string
  input_text: string
  process_text: string
  output_text: string
  customer_text: string
  cycle_time_estimate?: string
  status?: string
  rejection_note?: string
}

export interface WasteItem {
  id?: string
  company_id: string
  pqcdsm_dimension: 'productivity' | 'quality' | 'cost' | 'delivery' | 'safety' | 'morale'
  waste_description: string
  estimated_impact?: string
  is_quick_win?: boolean
  status?: string
}

export interface ReadinessGateStatus {
  processModule: ReadinessStatus
  wasteModule: ReadinessStatus
  processCount: number
  wasteCount: number
  wasteHasRequiredDimension: boolean // minimal 1 di Cost atau Quality
  gateOpen: boolean
}

// ---------- Wizard Progress ----------
export async function getWizardProgress(companyId: string): Promise<{ current_step: number; data_json: Record<string, any> } | null> {
  const sb = await createClient()
  const { data, error } = await sb
    .from('readiness_wizard_progress')
    .select('current_step, data_json')
    .eq('company_id', companyId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveWizardProgress(companyId: string, currentStep: number, dataJson?: Record<string, any>): Promise<void> {
  const sb = await createClient()
  const { error } = await sb
    .from('readiness_wizard_progress')
    .upsert({ company_id: companyId, current_step: currentStep, data_json: dataJson || {}, updated_at: new Date().toISOString() }, { onConflict: 'company_id' })
  if (error) throw error
}

// ---------- Business Process Map ----------
export async function getBusinessProcesses(companyId: string): Promise<BusinessProcess[]> {
  const sb = await createClient()
  const { data, error } = await sb
    .from('business_process_map')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function saveBusinessProcess(process: BusinessProcess): Promise<BusinessProcess> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (process.id) {
    const { data, error } = await sb
      .from('business_process_map')
      .update({ ...process, updated_at: new Date().toISOString() })
      .eq('id', process.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await sb
      .from('business_process_map')
      .insert({ ...process, status: 'draft', created_by: user?.id, created_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function deleteBusinessProcess(id: string): Promise<void> {
  const sb = await createClient()
  const { error } = await sb.from('business_process_map').delete().eq('id', id)
  if (error) throw error
}

export async function submitBusinessProcessModule(companyId: string): Promise<void> {
  const sb = await createClient()
  const { error } = await sb
    .from('business_process_map')
    .update({ status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('status', 'draft')
  if (error) throw error
}

// ---------- Waste Quick Scan ----------
export async function getWasteItems(companyId: string): Promise<WasteItem[]> {
  const sb = await createClient()
  const { data, error } = await sb
    .from('waste_quick_scan_items')
    .select('*')
    .eq('company_id', companyId)
    .order('pqcdsm_dimension', { ascending: true })
  if (error) throw error
  return data || []
}

export async function saveWasteItem(item: WasteItem): Promise<WasteItem> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (item.id) {
    const { data, error } = await sb
      .from('waste_quick_scan_items')
      .update({ ...item, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await sb
      .from('waste_quick_scan_items')
      .insert({ ...item, status: 'draft', created_by: user?.id, created_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function deleteWasteItem(id: string): Promise<void> {
  const sb = await createClient()
  const { error } = await sb.from('waste_quick_scan_items').delete().eq('id', id)
  if (error) throw error
}

export async function submitWasteModule(companyId: string): Promise<void> {
  const sb = await createClient()
  const { error } = await sb
    .from('waste_quick_scan_items')
    .update({ status: 'submitted', updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('status', 'draft')
  if (error) throw error
}

// ---------- Readiness Gate ----------
export async function getReadinessGateStatus(companyId: string): Promise<ReadinessGateStatus> {
  const [processes, wasteItems] = await Promise.all([
    getBusinessProcesses(companyId),
    getWasteItems(companyId),
  ])

  const processSubmitted = processes.length > 0 && processes.every(p => p.status === 'approved' || p.status === 'submitted')
  const processApproved = processes.length > 0 && processes.every(p => p.status === 'approved')
  const processModule: ReadinessStatus = processes.length === 0 ? 'not_started'
    : processApproved ? 'approved'
    : processSubmitted ? 'submitted'
    : 'in_progress'

  const wasteSubmitted = wasteItems.length > 0 && wasteItems.every(w => w.status === 'approved' || w.status === 'submitted')
  const wasteApproved = wasteItems.length > 0 && wasteItems.every(w => w.status === 'approved')
  const wasteHasRequiredDimension = wasteItems.some(w => w.pqcdsm_dimension === 'cost' || w.pqcdsm_dimension === 'quality')
  const wasteModule: ReadinessStatus = wasteItems.length === 0 ? 'not_started'
    : wasteApproved ? 'approved'
    : wasteSubmitted ? 'submitted'
    : 'in_progress'

  const gateOpen = processModule === 'approved' && wasteModule === 'approved'

  return {
    processModule,
    wasteModule,
    processCount: processes.length,
    wasteCount: wasteItems.length,
    wasteHasRequiredDimension,
    gateOpen,
  }
}
