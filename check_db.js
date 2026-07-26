/**
 * check_db.js (v2 — updated 23 Jul 2026)
 * -------------------------------------------------------
 * §6.1 Audit Integrasi & Sinkronisasi Data
 *
 * Menguji write + read ke tabel utama DMAIC menggunakan
 * authenticated session (bukan anon), sesuai state RLS
 * setelah migration 039/041.
 *
 * Penggunaan: node check_db.js
 * Requirement: TEST_USER_EMAIL + TEST_USER_PASSWORD di .env.local
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
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

// Proyek nyata yang sudah ada di DB (untuk read test)
const REAL_PROJECT_ID = 'ab24090f-588c-43e2-9cb9-7f9b19a21a53';

let pass = 0, fail = 0;
const failures = [];

function ok(label, detail) {
  pass++;
  console.log(`[PASS] ✅ ${label}${detail ? ' | ' + detail : ''}`);
}
function err(label, detail) {
  fail++;
  failures.push(label);
  console.log(`[FAIL] ❌ ${label} | ${detail}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('check_db.js v2 — §6.1 Audit Integrasi & Sinkronisasi Data');
  console.log(`Waktu: ${new Date().toLocaleString('id-ID')}`);
  console.log('='.repeat(60));

  if (!EMAIL || !PASS) {
    console.error('❌ TEST_USER_EMAIL/PASSWORD tidak ada di .env.local');
    process.exit(1);
  }

  const sb = createClient(URL, ANON);
  const { error: loginErr } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
  if (loginErr) {
    console.error('❌ Login gagal:', loginErr.message);
    process.exit(1);
  }
  console.log(`✅ Login sebagai: ${EMAIL}\n`);

  // ── 1. READ: tabel-tabel utama ─────────────────────────────
  console.log('── READ TESTS ──');
  const readTables = [
    'bimkon_projects',
    'companies',
    'profiles',
    'project_charters',
    'measure_data_requirements',
    'measure_assessments',
    'measure_vom',
    'improve_actions',
    'action_plan_steps',
    'audit_checklists',
    'sustainability_assessments',
    'efficiency_targets',
    'reports',
    'checklist_evidence',
    'analyze_results',
  ];

  for (const table of readTables) {
    const t0 = Date.now();
    const { data, error } = await sb.from(table).select('*').limit(5);
    const ms = Date.now() - t0;
    if (error) {
      err(`READ ${table}`, `${error.message} (${ms}ms)`);
    } else {
      ok(`READ ${table}`, `${data.length} baris, ${ms}ms`);
    }
  }

  // ── 2. WRITE: INSERT + cleanup ke measure_data_requirements ─
  console.log('\n── WRITE TEST: measure_data_requirements ──');
  const testId = `test-${Date.now()}`;
  const { data: insertData, error: insertErr } = await sb
    .from('measure_data_requirements')
    .insert({
      project_id: REAL_PROJECT_ID,
      name: `_AUDIT_TEST_${testId}`,
      description: 'audit write test',
      reason: 'test',
      expected_format: 'csv',
      example_columns: ['col1', 'col2'],
      status: 'Belum diupload',
      source: 'manual',
      parsed_summary: null,
      recommended_methods: null,
    })
    .select();

  if (insertErr) {
    err('INSERT measure_data_requirements', insertErr.message);
  } else {
    ok('INSERT measure_data_requirements', `id: ${insertData[0]?.id}`);
    // Cleanup
    const { error: delErr } = await sb
      .from('measure_data_requirements')
      .delete()
      .eq('name', `_AUDIT_TEST_${testId}`);
    if (delErr) err('DELETE cleanup', delErr.message);
    else ok('DELETE cleanup measure_data_requirements');
  }

  // ── 3. WRITE: UPSERT ke analyze_results ──────────────────
  console.log('\n── WRITE TEST: analyze_results ──');
  const { data: upsertData, error: upsertErr } = await sb
    .from('analyze_results')
    .upsert({
      project_id: REAL_PROJECT_ID,
      recommended_method: '_AUDIT_TEST',
      selected_method: '_AUDIT_TEST',
      reasoning: 'audit test',
      summary: 'audit test',
      key_findings: ['test'],
      suggested_root_causes: ['test'],
      status: 'draft',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id' })
    .select();

  if (upsertErr) {
    err('UPSERT analyze_results', upsertErr.message);
  } else {
    ok('UPSERT analyze_results', `kolom: ${Object.keys(upsertData[0]).join(', ')}`);
  }

  // ── 4. LATENCY CHECK: 3x query bimkon_projects ───────────
  console.log('\n── LATENCY CHECK: bimkon_projects (3x) ──');
  const latencies = [];
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    await sb.from('bimkon_projects').select('id, title, status').limit(10);
    latencies.push(Date.now() - t0);
  }
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const max = Math.max(...latencies);
  if (avg < 2000) ok('Latency bimkon_projects', `avg ${avg}ms, max ${max}ms`);
  else err('Latency bimkon_projects', `avg ${avg}ms terlalu tinggi (target <2000ms)`);

  // ── 5. DATA CONSISTENCY: projects harus punya charters ───
  console.log('\n── DATA CONSISTENCY ──');
  const { data: projects } = await sb
    .from('bimkon_projects')
    .select('id, title, status')
    .not('status', 'eq', 'draft');

  const { data: charters } = await sb
    .from('project_charters')
    .select('project_id');

  if (projects && charters) {
    const charterIds = new Set(charters.map(c => c.project_id));
    const noCharter = projects.filter(p =>
      ['measure','analyze','improve','control','completed'].includes(p.status)
      && !charterIds.has(p.id)
    );
    if (noCharter.length === 0) {
      ok('Data consistency: projects dgn status lanjut punya charter');
    } else {
      err('Data consistency: projects tanpa charter',
        noCharter.map(p => `${p.title} (${p.status})`).join(', '));
    }
  }

  await sb.auth.signOut();

  // ── Ringkasan ─────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('RINGKASAN §6.1');
  console.log('='.repeat(60));
  console.log(`PASS : ${pass}`);
  console.log(`FAIL : ${fail}`);
  if (failures.length > 0) {
    console.log('\nFailed items:');
    failures.forEach(f => console.log(`  • ${f}`));
    process.exitCode = 1;
  } else {
    console.log('\n✅ Semua cek PASS — integrasi DB OK');
  }
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
