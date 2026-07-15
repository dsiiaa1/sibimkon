require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
sb.from('efficiency_targets').select('*').eq('project_id', '159b9237-0213-4955-bfc2-e35b53a43966').then(r => console.log(JSON.stringify(r.data, null, 2)));
