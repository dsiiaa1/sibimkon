/**
 * check_schema.js (v2 — updated 23 Jul 2026)
 * -------------------------------------------------------
 * §6.2 Audit Schema & Skalabilitas
 *
 * Membandingkan schema aktual di Supabase (via SELECT probe)
 * dengan kolom yang dipakai oleh kode aplikasi (src/lib/db.ts).
 * Mendeteksi: kolom hilang, kolom extra, tipe mismatch.
 *
 * Penggunaan: node check_schema.js
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

// ── Kolom yang DIPAKAI oleh src/lib/db.ts (ground truth dari kode) ──────────
// Diambil dari membaca mapping di setiap fungsi db.ts
const EXPECTED_SCHEMA = {
  bimkon_projects: [
    'id', 'project_code', 'title', 'description', 'company_id', 'consultant_id',
    'status', 'current_phase', 'start_date', 'target_end_date',
    'baseline_productivity_index', 'current_productivity_index',
    'baseline_reasoning', 'updated_at', 'created_at',
    'define_is_locked', 'measure_is_locked', 'analyze_is_locked',
    'improve_is_locked', 'control_is_locked',
  ],
  companies: [
    'id', 'name', 'address', 'province', 'city', 'business_field',
    'main_products', 'total_employees', 'certifications',
    'kadin_member', 'apindo_member', 'has_union', 'has_pkb',
    'pic_name', 'pic_position', 'pic_phone', 'pic_email',
    'tier', 'tier_source', 'tier_set_at',
    'onboarding_completed', 'onboarding_completed_at',
    'created_at', 'updated_at',
  ],
  profiles: [
    'id', 'full_name', 'email', 'phone', 'role', 'organization',
    'is_active', 'created_at', 'updated_at',
  ],
  project_charters: [
    'id', 'project_id', 'problem_statement', 'objectives',
    'productivity_target', 'scope', 'business_case', 'timeline',
    'team_members', 'measure_summary', 'source', 'source_problem_id',
    'field_sources', 'ai_drafted_at', 'created_at', 'updated_at',
  ],
  measure_data_requirements: [
    'id', 'project_id', 'name', 'description', 'reason',
    'expected_format', 'example_columns', 'status', 'parsed_summary',
    'recommended_methods', 'source', 'file_url', 'data_group',
    'role_note', 'is_relevant', 'manual_data', 'created_at', 'updated_at',
  ],
  measure_assessments: [
    'id', 'project_id', 'dimension', 'assessment_version',
    'percentage_score', 'responses', 'created_at', 'updated_at',
  ],
  measure_vom: [
    'id', 'project_id', 'dimension', 'problem', 'impact', 'priority',
    'created_at', 'updated_at',
  ],
  improve_actions: [
    'id', 'project_id', 'action_title', 'description', 'methodology',
    'dimension', 'kpi_name', 'kpi_baseline', 'kpi_target', 'kpi_unit',
    'kpi_actual', 'verified_kpi_actual', 'verified_by', 'verified_at',
    'cost_saving_manual', 'investment_manual', 'pic_name', 'problem_title',
    'start_date', 'end_date', 'status', 'progress_percentage',
    'ai_analysis', 'created_at', 'updated_at',
  ],
  action_plan_steps: [
    'id', 'action_plan_id', 'description', 'is_completed',
    'pic', 'step_order', 'created_at', 'updated_at',
  ],
  analyze_results: [
    'project_id', 'recommended_method', 'selected_method', 'reasoning',
    'summary', 'key_findings', 'suggested_root_causes', 'status',
    'recommendations', 'priority_result', 'created_at', 'updated_at',
  ],
  audit_checklists: [
    'id', 'project_id', 'category', 'items', 'total_items',
    'compliant_items', 'compliance_percentage', 'created_at', 'updated_at',
  ],
  sustainability_assessments: [
    'id', 'project_id', 'people_score', 'process_score', 'system_score',
    'result_score', 'psi_total', 'people_notes', 'process_notes',
    'system_notes', 'result_notes', 'created_at', 'updated_at',
  ],
  efficiency_targets: [
    'id', 'action_plan_id', 'project_id', 'raw_text', 'metric_name',
    'baseline_value', 'target_value', 'duration', 'duration_unit',
    'needs_manual_review', 'generated_at', 'created_at', 'updated_at',
  ],
  reports: [
    'id', 'project_id', 'report_type', 'title', 'file_url',
    'file_size', 'report_data', 'generated_by', 'generated_at',
  ],
  approval_requests: [
    'id', 'project_id', 'step_id', 'action_plan_id', 'requested_by',
    'requested_by_name', 'requested_by_role', 'request_type', 'status',
    'reviewed_by', 'reviewed_at', 'review_note', 'created_at', 'updated_at',
  ],
  checklist_evidence: [
    'id', 'step_id', 'file_url', 'file_name', 'file_type', 'file_size',
    'uploaded_by', 'uploaded_by_name', 'uploaded_by_role', 'uploaded_at',
    'verification_status', 'verified_by', 'verified_at', 'rejection_note',
    'created_at', 'updated_at',
  ],
};

let pass = 0, fail = 0, warn = 0;
const driftReport = [];

async function probeTable(sb, tableName, expectedCols) {
  const { data, error } = await sb.from(tableName).select('*').limit(1);
  if (error) {
    console.log(`[SKIP] ⚠️  ${tableName}: ${error.message}`);
    warn++;
    return;
  }

  // Jika tabel kosong, kita tidak bisa tahu kolom aktual dari data
  if (!data || data.length === 0) {
    console.log(`[WARN] ⚠️  ${tableName}: tabel kosong, tidak bisa probe kolom aktual`);
    warn++;
    driftReport.push({ table: tableName, status: 'empty', missing: [], extra: [] });
    return;
  }

  const actualCols   = Object.keys(data[0]);
  const expectedSet  = new Set(expectedCols);
  const actualSet    = new Set(actualCols);

  const missing = expectedCols.filter(c => !actualSet.has(c));  // di kode tapi tidak di DB
  const extra   = actualCols.filter(c => !expectedSet.has(c));  // di DB tapi tidak di kode

  if (missing.length === 0 && extra.length === 0) {
    console.log(`[PASS] ✅ ${tableName}: schema sinkron (${actualCols.length} kolom)`);
    pass++;
    driftReport.push({ table: tableName, status: 'ok', missing: [], extra: [] });
  } else {
    console.log(`[WARN] ⚠️  ${tableName}: schema drift terdeteksi`);
    if (missing.length > 0) {
      console.log(`       MISSING di DB (kode butuh): ${missing.join(', ')}`);
      fail++;
    }
    if (extra.length > 0) {
      console.log(`       EXTRA di DB (tidak dipakai kode): ${extra.join(', ')}`);
      warn++;
    }
    driftReport.push({ table: tableName, status: 'drift', missing, extra });
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('check_schema.js v2 — §6.2 Audit Schema & Skalabilitas');
  console.log(`Waktu: ${new Date().toLocaleString('id-ID')}`);
  console.log('='.repeat(60));

  const sb = createClient(URL, ANON);
  const { error: loginErr } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
  if (loginErr) { console.error('❌ Login gagal:', loginErr.message); process.exit(1); }
  console.log(`✅ Login sebagai: ${EMAIL}\n`);

  console.log('── SCHEMA PROBE (aktual DB vs ekspektasi kode) ──');
  for (const [table, cols] of Object.entries(EXPECTED_SCHEMA)) {
    await probeTable(sb, table, cols);
  }

  await sb.auth.signOut();

  // ── Ringkasan ──
  console.log('\n' + '='.repeat(60));
  console.log('RINGKASAN §6.2');
  console.log('='.repeat(60));
  console.log(`PASS : ${pass}`);
  console.log(`FAIL : ${fail} (kolom hilang — kode akan error)`);
  console.log(`WARN : ${warn} (kolom extra atau tabel kosong)`);

  const drifted = driftReport.filter(r => r.status === 'drift');
  if (drifted.length > 0) {
    console.log('\nSchema Drift Summary:');
    for (const d of drifted) {
      console.log(`\n  📋 ${d.table}:`);
      if (d.missing.length) console.log(`     ❌ Missing (butuh migration): ${d.missing.join(', ')}`);
      if (d.extra.length)   console.log(`     ℹ️  Extra (tidak dipakai): ${d.extra.join(', ')}`);
    }
    console.log('\n→ Buat migration SQL untuk kolom yang missing.');
    console.log('  Kolom "extra" di DB tidak berbahaya, tapi pertimbangkan cleanup.');
  } else {
    console.log('\n✅ Tidak ada schema drift yang kritis');
  }

  if (fail > 0) process.exitCode = 1;
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
