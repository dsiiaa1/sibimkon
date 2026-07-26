import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMockDB, updateMockDB } from '@/lib/mockData'
import { determineTier } from '@/lib/utils'

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
      // 1. Ambil semua company
      const { data: companies, error: compErr } = await sb.from('companies').select('*')
      if (compErr) throw compErr
      
      const { data: assessments, error: fetchErr } = await sb
        .from('company_baseline_assessments')
        .select('*')
        .eq('status', 'submitted')
      
      if (companies && companies.length > 0) {
        for (const comp of companies) {
          const assessment = assessments?.find((a: any) => a.company_id === comp.id)
          let totalKaryawan = comp.jumlah_tenaga_kerja || comp.total_employees || 0

          if (assessment && assessment.struktur_staf) {
            const staf = assessment.struktur_staf
            let totalDariStaf = 0
            if (staf.karyawan_tetap?.jumlah) totalDariStaf += Number(staf.karyawan_tetap.jumlah)
            if (staf.manajer?.jumlah) totalDariStaf += Number(staf.manajer.jumlah)
            if (staf.supervisor?.jumlah) totalDariStaf += Number(staf.supervisor.jumlah)
            if (staf.karyawan_tetap_lain?.jumlah) totalDariStaf += Number(staf.karyawan_tetap_lain.jumlah)
            if (staf.karyawan_kontrak?.jumlah) totalDariStaf += Number(staf.karyawan_kontrak.jumlah)
            if (totalDariStaf > 0) totalKaryawan = totalDariStaf
          }
          
          let calculatedTier = determineTier(totalKaryawan, comp.annual_revenue_idr)

          const { error: updateErr } = await sb.from('companies').update({
            total_employees: totalKaryawan,
            tier: calculatedTier,
            tier_source: 'auto_calculated'
          }).eq('id', comp.id)

          if (updateErr) throw new Error(`Gagal update perusahaan ${comp.id}: ${updateErr.message}`)
          updatedCount++
        }
      }
    } else {
      // Fallback ke MockDB
      const db = getMockDB()
      
      for (let i = 0; i < db.companies.length; i++) {
        const comp = db.companies[i]
        const assessment = Object.values(db.companyBaselineAssessments).find(
          (a: any) => a.company_id === comp.id && a.status === 'submitted'
        ) as any

        let totalKaryawan = comp.jumlah_tenaga_kerja || comp.total_employees || 0

        if (assessment && assessment.struktur_staf) {
          const staf = assessment.struktur_staf
          let totalDariStaf = 0
          if (staf.karyawan_tetap?.jumlah) totalDariStaf += Number(staf.karyawan_tetap.jumlah)
          if (staf.manajer?.jumlah) totalDariStaf += Number(staf.manajer.jumlah)
          if (staf.supervisor?.jumlah) totalDariStaf += Number(staf.supervisor.jumlah)
          if (staf.karyawan_tetap_lain?.jumlah) totalDariStaf += Number(staf.karyawan_tetap_lain.jumlah)
          if (staf.karyawan_kontrak?.jumlah) totalDariStaf += Number(staf.karyawan_kontrak.jumlah)
          if (totalDariStaf > 0) totalKaryawan = totalDariStaf
        }

        let calculatedTier = determineTier(totalKaryawan, comp.annual_revenue_idr)

        db.companies[i].total_employees = totalKaryawan
        db.companies[i].tier = calculatedTier
        db.companies[i].tier_source = 'auto_calculated'
        updatedCount++
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
