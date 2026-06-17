'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getProjects, getCompanies, getProjectCharter, saveProjectCharter, updateProjectPhase } from '@/lib/db'
import { Project, Company, ProjectCharter } from '@/lib/mockData'
import { FileCheck, Building2, Save, ArrowRight } from 'lucide-react'

export default function DefinePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [activeTab, setActiveTab] = useState<'profile' | 'charter'>('profile')
  const [project, setProject] = useState<Project | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Company Profile form state
  const [compName, setCompName] = useState('')
  const [compAddress, setCompAddress] = useState('')
  const [compEmployees, setCompEmployees] = useState(0)
  const [compField, setCompField] = useState('')
  const [compProduct, setCompProduct] = useState('')
  const [compKadin, setCompKadin] = useState('tidak_aktif')
  const [compUnion, setCompUnion] = useState('')
  const [compPkb, setCompPkb] = useState('tidak_ada')
  const [compCertifications, setCompCertifications] = useState<string[]>([])
  const [newCert, setNewCert] = useState('')

  // Charter form state
  const [charterProblem, setCharterProblem] = useState('')
  const [charterObjectives, setCharterObjectives] = useState('')
  const [charterTarget, setCharterTarget] = useState('')
  const [charterScope, setCharterScope] = useState('')
  const [teamMembers, setTeamMembers] = useState<Array<{ name: string; position: string; role: string }>>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberPos, setNewMemberPos] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('')

  useEffect(() => {
    async function loadData() {
      const [projects, companies] = await Promise.all([getProjects(), getCompanies()])
      const proj = projects.find((p: Project) => p.id === projectId)
      if (!proj) { router.push('/dashboard'); return }
      setProject(proj)

      const comp = companies.find((c: Company) => c.id === proj.company_id)
      if (comp) {
        setCompany(comp)
        setCompName(comp.name)
        setCompAddress(comp.address)
        setCompEmployees(comp.total_employees)
        setCompField(comp.business_field)
        setCompProduct((comp as any).main_product || '')
        setCompKadin((comp as any).kadin_membership || 'tidak_aktif')
        setCompUnion((comp as any).labor_union || '')
        setCompPkb((comp as any).pkb_status || 'tidak_ada')
        setCompCertifications(comp.certifications || [])
      }

      const chart = await getProjectCharter(projectId)
      if (chart) {
        setCharterProblem(chart.problem_statement)
        setCharterObjectives(chart.objectives)
        setCharterTarget(chart.productivity_target)
        setCharterScope(chart.scope)
        setTeamMembers(chart.team_members || [])
      }
    }
    loadData()
  }, [projectId, router])

  const showSave = (msg: string) => {
    setSaveMsg(msg)
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const handleSaveCompany = async () => {
    if (!company) return
    setSaving(true)
    try {
      // Update via mockDB/supabase — currently companies don't have a dedicated save fn in db.ts
      // so we use the mock layer which is what getCompanies() reads from
      const { getMockDB, updateMockDB } = await import('@/lib/mockData')
      const db = getMockDB()
      const updatedCompanies = db.companies.map((c: Company) =>
        c.id === company.id
          ? {
              ...c,
              name: compName,
              address: compAddress,
              total_employees: compEmployees,
              business_field: compField,
              main_product: compProduct,
              kadin_membership: compKadin,
              labor_union: compUnion,
              pkb_status: compPkb,
              certifications: compCertifications,
            }
          : c
      )
      updateMockDB('companies', updatedCompanies)
      const updatedProjects = db.projects.map((p: Project) =>
        p.company_id === company.id ? { ...p, company_name: compName } : p
      )
      updateMockDB('projects', updatedProjects)
      showSave('Profil perusahaan berhasil disimpan!')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCharter = async () => {
    setSaving(true)
    try {
      const updatedCharter: ProjectCharter = {
        project_id: projectId,
        problem_statement: charterProblem,
        objectives: charterObjectives,
        productivity_target: charterTarget,
        scope: charterScope,
        team_members: teamMembers,
      }
      await saveProjectCharter(updatedCharter)
      showSave('Project Charter berhasil disimpan!')
    } finally {
      setSaving(false)
    }
  }

  const handleAdvanceToMeasure = async () => {
    if (!project) return
    if (project.status !== 'define') {
      router.push(`/projects/${projectId}/measure`)
      return
    }
    setSaving(true)
    try {
      await updateProjectPhase(projectId, 'measure')
      router.push(`/projects/${projectId}/measure`)
    } finally {
      setSaving(false)
    }
  }

  const handleAddMember = () => {
    if (!newMemberName) return
    setTeamMembers([...teamMembers, { name: newMemberName, position: newMemberPos, role: newMemberRole }])
    setNewMemberName(''); setNewMemberPos(''); setNewMemberRole('')
  }

  const handleDeleteMember = (idx: number) => setTeamMembers(teamMembers.filter((_, i) => i !== idx))

  const handleAddCert = () => {
    if (!newCert || compCertifications.includes(newCert)) return
    setCompCertifications([...compCertifications, newCert])
    setNewCert('')
  }

  const handleDeleteCert = (certName: string) =>
    setCompCertifications(compCertifications.filter(c => c !== certName))

  if (!project || !company) return (
    <div className="flex h-64 items-center justify-center text-slate-400 text-sm">Memuat data proyek...</div>
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fase DEFINE: Mendefinisikan profil, charter proyek, dan prioritas masalah</p>
        </div>
      </div>

      {/* Save notification */}
      {saveMsg && (
        <div className="px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-sm text-emerald-400 animate-fade-in">
          ✅ {saveMsg}
        </div>
      )}

      {/* Advance phase banner */}
      <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/15">
        <div>
          <p className="text-xs font-semibold text-indigo-300">Fase Saat Ini: <span className="uppercase font-black">DEFINE</span></p>
          <p className="text-[10px] text-slate-500 mt-0.5">Isi Profil Perusahaan dan Project Charter sebelum lanjut ke MEASURE.</p>
        </div>
        <button onClick={handleAdvanceToMeasure} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl text-white cursor-pointer disabled:opacity-50 transition-all"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          Lanjut ke MEASURE <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        {[
          { id: 'profile', name: 'Profil Perusahaan', icon: Building2 },
          { id: 'charter', name: 'Project Charter', icon: FileCheck },
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

        {/* ── TAB: PROFIL PERUSAHAAN ── */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-3">Profil Perusahaan Klien</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nama Perusahaan</label>
                <input type="text" value={compName} onChange={(e) => setCompName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Bidang Usaha</label>
                <input type="text" value={compField} onChange={(e) => setCompField(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Produk Utama</label>
                <input type="text" value={compProduct} onChange={(e) => setCompProduct(e.target.value)}
                  placeholder="Misal: Pakaian Jadi, Keripik Tempe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Jumlah Karyawan</label>
                <input type="number" value={compEmployees} onChange={(e) => setCompEmployees(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Alamat</label>
                <textarea value={compAddress} onChange={(e) => setCompAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm h-16" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Keanggotaan KADIN/APINDO</label>
                <select value={compKadin} onChange={(e) => setCompKadin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm">
                  <option value="tidak_aktif">Tidak Aktif / Bukan Anggota</option>
                  <option value="kadin">Anggota KADIN</option>
                  <option value="apindo">Anggota APINDO</option>
                  <option value="keduanya">Anggota KADIN &amp; APINDO</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Serikat Pekerja</label>
                <input type="text" value={compUnion} onChange={(e) => setCompUnion(e.target.value)}
                  placeholder="Nama Serikat Pekerja (kosongkan jika tidak ada)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Perjanjian Kerja Bersama (PKB)</label>
                <select value={compPkb} onChange={(e) => setCompPkb(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm">
                  <option value="tidak_ada">Belum Ada PKB</option>
                  <option value="ada_aktif">Ada (Aktif)</option>
                  <option value="proses_perpanjangan">Dalam Proses Perpanjangan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Daftar Sertifikasi (ISO, SMK3, dll)</label>
                <div className="flex gap-2">
                  <input type="text" value={newCert} onChange={(e) => setNewCert(e.target.value)}
                    placeholder="Tambah Sertifikasi..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500" />
                  <button type="button" onClick={handleAddCert}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-xl text-indigo-400">Tambah</button>
                </div>
                {compCertifications.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {compCertifications.map(c => (
                      <span key={c} className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-900 border border-slate-850 rounded text-xs text-slate-300 font-medium">
                        {c}
                        <button type="button" onClick={() => handleDeleteCert(c)} className="text-red-400 hover:text-red-350 text-[10px]">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="pt-4 flex justify-end border-t border-slate-850/80">
              <button onClick={handleSaveCompany} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-650 text-sm font-semibold rounded-xl text-white hover:bg-indigo-600 transition-colors cursor-pointer shadow-md disabled:opacity-50">
                <Save className="h-4 w-4" />
                {saving ? 'Menyimpan...' : 'Simpan Profil'}
              </button>
            </div>
          </div>
        )}

        {/* ── TAB: PROJECT CHARTER ── */}
        {activeTab === 'charter' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-3">Productivity Project Charter</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Pernyataan Masalah (Problem Statement)</label>
                <textarea value={charterProblem} onChange={(e) => setCharterProblem(e.target.value)}
                  placeholder="Detail kendala saat ini..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm h-24" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tujuan &amp; Sasaran (Objectives)</label>
                <textarea value={charterObjectives} onChange={(e) => setCharterObjectives(e.target.value)}
                  placeholder="Tujuan terukur yang ingin dicapai..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm h-20" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Target Produktivitas</label>
                <input type="text" value={charterTarget} onChange={(e) => setCharterTarget(e.target.value)}
                  placeholder="Misal: Kenaikan OPH 15%, Penurunan reject rate ke <2%"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Ruang Lingkup (Scope)</label>
                <input type="text" value={charterScope} onChange={(e) => setCharterScope(e.target.value)}
                  placeholder="Batasan perbaikan..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
            </div>

            {/* Tim Pelaksana */}
            <div className="space-y-4 pt-6 border-t border-slate-850">
              <h3 className="text-sm font-bold text-slate-300">Tim Pelaksana Improvement (Perusahaan)</h3>
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nama Anggota</label>
                  <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Budi Santoso"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Jabatan Perusahaan</label>
                  <input type="text" value={newMemberPos} onChange={(e) => setNewMemberPos(e.target.value)}
                    placeholder="Supervisor Sewing"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Peran dalam Tim</label>
                  <div className="flex gap-2">
                    <input type="text" value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)}
                      placeholder="Team Leader / Member"
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none" />
                    <button type="button" onClick={handleAddMember}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-550 text-xs font-bold rounded-xl text-white cursor-pointer">Tambah</button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto bg-slate-950/20 border border-slate-850 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="p-3">No</th><th className="p-3">Nama</th><th className="p-3">Jabatan</th>
                      <th className="p-3">Peran Tim</th><th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {teamMembers.length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-center text-slate-500 italic">Belum ada anggota tim terdaftar.</td></tr>
                    ) : (
                      teamMembers.map((member, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/20">
                          <td className="p-3 font-mono">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-200">{member.name}</td>
                          <td className="p-3">{member.position}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-900/50">{member.role || 'Member'}</span>
                          </td>
                          <td className="p-3 text-right">
                            <button type="button" onClick={() => handleDeleteMember(idx)} className="text-red-400 hover:text-red-350">Hapus</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 flex justify-end border-t border-slate-850/80">
              <button onClick={handleSaveCharter} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-650 text-sm font-semibold rounded-xl text-white hover:bg-indigo-600 transition-colors cursor-pointer shadow-md disabled:opacity-50">
                <Save className="h-4 w-4" />
                {saving ? 'Menyimpan...' : 'Simpan Project Charter'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
