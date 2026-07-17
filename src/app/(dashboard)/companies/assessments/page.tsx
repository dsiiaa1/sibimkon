'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCompanies, getAllCompanyBaselineAssessments } from '@/lib/db'
import { Company, CompanyBaselineAssessment } from '@/lib/mockData'
import { Building, FileCheck, Search, ArrowRight, Clock, CheckCircle2 } from 'lucide-react'

export default function ConsultantAssessmentsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [assessments, setAssessments] = useState<Record<string, CompanyBaselineAssessment>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const comps = await getCompanies()
      const allAssessments = await getAllCompanyBaselineAssessments()
      
      const assessmentMap: Record<string, CompanyBaselineAssessment> = {}
      allAssessments.forEach((a: CompanyBaselineAssessment) => {
        assessmentMap[a.company_id] = a
      })

      setCompanies(comps)
      setAssessments(assessmentMap)
      setLoading(false)
    }
    loadData()
  }, [])

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.business_field.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return <div className="text-slate-400 p-8">Loading...</div>
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-indigo-400" />
            Baseline Assessment Klien
          </h1>
          <p className="text-xs text-slate-500 mt-1">Daftar kuesioner onboarding perusahaan untuk proses AI Problem Identification</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari nama perusahaan atau bidang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-slate-200"
          />
        </div>
      </div>

      {/* Companies List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/20 rounded-3xl border border-slate-800/50 border-dashed">
            Tidak ada perusahaan yang ditemukan
          </div>
        ) : (
          filteredCompanies.map((company) => {
            const assessment = assessments[company.id]
            let statusText = 'Belum Diisi'
            let statusColor = 'text-slate-400 bg-slate-400/10 border-slate-400/20'
            let statusIcon = <Clock className="h-4 w-4 mr-1.5" />
            
            if (assessment?.status === 'draft') {
              statusText = 'Draft'
              statusColor = 'text-amber-400 bg-amber-400/10 border-amber-400/20'
            } else if (assessment?.status === 'submitted' || assessment?.status === 'locked') {
              statusText = 'Menunggu Analisa AI'
              statusColor = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
              statusIcon = <CheckCircle2 className="h-4 w-4 mr-1.5" />
            }

            return (
              <div key={company.id} className="glass-card rounded-3xl p-6 border border-slate-800/80 hover:border-indigo-500/50 transition-all flex flex-col group relative overflow-hidden bg-slate-950/40">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <Building className="h-6 w-6 text-indigo-400" />
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColor}`}>
                    {statusIcon}
                    {statusText}
                  </span>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {company.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{company.business_field}</p>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between">
                  <Link 
                    href={`/companies/${company.id}`}
                    className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 text-xs font-semibold transition-colors"
                  >
                    Buka Dashboard <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
