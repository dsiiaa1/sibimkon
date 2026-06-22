'use client'

import { useState, useEffect } from 'react'
import { getProjects, getCompanies, createCompany } from '@/lib/db'
import { Project, Company } from '@/lib/mockData'
import { Activity, Globe, MapPin, Award, Building, Plus } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts'

export default function AdminPanelPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState<any>(null)

  // Potential company registration form states
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false)
  const [newCompName, setNewCompName] = useState('')
  const [newCompField, setNewCompField] = useState('')
  const [newCompProvince, setNewCompProvince] = useState('Jawa Barat')
  const [newCompCity, setNewCompCity] = useState('')
  const [newCompAddress, setNewCompAddress] = useState('')
  const [newCompEmployees, setNewCompEmployees] = useState(50)

  useEffect(() => {
    async function loadData() {
      const [projs, comps] = await Promise.all([getProjects(), getCompanies()])
      setProjects(projs)
      setCompanies(comps)

      const localUser = localStorage.getItem('sibimkon_user')
      if (localUser) setUser(JSON.parse(localUser))
    }
    loadData()
  }, [])

  const disnakerProvince = user?.organization?.replace(/Disnaker\s+/i, '') || 'Jawa Barat'
  const isAdminDisnaker = user?.role === 'admin_disnaker'

  // Filtered lists
  const displayCompanies = isAdminDisnaker 
    ? companies.filter(c => c.province.toLowerCase() === disnakerProvince.toLowerCase())
    : companies

  const displayProjects = isAdminDisnaker
    ? projects.filter(p => {
        const comp = companies.find(c => c.id === p.company_id)
        return comp?.province.toLowerCase() === disnakerProvince.toLowerCase()
      })
    : projects

  // Metrics calculation
  const totalProjects = displayProjects.length
  const totalCompanies = displayCompanies.length
  const avgImprovement = displayProjects.reduce((acc, p) => acc + ((p.current_score || 0) - (p.baseline_score || 0)), 0) / (totalProjects || 1)
  const completedProjects = displayProjects.filter(p => p.status === 'completed' || p.status === 'control').length

  const handleRegisterPotentialCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCompName) return

    try {
      const newCompany = await createCompany({
        name: newCompName,
        address: newCompAddress,
        province: newCompProvince,
        city: newCompCity,
        business_field: newCompField,
        total_employees: Number(newCompEmployees),
        certifications: [],
      })

      setCompanies(prev => [...prev, newCompany])
      setShowAddCompanyModal(false)
      setNewCompName('')
      setNewCompField('')
      setNewCompCity('')
      setNewCompAddress('')
      setNewCompEmployees(50)
      alert('Perusahaan Potensial berhasil didaftarkan dalam program pembinaan Disnaker!')
    } catch (err) {
      console.error('Gagal mendaftarkan perusahaan:', err)
      alert('Gagal mendaftarkan perusahaan. Silakan coba lagi.')
    }
  }

  // Regional chart data for Disnaker
  const cityGroupedData = isAdminDisnaker
    ? Array.from(new Set(displayCompanies.map(c => c.city))).map(city => ({
        name: city || 'Lainnya',
        Klien: displayCompanies.filter(c => c.city === city).length,
        Proyek: displayProjects.filter(p => {
          const comp = companies.find(c => c.id === p.company_id)
          return comp?.city === city
        }).length
      }))
    : []

  // ── Regional data: hitung dari data real projects & companies ──
  // Kelompokkan perusahaan per provinsi, hitung jumlah proyek per provinsi
  const regionalData = (() => {
    const provinceMap: Record<string, { Proyek: number; Klien: number }> = {}
    companies.forEach((c) => {
      const prov = c.province || 'Lainnya'
      if (!provinceMap[prov]) provinceMap[prov] = { Proyek: 0, Klien: 0 }
      provinceMap[prov].Klien += 1
    })
    projects.forEach((p) => {
      const comp = companies.find((c) => c.id === p.company_id)
      const prov = comp?.province || 'Lainnya'
      if (!provinceMap[prov]) provinceMap[prov] = { Proyek: 0, Klien: 0 }
      provinceMap[prov].Proyek += 1
    })
    return Object.entries(provinceMap)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.Proyek - a.Proyek)
      .slice(0, 8) // top 8 provinsi
  })()

  // ── Growth data: hitung kumulatif proyek per bulan dari start_date ──
  const growthData = (() => {
    const monthMap: Record<string, number> = {}
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    projects.forEach((p) => {
      if (!p.start_date) return
      try {
        const d = new Date(p.start_date)
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
        monthMap[key] = (monthMap[key] || 0) + 1
      } catch { /* skip invalid dates */ }
    })
    if (Object.keys(monthMap).length === 0) {
      // fallback: tampilkan 0 untuk 6 bulan terakhir
      const now = new Date()
      return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
        return { month: monthNames[d.getMonth()], Proyek: 0 }
      })
    }
    const sortedKeys = Object.keys(monthMap).sort()
    let cumulative = 0
    return sortedKeys.map((key) => {
      const [, monthIdx] = key.split('-')
      cumulative += monthMap[key]
      return { month: monthNames[parseInt(monthIdx)], Proyek: cumulative }
    })
  })()

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Globe className="h-6 w-6 text-indigo-400" />
            {isAdminDisnaker ? `Panel Admin Wilayah — Disnaker ${disnakerProvince}` : 'Panel Admin Nasional Kemnaker RI'}
          </h1>
          <p className="text-xs text-slate-500">
            {isAdminDisnaker 
              ? `Monitoring real-time Program Bimbingan Konsultansi Peningkatan Produktivitas di wilayah ${disnakerProvince}`
              : 'Monitoring real-time Program Bimbingan Konsultansi Peningkatan Produktivitas skala nasional'
            }
          </p>
        </div>
        {isAdminDisnaker && (
          <div className="sm:ml-auto">
            <button 
              onClick={() => {
                setNewCompProvince(disnakerProvince)
                setShowAddCompanyModal(true)
              }}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer transform hover:-translate-y-0.5"
              style={{background: 'linear-gradient(135deg, #b8860b, #d4a017, #f4c430)', color: 'var(--navy-950)', boxShadow: '0 6px 20px rgba(212,160,23,0.20)'}}
            >
              <Plus className="h-4 w-4" />
              Daftarkan Perusahaan Potensial
            </button>
          </div>
        )}
      </div>

      {/* Grid statistics cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-slate-800 bg-slate-950/40">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isAdminDisnaker ? 'Proyek Wilayah' : 'Nasional Proyek'}
            </span>
            <h3 className="text-2xl font-bold text-slate-100">{totalProjects} Proyek</h3>
            <p className="text-xs text-indigo-400">{isAdminDisnaker ? `Provinsi ${disnakerProvince}` : 'Di 34 Provinsi'}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Globe className="h-6 w-6" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-slate-800 bg-slate-950/40">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Perusahaan Klien</span>
            <h3 className="text-2xl font-bold text-slate-100">{totalCompanies} Klien</h3>
            <p className="text-xs text-cyan-400">Binaan Terdaftar</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Building className="h-6 w-6" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-slate-800 bg-slate-950/40">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sertifikat Terbit</span>
            <h3 className="text-2xl font-bold text-slate-100">{completedProjects} Lembar</h3>
            <p className="text-xs text-emerald-400">E-Sertifikat terverifikasi</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Award className="h-6 w-6" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-slate-800 bg-slate-950/40">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Improvement</span>
            <h3 className="text-2xl font-bold text-slate-100">+{avgImprovement.toFixed(1)}%</h3>
            <p className="text-xs text-amber-400">Efisiensi Pendampingan</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Activity className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Grid: Regional and Growth Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Regional Bar Chart */}
        <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6">
          {isAdminDisnaker ? (
            <>
              <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-400" />
                Sebaran Klien & Proyek per Kota/Kabupaten
              </h3>
              <div className="h-64">
                {cityGroupedData.length === 0 ? (
                  <p className="text-center py-10 text-xs text-slate-500">Belum ada data proyek per kota.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cityGroupedData}>
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8 }} />
                      <Bar dataKey="Proyek" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Klien" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          ) : (
            <>
              <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-400" />
                Sebaran Wilayah (Top 5 Provinsi)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionalData}>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8 }} />
                    <Bar dataKey="Proyek" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Klien" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        {/* Growth Area Chart */}
        <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6">
          <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            Tren Pertumbuhan Proyek 2026
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorProyek" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8 }} />
                <Area type="monotone" dataKey="Proyek" stroke="#6366f1" fillOpacity={1} fill="url(#colorProyek)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Add Potential Company Modal (For Admin Disnaker) */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{background: 'rgba(2,6,15,0.80)', backdropFilter: 'blur(8px)'}}>
          <div className="w-full max-w-lg rounded-3xl overflow-hidden" style={{background: 'var(--navy-900)', border: '1px solid var(--border-base)', boxShadow: '0 30px 80px rgba(0,0,0,0.60)'}}>
            <div className="px-6 py-4 flex items-center justify-between" style={{borderBottom: '1px solid var(--border-base)', background: 'var(--navy-950)'}}>
              <h3 className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>Daftarkan Perusahaan Pembinaan Potensial</h3>
              <button 
                onClick={() => setShowAddCompanyModal(false)}
                className="text-lg font-light transition-colors text-slate-400 hover:text-slate-250"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleRegisterPotentialCompany} className="p-6 space-y-4 text-slate-200">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nama Perusahaan Klien
                </label>
                <input
                  type="text"
                  required
                  placeholder="PT Sinar Gemilang"
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Bidang Usaha
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Tekstil / Makanan"
                    value={newCompField}
                    onChange={(e) => setNewCompField(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Jumlah Tenaga Kerja
                  </label>
                  <input
                    type="number"
                    required
                    value={newCompEmployees}
                    onChange={(e) => setNewCompEmployees(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Provinsi (Yurisdiksi)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={newCompProvince}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Kota / Kabupaten
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Bandung / Karawang"
                    value={newCompCity}
                    onChange={(e) => setNewCompCity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Alamat Kantor/Pabrik
                </label>
                <textarea
                  required
                  placeholder="Jl. Sukarno Hatta No. 123..."
                  value={newCompAddress}
                  onChange={(e) => setNewCompAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-indigo-500 text-sm h-16"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCompanyModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-355 transition-colors animate-fade-in"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-650 text-sm font-semibold text-white hover:bg-indigo-600 transition-all cursor-pointer shadow-md hover:shadow-indigo-500/10"
                >
                  Daftarkan Mitra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
