'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCompanies, getProjects } from '@/lib/db'
import { Company, Project } from '@/lib/mockData'
import { Building, ArrowLeft, Plus, User, Phone, Mail, ArrowRight } from 'lucide-react'
import { PROJECT_STATUS_LABELS } from '@/lib/utils'
import CreateProjectModal from '@/components/CreateProjectModal'

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string

  const [company, setCompany] = useState<Company | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('unknown')
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      const localUser = localStorage.getItem('sibimkon_user')
      if (localUser) {
        const u = JSON.parse(localUser)
        setCurrentUserId(u.id || 'unknown')
        setCurrentUser(u)
      }
      const comps = await getCompanies()
      const comp = comps.find(c => c.id === companyId)
      if (!comp) {
        router.push('/companies')
        return
      }
      setCompany(comp)

      const allProjects = await getProjects()
      const compProjects = allProjects.filter(p => p.company_id === companyId)
      setProjects(compProjects)
    }
    loadData()
  }, [companyId, router])

  if (!company) {
    return <div className="text-center py-20 text-slate-400 text-sm">Memuat profil perusahaan...</div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back link */}
      <div>
        <Link href="/companies" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Daftar Perusahaan
        </Link>
      </div>

      {/* Header Profile Panel */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        
        {/* Company profile column */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xl">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-100">{company.name}</h1>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 text-indigo-400">
                {company.business_field || 'Umum'}
              </span>
            </div>
          </div>
          <div className="space-y-2 text-xs text-slate-400">
            <p>📍 <span className="text-slate-300 font-medium">{company.address || `${company.city}, ${company.province}`}</span></p>
            <p>👥 Tenaga Kerja: <span className="text-slate-300 font-semibold">{company.total_employees} Orang</span></p>
            {company.certifications && company.certifications.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Sertifikasi:</span>
                {company.certifications.map(c => (
                  <span key={c} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] font-medium text-slate-300">{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PIC Contact column */}
        <div className="bg-slate-950/60 border border-slate-900/60 rounded-2xl p-5 space-y-3.5 text-xs">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-500" /> Kontak PIC Utama
          </h3>
          {company.pic_name ? (
            <div className="space-y-2 text-slate-350">
              <p className="font-bold text-slate-200">{company.pic_name}</p>
              <p className="text-indigo-400 font-medium">{company.pic_position}</p>
              <div className="space-y-1 pt-1 text-slate-400">
                {company.pic_phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-600" /> {company.pic_phone}</p>}
                {company.pic_email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-600" /> {company.pic_email}</p>}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 italic">Belum ada data kontak PIC.</p>
          )}
        </div>
      </div>

      {/* Projects List Panel */}
      <div className="rounded-3xl border border-slate-850 bg-slate-950/20 p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-850 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-200">Daftar Proyek Pendampingan</h2>
            <p className="text-xs text-slate-500">Seluruh proyek BIMKON aktif dan selesai untuk perusahaan ini</p>
          </div>
          <button 
            onClick={() => setShowNewProjectModal(true)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer transform hover:-translate-y-0.5"
            style={{background: 'linear-gradient(135deg, #b8860b, #d4a017, #f4c430)', color: 'var(--navy-950)', boxShadow: '0 6px 20px rgba(212,160,23,0.15)'}}
          >
            <Plus className="h-3.5 w-3.5" />
            Mulai Proyek Baru
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl">
            Belum ada proyek terdaftar untuk perusahaan ini. Klik "Mulai Proyek Baru" di atas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map(proj => {
              const statusInfo = PROJECT_STATUS_LABELS[proj.status] || { label: proj.status, color: 'bg-slate-550' }
              return (
                <div key={proj.id} className="glass-card rounded-2xl border border-slate-800/60 bg-slate-950/35 p-5 flex flex-col justify-between hover:border-slate-700 transition-all group hover:-translate-y-0.5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-indigo-400">{proj.project_code}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{proj.title}</h3>
                      <p className="text-xs text-slate-450 line-clamp-2 leading-relaxed">{proj.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-850 text-xs text-slate-400">
                      <div>
                        <span>Mulai</span>
                        <p className="font-semibold text-slate-300 mt-0.5">{proj.start_date}</p>
                      </div>
                      <div>
                        <span>Selesai</span>
                        <p className="font-semibold text-slate-300 mt-0.5">{proj.target_end_date}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 pt-3.5 border-t border-slate-850 flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-400">
                      Index: <span className="text-emerald-400 font-bold">{proj.current_score || 0}%</span>
                    </div>
                    <Link href={`/projects/${proj.id}/define`} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                      Kelola DMAIC <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showNewProjectModal && company && (
        <CreateProjectModal
          companies={[]}
          currentUser={currentUser}
          currentUserId={currentUserId}
          fixedCompanyId={company.id}
          fixedCompanyName={company.name}
          onCreated={(proj) => setProjects(prev => [...prev, proj])}
          onClose={() => setShowNewProjectModal(false)}
        />
      )}
    </div>
  )
}
