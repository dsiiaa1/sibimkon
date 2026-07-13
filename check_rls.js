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
  console.log('=== Checking analyze_results RLS ===');
  const { data, error } = await supabase.from('analyze_results').select('*');
  
  if (error) {
    console.error('SELECT ERROR:', error);
  } else {
    console.log('SELECT SUCCESS. Data length:', data.length);
  }
}

check();
