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
  // Test insert WITHOUT group, role_note, file_url to find what columns exist
  console.log('=== Test insert WITHOUT group/role_note/file_url ===');
  const testRow = {
    project_id: '159b9237-0213-4955-bfc2-e35b53a43966',
    name: 'TEST_COLUMN_CHECK',
    description: 'test',
    reason: 'test',
    expected_format: 'csv',
    example_columns: ['col1'],
    status: 'Belum diupload',
    source: 'manual',
    parsed_summary: null,
    recommended_methods: null,
  };

  const { data, error } = await supabase
    .from('measure_data_requirements')
    .insert(testRow)
    .select();

  if (error) {
    console.error('INSERT ERROR:', JSON.stringify(error, null, 2));
  } else {
    console.log('INSERT SUCCESS! All columns in DB:', Object.keys(data[0]));
    // Clean up
    await supabase.from('measure_data_requirements').delete().eq('name', 'TEST_COLUMN_CHECK');
    console.log('Cleaned up.');
  }
}

check();
