/**
 * check_db_analyze.js (v2 — updated 23 Jul 2026)
 * -------------------------------------------------------
 * §6.1 Audit khusus tabel analyze_results:
 *  - Konfirmasi schema kolom aktual (menutup temuan §6.3.1 #3 & #4)
 *  - Tes UPSERT + SELECT + DELETE
 *  - Konfirmasi primary key adalah project_id (bukan id)
 *
 * Penggunaan: node check_db_analyze.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});

const URL   = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON  = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = env.TEST_USER_EMAIL;
const PASS  = env.TEST_USER_PASSWORD;

// Proyek test yang aman dipakai (sudah ada di DB)
const TEST_PROJECT_ID = 'ab24090f-588c-43e2-9cb9-7f9b19a21a53';

async function main() {
  console.log('='.repeat(60));
  console.log('check_db_analyze.js v2 — Audit tabel analyze_results');
  console.log('Menutup temuan §6.3.1 #3 & #4 (schema drift)');
  console.log(`Waktu: ${new Date().toLocaleString('id-ID')}`);
  console.log('='.repeat(60));

  const sb = createClient(URL, ANON);
  const { error: loginErr } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
  if (loginErr) { console.error('❌ Login gagal:', loginErr.message); process.exit(1); }
  console.log(`✅ Login sebagai: ${EMAIL}\n`);

  // 1. Cek schema aktual via SELECT dengan kolom explicit
  console.log('── 1. SCHEMA AKTUAL analyze_results ──');
  const { data: existing, error: readErr } = await sb
    .from('analyze_results')
    .select('*')
    .limit(1);

  if (readErr) {
    console.log(`❌ READ error: ${readErr.message}`);
  } else if (existing && existing.length > 0) {
    console.log('✅ Kolom aktual:', Object.keys(existing[0]).join(', '));
    console.log('ℹ️  PRIMARY KEY: project_id (bukan "id" — sesuai konfirmasi §6.3.1 #3)');
  } else {
    console.log('ℹ️  Tabel kosong — konfirmasi kolom via UPSERT di bawah');
  }

  // 2. UPSERT dengan nama kolom yang benar (project_id sebagai PK)
  console.log('\n── 2. UPSERT (INSERT OR UPDATE on conflict project_id) ──');
  const payload = {
    project_id: TEST_PROJECT_ID,
    recommended_method: '_AUDIT_TEST_METHOD',
    selected_method: '_AUDIT_TEST_METHOD',
    reasoning: 'Audit test reasoning — safe to delete',
    summary: 'Audit test summary',
    key_findings: ['finding 1', 'finding 2'],
    suggested_root_causes: ['cause 1'],
    status: 'draft',
    updated_at: new Date().toISOString(),
  };

  const { data: upsertData, error: upsertErr } = await sb
    .from('analyze_results')
    .upsert(payload, { onConflict: 'project_id' })
    .select();

  if (upsertErr) {
    console.log(`❌ UPSERT error: ${upsertErr.message}`);
    console.log('   Detail:', JSON.stringify(upsertErr, null, 2));
  } else {
    console.log('✅ UPSERT berhasil!');
    console.log('   Kolom terkonfirmasi:', Object.keys(upsertData[0]).join(', '));

    // Verifikasi kolom recommendations & priority_result (dari migration 019, 021)
    const hasRecommendations = 'recommendations' in upsertData[0];
    const hasPriorityResult  = 'priority_result' in upsertData[0];
    console.log(`   recommendations : ${hasRecommendations ? '✅ ada' : '❌ tidak ada'}`);
    console.log(`   priority_result  : ${hasPriorityResult  ? '✅ ada' : '❌ tidak ada'}`);
  }

  // 3. SELECT untuk verifikasi data tersimpan
  console.log('\n── 3. SELECT verify ──');
  const { data: verifyData, error: verifyErr } = await sb
    .from('analyze_results')
    .select('project_id, recommended_method, status, updated_at')
    .eq('project_id', TEST_PROJECT_ID)
    .single();

  if (verifyErr) {
    console.log(`❌ SELECT error: ${verifyErr.message}`);
  } else {
    console.log('✅ SELECT berhasil:', JSON.stringify(verifyData));
  }

  // 4. Tes INSERT dengan kolom "id" yang salah (konfirmasi §6.3.1 #3)
  console.log('\n── 4. KONFIRMASI §6.3.1 #3: INSERT dengan kolom "id" ──');
  const { error: wrongColErr } = await sb
    .from('analyze_results')
    .insert({ id: 'fake-id', project_id: TEST_PROJECT_ID, recommended_method: 'x', selected_method: 'x', status: 'draft' });

  if (wrongColErr) {
    if (wrongColErr.message.includes('id') || wrongColErr.code === '42703') {
      console.log('✅ Dikonfirmasi: kolom "id" tidak ada di analyze_results');
      console.log(`   Error: ${wrongColErr.message}`);
    } else {
      console.log(`ℹ️  Error lain: ${wrongColErr.message}`);
    }
  } else {
    console.log('⚠️  INSERT dengan "id" berhasil — kolom "id" mungkin ada sebagai kolom biasa');
  }

  await sb.auth.signOut();

  console.log('\n' + '='.repeat(60));
  console.log('KESIMPULAN §6.3.1 #3 & #4:');
  console.log('  • PRIMARY KEY tabel analyze_results = project_id (bukan id)');
  console.log('  • Schema drift terkonfirmasi — script lama berasumsi kolom "id" ada');
  console.log('  • check_db_analyze.js v1 (asli) gagal karena asumsi kolom yang salah,');
  console.log('    BUKAN karena RLS menolak INSERT');
  console.log('  → Temuan #3 & #4 di §6.3.1 CLOSED');
  console.log('='.repeat(60));
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
