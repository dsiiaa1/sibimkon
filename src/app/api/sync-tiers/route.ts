import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMockDB, updateMockDB } from '@/lib/mockData'

export async function POST() {
  try {
    let sb: any = null
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        sb = await createClient()
      }
    } catch (e) {}

    let updatedCount = 0

    if (sb) {
      // 1. Ambil semua assessment yang di-submit
      const { data: assessments, error: fetchErr } = await sb
        .from('company_baseline_assessments')
        .select('*')
        .eq('status', 'submitted')
      
      if (fetchErr) throw fetchErr

      if (assessments && assessments.length > 0) {
        for (const assessment of assessments) {
          if (!assessment.struktur_staf) continue
          
          const staf = assessment.struktur_staf
          let totalKaryawan = 0
          if (staf.karyawan_tetap?.jumlah) totalKaryawan += Number(staf.karyawan_tetap.jumlah)
          if (staf.manajer?.jumlah) totalKaryawan += Number(staf.manajer.jumlah)
          if (staf.supervisor?.jumlah) totalKaryawan += Number(staf.supervisor.jumlah)
          if (staf.karyawan_tetap_lain?.jumlah) totalKaryawan += Number(staf.karyawan_tetap_lain.jumlah)
          if (staf.karyawan_kontrak?.jumlah) totalKaryawan += Number(staf.karyawan_kontrak.jumlah)
          
          let calculatedTier = 'menengah'
          if (totalKaryawan < 30) calculatedTier = 'simple'
          else if (totalKaryawan > 150) calculatedTier = 'besar'

          const { error: updateErr } = await sb.from('companies').update({
            jumlah_tenaga_kerja: totalKaryawan,
            tier: calculatedTier,
            tier_source: 'auto_calculated'
          }).eq('id', assessment.company_id)

          if (!updateErr) updatedCount++
        }
      }
    } else {
      // Fallback ke MockDB
      const db = getMockDB()
      const assessments = Object.values(db.companyBaselineAssessments).filter((a: any) => a.status === 'submitted')
      
      for (const assessment of assessments as any[]) {
        if (!assessment.struktur_staf) continue
        
        const staf = assessment.struktur_staf
        let totalKaryawan = 0
        if (staf.karyawan_tetap?.jumlah) totalKaryawan += Number(staf.karyawan_tetap.jumlah)
        if (staf.manajer?.jumlah) totalKaryawan += Number(staf.manajer.jumlah)
        if (staf.supervisor?.jumlah) totalKaryawan += Number(staf.supervisor.jumlah)
        if (staf.karyawan_tetap_lain?.jumlah) totalKaryawan += Number(staf.karyawan_tetap_lain.jumlah)
        if (staf.karyawan_kontrak?.jumlah) totalKaryawan += Number(staf.karyawan_kontrak.jumlah)
        
        let calculatedTier = 'menengah'
        if (totalKaryawan < 30) calculatedTier = 'simple'
        else if (totalKaryawan > 150) calculatedTier = 'besar'

        const compIdx = db.companies.findIndex((c: any) => c.id === assessment.company_id)
        if (compIdx >= 0) {
          db.companies[compIdx].jumlah_tenaga_kerja = totalKaryawan
          db.companies[compIdx].tier = calculatedTier
          db.companies[compIdx].tier_source = 'auto_calculated'
          updatedCount++
        }
      }
      updateMockDB('companies', db.companies)
    }

    return NextResponse.json({ success: true, updatedCount })

  } catch (error: any) {
    console.error('[API/sync-tiers] error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat menyinkronkan tier.' },
      { status: 500 }
    )
  }
}
