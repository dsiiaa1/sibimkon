/**
 * POST /api/validate-pqcdsm
 * Automated Data Validation Engine — PRD §5.2
 *
 * Request body:
 * {
 *   sourceTable: string        // tabel asal data
 *   recordId: string           // id atau project_id dari record
 *   projectId: string          // UUID proyek
 *   data: Record<string, any>  // nilai yang akan divalidasi
 *   saveToLog?: boolean        // default true — simpan hasil ke data_audit_log
 * }
 *
 * Response:
 * {
 *   isValid: boolean
 *   hasWarnings: boolean
 *   results: ValidationResult[]
 *   logIds?: string[]   // id baris yang dibuat di data_audit_log
 * }
 *
 * Closes AC §5.2 #1 — "Setiap insert/update pada tabel metrik PQCDSM
 * melewati validation layer"
 */

import { NextResponse } from 'next/server'
import { validateRecord, toAuditLogEntries } from '@/lib/validation-engine'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sourceTable, recordId, projectId, data, saveToLog = true } = body

    // Validasi input wajib
    if (!sourceTable || !recordId || !projectId || !data) {
      return NextResponse.json(
        { error: 'sourceTable, recordId, projectId, dan data wajib diisi' },
        { status: 400 }
      )
    }

    // Jalankan validation engine
    const report = validateRecord(sourceTable, recordId, projectId, data)

    // Jika ada kegagalan dan saveToLog = true, catat ke data_audit_log
    let logIds: string[] = []
    if (!report.isValid || report.hasWarnings) {
      if (saveToLog) {
        try {
          // Gunakan service role key untuk bypass RLS.
          // API route berjalan server-side tanpa sesi pengguna,
          // sehingga anon key akan ditolak oleh RLS policy.
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (!serviceKey) {
            console.error('[validate-pqcdsm] SUPABASE_SERVICE_ROLE_KEY tidak diset — log dilewati')
          } else {
            const { createClient: createServiceClient } = await import('@supabase/supabase-js')
            const serviceSupabase = createServiceClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              serviceKey,
              { auth: { persistSession: false } }
            )

            const entries = toAuditLogEntries(report)
            if (entries.length > 0) {
              const { data: inserted, error: logErr } = await serviceSupabase
                .from('data_audit_log')
                .insert(entries)
                .select('id')

              if (logErr) {
                console.error('[validate-pqcdsm] Gagal simpan ke data_audit_log:', logErr.message)
              } else {
                logIds = inserted?.map((r: { id: string }) => r.id) ?? []
              }
            }
          }
        } catch (logException) {
          console.error('[validate-pqcdsm] Exception saat logging:', logException)
        }
      }
    }

    return NextResponse.json({
      isValid: report.isValid,
      hasWarnings: report.hasWarnings,
      results: report.results,
      ...(logIds.length > 0 && { logIds }),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[validate-pqcdsm] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
