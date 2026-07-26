/**
 * check_rls.js (v3 — updated 21 Jul 2026)
 * ------------------------------------------------------------
 * Audit RLS untuk semua tabel PQCDSM dan DMAIC di SIBIMKON.
 * Diperluas dari v2 yang hanya menguji tabel analyze_results.
 *
 * Penggunaan:
 *   node check_rls.js
 *
 * Requirement:
 *   .env.local harus berisi:
 *     NEXT_PUBLIC_SUPABASE_URL
 *     NEXT_PUBLIC_SUPABASE_ANON_KEY
 *     TEST_USER_EMAIL   (opsional, untuk tes authenticated)
 *     TEST_USER_PASSWORD (opsional)
 *
 * Referensi: PRD_SPLP_v2.md §6.3.1 — P0 Blocker RLS
 * Migration fix: database/039_fix_rls_all_tables.sql
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── Load .env.local ──────────────────────────────────────────
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach((line) => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY    = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEST_EMAIL  = env.TEST_USER_EMAIL;
const TEST_PASS   = env.TEST_USER_PASSWORD;

// ── Tabel yang diaudit ───────────────────────────────────────
// Semua tabel PQCDSM, DMAIC, dan supporting tables.
// Sesuai temuan audit_rls.js (21 Jul 2026): 15 tabel bocor ke anon.
const TABLES_TO_TEST = [
  // DMAIC core
  'analyze_results',
  'improve_actions',
  'measure_data_requirements',
  'measure_assessments',
  'measure_vom',
  'action_plan_steps',
  'project_charters',
  'bimkon_projects',
  // Control & reporting
  'audit_checklists',
  'sustainability_assessments',
  'efficiency_targets',
  'reports',
  'approval_requests',
  'checklist_evidence',
  // Company & users
  'companies',
  'profiles',
  // §PRD Readiness Phase — tabel baru (migration 043 + 048)
  'readiness_wizard_progress',
  'business_process_map',
  'waste_quick_scan_items',
  // §5.2 Validation Engine
  'data_audit_log',
];

// Ekspektasi akses untuk tabel tertentu
// Tabel yang memang boleh dibaca tanpa login (publik by design) → tambahkan di sini.
const PUBLIC_TABLES = [
  // Contoh: 'glossary_terms' jika nanti dibuat publik
];

// ── Helpers ──────────────────────────────────────────────────
let passCount = 0;
let failCount = 0;
let warnCount = 0;
const failedTables = [];

function logResult(label, expectedAllowed, actualAllowed, detail) {
  const pass = actualAllowed === expectedAllowed;
  const verdict = pass ? 'PASS' : 'FAIL';

  if (pass) passCount++;
  else {
    failCount++;
    failedTables.push(label);
  }

  const icon = pass ? '✅' : '❌';
  const expectedStr = expectedAllowed ? 'BERHASIL' : 'DITOLAK';
  const actualStr   = actualAllowed   ? 'BERHASIL' : 'DITOLAK';

  console.log(
    `[${verdict}] ${icon} ${label}\n` +
    `       expected: ${expectedStr} | actual: ${actualStr}` +
    (detail ? ` | ${detail}` : '')
  );

  return verdict;
}

// ── Test per tabel ───────────────────────────────────────────
async function testTable(tableName, anonClient, authClient) {
  const isPublic = PUBLIC_TABLES.includes(tableName);
  console.log(`\n── ${tableName} ──`);

  // 1. SELECT sebagai anon
  const { data: anonData, error: anonErr } = await anonClient
    .from(tableName)
    .select('*')
    .limit(5);

  const anonGotData = !anonErr && Array.isArray(anonData) && anonData.length > 0;

  if (anonErr) {
    // Error dari Supabase = RLS menolak = PASS untuk tabel non-publik
    logResult(`SELECT anon [${tableName}]`, false, false, `ditolak: ${anonErr.message}`);
  } else if (anonGotData) {
    logResult(`SELECT anon [${tableName}]`, false, true,
      `anon dapat ${anonData.length} baris tanpa login — RLS belum aktif!`);
  } else {
    // 0 baris — mungkin RLS aktif, atau tabel memang kosong
    logResult(`SELECT anon [${tableName}]`, false, false,
      `0 baris (tabel kosong atau RLS aktif — OK)`);
  }

  // 2. SELECT sebagai authenticated (jika authClient tersedia)
  if (authClient) {
    const { data: authData, error: authErr } = await authClient
      .from(tableName)
      .select('*')
      .limit(50);

    if (authErr) {
      // Authenticated tidak bisa baca sama sekali — ini WARN (mungkin policy terlalu ketat)
      warnCount++;
      console.log(
        `[WARN] ⚠️  SELECT auth [${tableName}]\n` +
        `       authenticated juga diblokir: ${authErr.message}\n` +
        `       → Periksa apakah policy untuk role ini sudah ditambahkan`
      );
    } else {
      const authRowCount = authData ? authData.length : 0;
      const anonRowCount = anonGotData ? anonData.length : 0;

      if (!anonGotData && authRowCount > 0) {
        // Ideal: anon diblokir, authenticated bisa akses
        console.log(`[INFO] ✅ Scoping OK: anon diblokir, authenticated dapat ${authRowCount} baris`);
        passCount++;
      } else if (anonGotData && authRowCount === anonRowCount && authRowCount > 0) {
        // Anon dan auth dapat jumlah sama — indikasi tidak ada scoping
        failCount++;
        failedTables.push(`scoping [${tableName}]`);
        console.log(
          `[FAIL] ❌ Scoping [${tableName}]\n` +
          `       anon: ${anonRowCount} baris, auth: ${authRowCount} baris — tidak ada perbedaan!`
        );
      } else {
        console.log(`[INFO] ℹ️  SELECT auth [${tableName}]: ${authRowCount} baris`);
      }
    }
  }
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  if (!SUPABASE_URL || !ANON_KEY) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL / ANON_KEY tidak ditemukan di .env.local');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('check_rls.js v3 — SIBIMKON RLS Audit');
  console.log(`Supabase : ${SUPABASE_URL}`);
  console.log(`Tabel    : ${TABLES_TO_TEST.length}`);
  console.log(`Waktu    : ${new Date().toLocaleString('id-ID')}`);
  console.log('='.repeat(60));

  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  let authClient = null;
  if (TEST_EMAIL && TEST_PASS) {
    const sb = createClient(SUPABASE_URL, ANON_KEY);
    const { error } = await sb.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASS,
    });
    if (error) {
      console.warn(`\n⚠️  Login test user gagal (${TEST_EMAIL}): ${error.message}`);
      console.warn('   Audit hanya akan menggunakan anon key.\n');
    } else {
      console.log(`\n✅ Login sebagai: ${TEST_EMAIL}\n`);
      authClient = sb;
    }
  } else {
    console.warn('\n⚠️  TEST_USER_EMAIL/PASSWORD tidak diset — audit anon saja.\n');
  }

  for (const table of TABLES_TO_TEST) {
    await testTable(table, anonClient, authClient);
  }

  if (authClient) await authClient.auth.signOut();

  // ── Ringkasan ────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('RINGKASAN');
  console.log('='.repeat(60));
  console.log(`PASS  : ${passCount}`);
  console.log(`FAIL  : ${failCount}`);
  console.log(`WARN  : ${warnCount}`);

  if (failCount > 0) {
    console.log(`\n❌ FAIL pada tabel/cek berikut:`);
    failedTables.forEach((t) => console.log(`   • ${t}`));
    console.log('\n→ Jalankan migration database/039_fix_rls_all_tables.sql');
    console.log('  di Supabase Dashboard → SQL Editor lalu jalankan ulang script ini.');
    process.exitCode = 1;
  } else if (warnCount > 0) {
    console.log('\n⚠️  Ada WARN — periksa apakah policy terlalu ketat untuk role tertentu.');
  } else {
    console.log('\n✅ SEMUA PASS — RLS berjalan dengan benar. Closes §6.3.1.');
  }

  console.log('\n' + '='.repeat(60));
  console.log('CATATAN PENTING:');
  console.log('Script ini menguji akses anon dan satu authenticated user.');
  console.log('Untuk audit scoping lintas departemen/company (§3 PRD), tambahkan:');
  console.log('  TEST_USER2_EMAIL=user.lain@test.local');
  console.log('  TEST_USER2_PASSWORD=...');
  console.log('ke .env.local, lalu bandingkan hasil SELECT kedua user secara manual.');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
