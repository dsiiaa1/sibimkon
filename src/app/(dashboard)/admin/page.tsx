'use client'

import { useState, useEffect } from 'react'
import { getProjects, getCompanies } from '@/lib/db'
import { Project, Company } from '@/lib/mockData'
import { Activity, Globe, MapPin, Award, Building } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts'

export default function AdminPanelPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    async function loadData() {
      const [projs, comps] = await Promise.all([getProjects(), getCompanies()])
      setProjects(projs)
      setCompanies(comps)
    }
    loadData()
  }, [])

  const totalProjects = projects.length
  const totalCompanies = companies.length
  const avgImprovement = projects.reduce((acc, p) => acc + ((p.current_score || 0) - (p.baseline_score || 0)), 0) / (totalProjects || 1)
  const completedProjects = projects.filter(p => p.status === 'completed' || p.status === 'control').length

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
      .filter(item => item.name !== 'Lainnya' || item.Proyek > 0 || item.Klien > 0)
      .sort((a, b) => b.Proyek - a.Proyek)
      .slice(0, 8)
  })()

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Globe className="h-6 w-6 text-indigo-400" />
            Panel Admin SIBIMKON
          </h1>
          <p className="text-xs text-slate-500">
            Monitoring program bimbingan konsultansi peningkatan produktivitas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-slate-800 bg-slate-950/40">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Proyek</span>
            <h3 className="text-2xl font-bold text-slate-100">{totalProjects} Proyek</h3>
            <p className="text-xs text-indigo-400">Seluruh program aktif</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Globe className="h-6 w-6" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-slate-800 bg-slate-950/40">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Perusahaan Klien</span>
            <h3 className="text-2xl font-bold text-slate-100">{totalCompanies} Klien</h3>
            <p className="text-xs text-cyan-400">Terdaftar</p>
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
            <p className="text-xs text-amber-400">Efisiensi pendampingan</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Activity className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6">
          <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-indigo-400" />
            Sebaran Wilayah (Top Provinsi)
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

        <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6">
          <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            Tren Pertumbuhan Proyek
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
