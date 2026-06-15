'use client'

import { useState, useEffect } from 'react'
import { getMockDB, Project, Company } from '@/lib/mockData'
import { Activity, Globe, MapPin, Award, ShieldAlert, ArrowUpRight, Search, Building } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts'

export default function AdminPanelPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const db = getMockDB()
    setProjects(db.projects)
    setCompanies(db.companies)
  }, [])

  // National metrics calculation
  const totalProjects = projects.length
  const totalCompanies = companies.length
  const avgImprovement = projects.reduce((acc, p) => acc + ((p.current_score || 0) - (p.baseline_score || 0)), 0) / (totalProjects || 1)
  const completedProjects = projects.filter(p => p.status === 'completed' || p.status === 'control').length

  const regionalData = [
    { name: 'Jawa Barat', Proyek: 12, Klien: 15 },
    { name: 'Jawa Tengah', Proyek: 8, Klien: 10 },
    { name: 'Jawa Timur', Proyek: 6, Klien: 8 },
    { name: 'DKI Jakarta', Proyek: 15, Klien: 18 },
    { name: 'Banten', Proyek: 5, Klien: 6 }
  ]

  const growthData = [
    { month: 'Jan', Proyek: 10 },
    { month: 'Feb', Proyek: 14 },
    { month: 'Mar', Proyek: 18 },
    { month: 'Apr', Proyek: 25 },
    { month: 'Mei', Proyek: 32 },
    { month: 'Jun', Proyek: 45 }
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Globe className="h-6 w-6 text-indigo-400" />
            Panel Admin Nasional Kemnaker RI
          </h1>
          <p className="text-xs text-slate-500">Monitoring real-time Program Bimbingan Konsultansi Peningkatan Produktivitas skala nasional</p>
        </div>
      </div>

      {/* Grid statistics cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-slate-800 bg-slate-950/40">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nasional Proyek</span>
            <h3 className="text-2xl font-bold text-slate-100">{totalProjects * 15} Proyek</h3>
            <p className="text-xs text-indigo-400">Di 34 Provinsi</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Globe className="h-6 w-6" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-slate-800 bg-slate-950/40">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Perusahaan Mitra</span>
            <h3 className="text-2xl font-bold text-slate-100">{totalCompanies * 20} Perusahaan</h3>
            <p className="text-xs text-cyan-400">Usaha Mikro, Kecil, Menengah</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Building className="h-6 w-6" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-slate-800 bg-slate-950/40">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sertifikat Terbit</span>
            <h3 className="text-2xl font-bold text-slate-100">{completedProjects * 10} Lembar</h3>
            <p className="text-xs text-emerald-400">QR-code terverifikasi</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Award className="h-6 w-6" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-slate-800 bg-slate-950/40">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Improvement</span>
            <h3 className="text-2xl font-bold text-slate-100">+{avgImprovement.toFixed(1)}%</h3>
            <p className="text-xs text-amber-400">Skala Efisiensi Nasional</p>
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
    </div>
  )
}
