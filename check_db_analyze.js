const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  console.log('=== Checking analyze_results table ===');
  
  const testRow = {
    project_id: '159b9237-0213-4955-bfc2-e35b53a43966',
    recommended_method: 'Test',
    selected_method: 'Test',
    reasoning: 'Test',
    summary: 'Test',
    key_findings: ['Test'],
    suggested_root_causes: ['Test'],
    status: 'draft',
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('analyze_results')
    .upsert(testRow, { onConflict: 'project_id' })
    .select();

  if (error) {
    console.error('UPSERT ERROR:', JSON.stringify(error, null, 2));
  } else {
    console.log('UPSERT SUCCESS! Columns in DB:', Object.keys(data[0]));
    // Clean up
    await supabase.from('analyze_results').delete().eq('project_id', '159b9237-0213-4955-bfc2-e35b53a43966');
    console.log('Cleaned up test row.');
  }
}

check();
