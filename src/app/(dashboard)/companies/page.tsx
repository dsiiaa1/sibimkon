'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCompanies, getProjects, createCompany } from '@/lib/db'
import { Company, Project } from '@/lib/mockData'
import { Building, Search, Plus, User, Phone, Mail, ArrowRight } from 'lucide-react'

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [userRole, setUserRole] = useState<string>('')

  // New Company Form state
  const [newName, setNewName] = useState('')
  const [newField, setNewField] = useState('')
  const [newEmployees, setNewEmployees] = useState(50)
  const [newProvince, setNewProvince] = useState('Jawa Barat')
  const [newCity, setNewCity] = useState('')
  const [newAddress, setNewAddress] = useState('')
  
  // PIC data contacts
  const [picName, setPicName] = useState('')
  const [picPos, setPicPos] = useState('')
  const [picPhone, setPicPhone] = useState('')
  const [picEmail, setPicEmail] = useState('')

  useEffect(() => {
    async function loadData() {
      const localUser = localStorage.getItem('sibimkon_user')
      if (localUser) {
        const u = JSON.parse(localUser)
        setUserRole(u.role || '')
      }
      const comps = await getCompanies()
      const projs = await getProjects()
      setCompanies(comps)
      setProjects(projs)
    }
    loadData()
  }, [])

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName) return

    const newCompany = await createCompany({
      name: newName,
      address: newAddress,
      province: newProvince,
      city: newCity,
      business_field: newField,
      total_employees: Number(newEmployees),
      certifications: [],
      pic_name: picName,
      pic_position: picPos,
      pic_phone: picPhone,
      pic_email: picEmail,
    })

    setCompanies(prev => [...prev, newCompany])
    
    // Close modal & reset fields
    setShowAddModal(false)
    setNewName('')
    setNewField('')
    setNewCity('')
    setNewAddress('')
    setNewEmployees(50)
    setPicName('')
    setPicPos('')
    setPicPhone('')
    setPicEmail('')
  }

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.business_field.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Building className="h-6 w-6 text-indigo-400" />
            Daftar Perusahaan Klien
          </h1>
          <p className="text-xs text-slate-500">Kelola profil perusahaan dan data kontak PIC terdaftar</p>
        </div>
        <div className="sm:ml-auto">
          <button 
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer transform hover:-translate-y-0.5"
            style={{background: 'linear-gradient(135deg, #b8860b, #d4a017, #f4c430)', color: 'var(--navy-950)', boxShadow: '0 6px 20px rgba(212,160,23,0.20)'}}
          >
            <Plus className="h-4 w-4" />
            Daftarkan Perusahaan Baru
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari perusahaan, bidang usaha, kota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map(comp => {
          const compProjects = projects.filter(p => p.company_id === comp.id)
          const activeCount = compProjects.filter(p => p.status !== 'completed').length
          
          return (
            <div key={comp.id} className="glass-card rounded-2xl border border-slate-800/60 bg-slate-950/30 p-6 flex flex-col justify-between hover:border-slate-700 transition-all group hover:-translate-y-0.5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 px-2.5 py-0.5 rounded text-indigo-400">
                    {comp.business_field || 'Umum'}
                  </span>
                  <span className="text-xs text-slate-500">
                    👥 {comp.total_employees} Tenaga Kerja
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                    {comp.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    📍 {comp.address || `${comp.city}, ${comp.province}`}
                  </p>
                </div>

                {/* PIC Details Box */}
                <div className="bg-slate-950/50 border border-slate-900/60 rounded-xl p-3.5 space-y-2 text-xs text-slate-350">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <User className="h-3 w-3" /> Person in Charge (PIC)
                  </div>
                  {comp.pic_name ? (
                    <div className="space-y-1">
                      <p className="font-bold text-slate-200">{comp.pic_name} <span className="font-normal text-slate-500">({comp.pic_position})</span></p>
                      {comp.pic_phone && <p className="flex items-center gap-1.5 text-slate-400"><Phone className="h-3 w-3 text-slate-500" /> {comp.pic_phone}</p>}
                      {comp.pic_email && <p className="flex items-center gap-1.5 text-slate-400"><Mail className="h-3 w-3 text-slate-500" /> {comp.pic_email}</p>}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">Data kontak PIC belum diisi.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-850 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Proyek Aktif</span>
                    <span className="text-sm font-bold text-indigo-400">{activeCount} Proyek</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Total Proyek</span>
                    <span className="text-sm font-semibold text-slate-300">{compProjects.length} Proyek</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-850 flex items-center justify-end">
                <Link
                  href={`/companies/${comp.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Detail Perusahaan &amp; Proyek
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background: 'rgba(2,6,15,0.80)', backdropFilter: 'blur(8px)'}}>
          <div className="w-full max-w-lg rounded-3xl overflow-hidden" style={{background: 'var(--navy-900)', border: '1px solid var(--border-base)', boxShadow: '0 30px 80px rgba(0,0,0,0.60)'}}>
            <div className="px-6 py-4 flex items-center justify-between" style={{borderBottom: '1px solid var(--border-base)', background: 'var(--navy-950)'}}>
              <h3 className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>Daftarkan Perusahaan Klien Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            
            <form onSubmit={handleCreateCompany} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Informasi Perusahaan</h4>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nama Perusahaan</label>
                  <input type="text" required placeholder="PT Nama Perusahaan Klien" value={newName} onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-250 text-xs focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Bidang Usaha</label>
                    <input type="text" required placeholder="Garmen / Food / Tekstil" value={newField} onChange={(e) => setNewField(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-250 text-xs focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tenaga Kerja</label>
                    <input type="number" required value={newEmployees} onChange={(e) => setNewEmployees(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-250 text-xs focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Provinsi</label>
                    <input type="text" placeholder="Jawa Barat" value={newProvince} onChange={(e) => setNewProvince(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-250 text-xs focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Kota</label>
                    <input type="text" required placeholder="Karawang / Karawang" value={newCity} onChange={(e) => setNewCity(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-250 text-xs focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Alamat Kantor/Pabrik</label>
                  <textarea placeholder="Jl. Industri Raya No. 10..." value={newAddress} onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-250 text-xs focus:outline-none h-14" />
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Kontak Person in Charge (PIC)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nama PIC</label>
                    <input type="text" placeholder="Nama Lengkap PIC" value={picName} onChange={(e) => setPicName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-250 text-xs focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Jabatan PIC</label>
                    <input type="text" placeholder="Supervisor Sewing / HR" value={picPos} onChange={(e) => setPicPos(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-250 text-xs focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">No. Telp / WhatsApp</label>
                    <input type="text" placeholder="08xxxxxxxx" value={picPhone} onChange={(e) => setPicPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-250 text-xs focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Email PIC</label>
                    <input type="email" placeholder="pic@perusahaan.com" value={picEmail} onChange={(e) => setPicEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-250 text-xs focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs text-slate-400">Batal</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-650 text-xs font-semibold text-white hover:bg-indigo-600 transition-all cursor-pointer shadow-md">Daftarkan Perusahaan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
