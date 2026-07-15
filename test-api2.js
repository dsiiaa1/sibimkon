require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data } = await sb.from('improve_actions').select('*, steps:action_plan_steps(*)').eq('project_id', '159b9237-0213-4955-bfc2-e35b53a43966');
  
  const actions = (data || []).map(d => ({
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
    steps: d.steps || []
  }));

  console.log("Found actions:", actions.length);
  
  const res = await fetch('http://localhost:3000/api/control-efficiency', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionPlans: actions })
  });
  
  const result = await res.text();
  console.log("API Result:", result);
}
test();
