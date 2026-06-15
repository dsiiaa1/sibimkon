'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getMockDB, updateMockDB, Project, Company, ProjectCharter } from '@/lib/mockData'
import { FileCheck, Building2, ClipboardList, Plus, Save, Trash } from 'lucide-react'

export default function DefinePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [activeTab, setActiveTab] = useState<'profile' | 'charter' | 'vom'>('profile')
  const [project, setProject] = useState<Project | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [charter, setCharter] = useState<ProjectCharter | null>(null)
  const [vomList, setVomList] = useState<any[]>([])

  // Company Profile form state
  const [compName, setCompName] = useState('')
  const [compAddress, setCompAddress] = useState('')
  const [compEmployees, setCompEmployees] = useState(0)
  const [compField, setCompField] = useState('')

  // Charter form state
  const [charterProblem, setCharterProblem] = useState('')
  const [charterObjectives, setCharterObjectives] = useState('')
  const [charterTarget, setCharterTarget] = useState('')
  const [charterScope, setCharterScope] = useState('')
  
  // VOM Form state
  const [vomDimension, setVomDimension] = useState('productivity')
  const [vomProblem, setVomProblem] = useState('')
  const [vomImpact, setVomImpact] = useState('')

  useEffect(() => {
    const db = getMockDB()
    const proj = db.projects.find((p: Project) => p.id === projectId)
    if (!proj) {
      router.push('/dashboard')
      return
    }
    setProject(proj)

    const comp = db.companies.find((c: Company) => c.id === proj.company_id)
    if (comp) {
      setCompany(comp)
      setCompName(comp.name)
      setCompAddress(comp.address)
      setCompEmployees(comp.total_employees)
      setCompField(comp.business_field)
    }

    const chart = db.charters[projectId] || {
      project_id: projectId,
      problem_statement: '',
      objectives: '',
      productivity_target: '',
      scope: '',
      team_members: []
    }
    setCharter(chart)
    setCharterProblem(chart.problem_statement)
    setCharterObjectives(chart.objectives)
    setCharterTarget(chart.productivity_target)
    setCharterScope(chart.scope)

    // Set voice of management list
    const vom = localStorage.getItem(`sibimkon_vom_${projectId}`)
    if (vom) {
      setVomList(JSON.parse(vom))
    } else {
      const defaultVom = [
        { id: 'vom-1', dimension: 'productivity', problem: 'Bottleneck di stasiun sewing line 3', impact: 'OPH turun 15% dari target', priority: 1 },
        { id: 'vom-2', dimension: 'quality', problem: 'Tingkat defect jahit kerut tinggi', impact: 'Biaya re-work mencapai Rp 25jt/bulan', priority: 2 }
      ]
      setVomList(defaultVom)
      localStorage.setItem(`sibimkon_vom_${projectId}`, JSON.stringify(defaultVom))
    }
  }, [projectId, router])

  const handleSaveCompany = () => {
    if (!company) return
    const db = getMockDB()
    const updatedCompanies = db.companies.map((c: Company) => 
      c.id === company.id 
        ? { ...c, name: compName, address: compAddress, total_employees: compEmployees, business_field: compField }
        : c
    )
    updateMockDB('companies', updatedCompanies)
    
    // Update company name in projects as well
    const updatedProjects = db.projects.map((p: Project) =>
      p.company_id === company.id ? { ...p, company_name: compName } : p
    )
    updateMockDB('projects', updatedProjects)

    alert('Profil perusahaan berhasil disimpan!')
  }

  const handleSaveCharter = () => {
    const db = getMockDB()
    const updatedCharter: ProjectCharter = {
      project_id: projectId,
      problem_statement: charterProblem,
      objectives: charterObjectives,
      productivity_target: charterTarget,
      scope: charterScope,
      team_members: charter?.team_members || []
    }
    
    db.charters[projectId] = updatedCharter
    updateMockDB('charters', db.charters)

    // Update project phase status
    const updatedProjects = db.projects.map((p: Project) =>
      p.id === projectId && p.status === 'define' ? { ...p, status: 'measure' } : p
    )
    updateMockDB('projects', updatedProjects)

    alert('Project Charter berhasil disimpan! Fase proyek diperbarui ke MEASURE.')
  }

  const handleAddVom = () => {
    if (!vomProblem) return
    const newItem = {
      id: 'vom-' + Math.random().toString(36).substr(2, 9),
      dimension: vomDimension,
      problem: vomProblem,
      impact: vomImpact,
      priority: vomList.length + 1
    }
    const updatedList = [...vomList, newItem]
    setVomList(updatedList)
    localStorage.setItem(`sibimkon_vom_${projectId}`, JSON.stringify(updatedList))
    setVomProblem('')
    setVomImpact('')
  }

  const handleDeleteVom = (id: string) => {
    const updatedList = vomList.filter(item => item.id !== id)
    setVomList(updatedList)
    localStorage.setItem(`sibimkon_vom_${projectId}`, JSON.stringify(updatedList))
  }

  if (!project || !company) return null

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fase DEFINE: Mendefinisikan profil, charter proyek, dan prioritas masalah</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        {[
          { id: 'profile', name: 'Profil Perusahaan', icon: Building2 },
          { id: 'charter', name: 'Project Charter', icon: FileCheck },
          { id: 'vom', name: 'Voice of Management', icon: ClipboardList }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 md:p-8">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-3">Profil Perusahaan Klien</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nama Perusahaan</label>
                <input
                  type="text"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Bidang Usaha</label>
                <input
                  type="text"
                  value={compField}
                  onChange={(e) => setCompField(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Alamat</label>
                <textarea
                  value={compAddress}
                  onChange={(e) => setCompAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm h-20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Jumlah Karyawan</label>
                <input
                  type="number"
                  value={compEmployees}
                  onChange={(e) => setCompEmployees(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSaveCompany}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-650 text-sm font-semibold rounded-xl text-white hover:bg-indigo-600 transition-colors cursor-pointer shadow-md"
              >
                <Save className="h-4 w-4" />
                Simpan Profil
              </button>
            </div>
          </div>
        )}

        {activeTab === 'charter' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-3">Productivity Project Charter</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Pernyataan Masalah (Problem Statement)</label>
                <textarea
                  value={charterProblem}
                  onChange={(e) => setCharterProblem(e.target.value)}
                  placeholder="Detail kendala saat ini..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm h-24"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tujuan & Sasaran (Objectives)</label>
                <textarea
                  value={charterObjectives}
                  onChange={(e) => setCharterObjectives(e.target.value)}
                  placeholder="Tujuan terukur yang ingin dicapai..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm h-20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Target Produktivitas</label>
                <input
                  type="text"
                  value={charterTarget}
                  onChange={(e) => setCharterTarget(e.target.value)}
                  placeholder="Misal: Kenaikan OPH 15%, Penurunan reject rate ke <2%"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Ruang Lingkup (Scope)</label>
                <input
                  type="text"
                  value={charterScope}
                  onChange={(e) => setCharterScope(e.target.value)}
                  placeholder="Batasan perbaikan..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSaveCharter}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-650 text-sm font-semibold rounded-xl text-white hover:bg-indigo-600 transition-colors cursor-pointer shadow-md"
              >
                <Save className="h-4 w-4" />
                Simpan Project Charter
              </button>
            </div>
          </div>
        )}

        {activeTab === 'vom' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-3">Voice of Management (VOM)</h2>
            
            {/* Input Form */}
            <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-slate-300">Catat Keluhan Manajemen Baru</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Dimensi</label>
                  <select
                    value={vomDimension}
                    onChange={(e) => setVomDimension(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-350"
                  >
                    <option value="productivity">Productivity (Produktivitas)</option>
                    <option value="quality">Quality (Mutu)</option>
                    <option value="cost">Cost (Biaya)</option>
                    <option value="delivery">Delivery (Pengiriman)</option>
                    <option value="safety">Safety (K3)</option>
                    <option value="morale">Morale (Absensi/Turnover)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Deskripsi Kendala Utama</label>
                  <input
                    type="text"
                    value={vomProblem}
                    onChange={(e) => setVomProblem(e.target.value)}
                    placeholder="Apa masalah utamanya?"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-250 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Dampak (Impact)</label>
                  <input
                    type="text"
                    value={vomImpact}
                    onChange={(e) => setVomImpact(e.target.value)}
                    placeholder="Apa dampak finansial atau operasionalnya?"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-250 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleAddVom}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah VOM
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-300">Daftar Prioritas Kendala Awal</h3>
              {vomList.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-500">Belum ada data Voice of Management.</p>
              ) : (
                <div className="space-y-3">
                  {vomList.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-indigo-400">
                            {item.dimension}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Prioritas #{idx + 1}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-200 mt-1 truncate">{item.problem}</h4>
                        {item.impact && <p className="text-xs text-slate-400">Dampak: {item.impact}</p>}
                      </div>
                      <button
                        onClick={() => handleDeleteVom(item.id)}
                        className="text-red-500 hover:text-red-400 p-2 hover:bg-slate-900 rounded-xl transition-all cursor-pointer ml-4"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
