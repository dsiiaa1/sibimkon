'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getProjects, getCompanies, getProjectCharter, saveProjectCharter, updateProjectPhase, updateCompany, setProjectPhaseLock, submitApprovalRequest, cancelApprovalRequest, getApprovalRequests } from '@/lib/db'
import { Project, Company, ProjectCharter, GenericApprovalRequest } from '@/lib/mockData'
import { FileCheck, Building2, Save, ArrowRight, BrainCircuit, Lock, Unlock, Clock } from 'lucide-react'
import { useDialog } from '@/hooks/useDialog'

export default function DefinePage() {
  const router = useRouter()
  const params = useParams()
  const { showAlert, showConfirm } = useDialog()
  const projectId = params.id as string

  const [activeTab, setActiveTab] = useState<'profile' | 'charter'>('profile')
  const [project, setProject] = useState<Project | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  
  const localUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('smartproductive_user') || 'null') : null
  const isKonsultan = localUser?.role === 'konsultan'
  const [approvalRequests, setApprovalRequests] = useState<GenericApprovalRequest[]>([])

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
  const [charterBusinessCase, setCharterBusinessCase] = useState('')
  const [charterTimeline, setCharterTimeline] = useState('')
  const [showAdvancedFields, setShowAdvancedFields] = useState(false)
  const [teamMembers, setTeamMembers] = useState<Array<{ name: string; position: string; role: string }>>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberPos, setNewMemberPos] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('')
  const [charterSource, setCharterSource] = useState<'manual'|'ai_generated'>('manual')
  const [fieldSources, setFieldSources] = useState<Record<string, string>>({})
  const [isDrafting, setIsDrafting] = useState(false)

  const generateCharterDraft = async (isAuto = false) => {
    if (!isAuto) {
      const hasEdited = Object.values(fieldSources).includes('user_edited')
      if (hasEdited) {
        const confirm = await showConfirm('Beberapa kolom sudah Anda edit manual. Yakin ingin menimpa dengan draf otomatis?')
        if (!confirm) return
      }
    }
    
    setIsDrafting(true)
    try {
      const res = await fetch('/api/charter-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      })
      const data = await res.json()
      if (res.ok) {
        setCharterProblem(data.problem_statement || '')
        setCharterObjectives(data.objectives || '')
        setCharterTarget(data.productivity_target || '')
        setCharterScope(data.scope || '')
        setCharterBusinessCase(data.business_case || '')
        setCharterTimeline(data.timeline || '')
        
        setFieldSources({
          problem_statement: data.problem_statement ? 'ai_draft' : 'empty',
          objectives: data.objectives ? 'ai_draft' : 'empty',
          productivity_target: data.productivity_target ? 'ai_draft' : 'empty',
          scope: data.scope ? 'ai_draft' : 'empty',
          business_case: data.business_case ? 'ai_draft' : 'empty',
          timeline: data.timeline ? 'ai_draft' : 'empty'
        })
        setCharterSource('ai_generated')
        if (!isAuto) showSave('Draf berhasil disusun ulang dari kuesioner.')
      } else {
        if (!isAuto) await showAlert(data.error || 'Gagal menyusun draf otomatis.')
      }
    } catch (err) {
      if (!isAuto) await showAlert('Terjadi kesalahan jaringan saat menyusun draf.')
    } finally {
      setIsDrafting(false)
    }
  }

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
        setCompAddress(comp.address || '')
        setCompEmployees((comp as any).jumlah_tenaga_kerja || comp.total_employees || 0)
        setCompField(comp.business_field || '')
        setCompProduct((comp as any).main_products || (comp as any).main_product || '')
        
        let kadinVal = (comp as any).kadin_membership || 'tidak_aktif'
        if ((comp as any).kadin_member || (comp as any).apindo_member) {
          const isKadin = (comp as any).kadin_member
          const isApindo = (comp as any).apindo_member
          if (isKadin && isApindo) kadinVal = 'keduanya'
          else if (isKadin) kadinVal = 'kadin'
          else if (isApindo) kadinVal = 'apindo'
        }
        setCompKadin(kadinVal)
        
        setCompUnion((comp as any).labor_union || ((comp as any).has_union ? 'Ada Serikat Pekerja' : ''))
        setCompPkb((comp as any).pkb_status || ((comp as any).has_pkb ? 'ada_aktif' : 'tidak_ada'))
        setCompCertifications(comp.certifications || [])
      }

      const chart = await getProjectCharter(projectId)
      if (chart) {
        setCharterProblem(chart.problem_statement || '')
        setCharterObjectives(chart.objectives || '')
        setCharterTarget(chart.productivity_target || '')
        setCharterScope(chart.scope || '')
        setCharterBusinessCase(chart.business_case || '')
        setCharterTimeline(chart.timeline || '')
        setTeamMembers(chart.team_members || [])
        setCharterSource(chart.source || 'manual')
        setFieldSources(chart.field_sources || {})

        // Auto trigger draft if the important fields are empty
        if (!chart.objectives && !chart.productivity_target && !chart.scope) {
          generateCharterDraft(true)
        }
      } else {
        // Auto trigger draft if no charter exists
        generateCharterDraft(true)
      }
      
      const reqs = await getApprovalRequests(projectId)
      setApprovalRequests(reqs)
    }
    loadData()
  }, [projectId, router])

  const showSave = (msg: string) => {
    setSaveMsg(msg)
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const handleSaveCompany = async () => {
    if (!company) return
    
    // Validasi field wajib sebelum simpan
    const missing: string[] = []
    if (!compField.trim()) missing.push('Bidang Usaha')
    if (!compProduct.trim()) missing.push('Produk Utama')
    if (!compAddress.trim()) missing.push('Alamat')
    
    if (missing.length > 0) {
      showSave(`⚠ Field berikut wajib diisi: ${missing.join(', ')}`)
      return
    }
    
    setSaving(true)
    try {
      // updateCompany sudah sync mockDB + Supabase secara otomatis di dalam db.ts
      await updateCompany(company.id, {
        name: compName,
        address: compAddress,
        total_employees: compEmployees,
        business_field: compField,
        main_product: compProduct,
        kadin_membership: compKadin,
        labor_union: compUnion,
        pkb_status: compPkb,
        certifications: compCertifications,
      })
      
      if (!project?.define_is_locked) {
        await setProjectPhaseLock(projectId, 'define', true)
        setProject(prev => prev ? { ...prev, define_is_locked: true } : null)
      }
      showSave('Profil perusahaan berhasil disimpan!')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCharter = async () => {
    setSaving(true)
    try {
      let finalTeamMembers = teamMembers;
      if (newMemberName.trim()) {
        finalTeamMembers = [...teamMembers, { name: newMemberName, position: newMemberPos, role: newMemberRole }]
        setTeamMembers(finalTeamMembers)
        setNewMemberName(''); setNewMemberPos(''); setNewMemberRole('')
      }
      
      const updatedCharter: ProjectCharter = {
        project_id: projectId,
        problem_statement: charterProblem,
        objectives: charterObjectives,
        productivity_target: charterTarget,
        scope: charterScope,
        business_case: charterBusinessCase,
        timeline: charterTimeline,
        team_members: finalTeamMembers,
        source: charterSource,
        field_sources: fieldSources,
        ai_drafted_at: charterSource === 'ai_generated' ? new Date().toISOString() : undefined
      }
      await saveProjectCharter(updatedCharter)
      
      if (!project?.define_is_locked) {
        await setProjectPhaseLock(projectId, 'define', true)
        setProject(prev => prev ? { ...prev, define_is_locked: true } : null)
      }
      showSave('Project Charter berhasil disimpan!')
    } catch (err: any) {
      await showAlert('Gagal menyimpan: ' + (err.message || 'Terjadi kesalahan pada database.'))
    } finally {
      setSaving(false)
    }
  }
  const handleFieldChange = (field: string, val: string, setter: any) => {
    setter(val)
    if (fieldSources[field] === 'ai_draft') {
      setFieldSources(prev => ({ ...prev, [field]: 'user_edited' }))
    }
  }

  const handleAdvanceToMeasure = async () => {
    if (!project) return

    // Validasi kelengkapan data sebelum advance
    if (!charterProblem.trim() || !charterObjectives.trim() || !charterTarget.trim()) {
      await showAlert('Harap isi Project Charter terlebih dahulu (Problem Statement, Tujuan, dan Target Productivity wajib diisi) sebelum melanjutkan ke fase MEASURE.')
      setActiveTab('charter')
      return
    }
    if (company?.tier === 'besar' || company?.tier === 'menengah') {
      if (!charterScope.trim() || !charterBusinessCase.trim() || !charterTimeline.trim()) {
        await showAlert('Sebagai pengguna Tier Advanced, Anda wajib mengisi Scope, Business Case, dan Timeline.');
        setActiveTab('charter')
        return
      }
    }

    if (!compName.trim() || !compField.trim() || !compAddress.trim()) {
      await showAlert('Harap lengkapi Profil Perusahaan (Nama, Bidang Usaha, dan Alamat wajib diisi) sebelum melanjutkan ke fase MEASURE.')
      setActiveTab('profile')
      return
    }

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

  const handleDeleteMember = async (idx: number) => {
    if (!await showConfirm('Hapus anggota tim ini?')) return
    setTeamMembers(teamMembers.filter((_, i) => i !== idx))
  }

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

  const isLocked = project.define_is_locked
  const pendingUnlockReq = approvalRequests.find(r => r.entity_type === 'phase_unlock' && r.entity_id === 'define' && r.status === 'pending')

  const handleRequestUnlock = async () => {
    if (pendingUnlockReq) {
      if (await showConfirm('Batalkan pengajuan buka kunci?')) {
        await cancelApprovalRequest(pendingUnlockReq.id)
        setApprovalRequests(approvalRequests.filter(r => r.id !== pendingUnlockReq.id))
      }
      return
    }
    if (await showConfirm('Minta akses edit ke Konsultan?')) {
      const req: GenericApprovalRequest = {
        id: crypto.randomUUID(), project_id: projectId, entity_type: 'phase_unlock', entity_id: 'define',
        requested_by: localUser?.id || 'unknown', requested_at: new Date().toISOString(),
        changes: { phase: 'define' }, status: 'pending'
      }
      await submitApprovalRequest(req)
      setApprovalRequests([req, ...approvalRequests])
      showSave('Permintaan akses edit terkirim.')
    }
  }

  const handleToggleLock = async (lock: boolean) => {
    if (!isKonsultan) return
    await setProjectPhaseLock(projectId, 'define', lock)
    setProject({ ...project, define_is_locked: lock })
    showSave(lock ? 'Fase dikunci.' : 'Kunci fase dibuka.')
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fase DEFINE: Mendefinisikan profil, charter proyek, dan prioritas masalah</p>
        </div>
        
        {isLocked && (
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
            <Lock className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-300">Data Terkunci</span>
            {!isKonsultan ? (
              <button onClick={handleRequestUnlock} className="ml-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 text-[10px] font-bold rounded-lg transition-colors">
                {pendingUnlockReq ? 'Menunggu Persetujuan' : 'Minta Akses Edit'}
              </button>
            ) : (
              <button onClick={() => handleToggleLock(false)} className="ml-2 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[10px] font-bold rounded-lg transition-colors">
                Buka Kunci
              </button>
            )}
          </div>
        )}
        {!isLocked && isKonsultan && (
          <button onClick={() => handleToggleLock(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-colors">
            <Unlock className="h-3.5 w-3.5" /> Kunci Manual
          </button>
        )}
      </div>

      {/* Save notification */}
      {saveMsg && (
        <div className="px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-sm text-emerald-400 animate-fade-in">
          ✅ {saveMsg}
        </div>
      )}

      {/* Advance phase banner */}
      <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 phase-banner">
        <div>
          <p className="text-xs font-semibold text-indigo-300">Fase Saat Ini: <span className="uppercase font-black">DEFINE</span></p>
          <p className="text-[10px] text-slate-500 mt-0.5">Isi Profil Perusahaan dan Project Charter sebelum lanjut ke MEASURE.</p>
        </div>
        <button onClick={handleAdvanceToMeasure} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-all">
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
                ? 'bg-amber-50 text-amber-800'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            style={activeTab === tab.id ? { borderBottomColor: 'var(--gold-400)', borderBottomWidth: '2px' } : {}}
          >
            <tab.icon className="h-4 w-4" />
            {tab.name}
          </button>
        ))}
        <div className="absolute bottom-0 left-0 h-0.5 bg-amber-500 transition-all duration-300"
          style={{ width: '50%', transform: `translateX(${activeTab === 'profile' ? '0%' : '100%'})` }} />
      </div>

      <div>
        {/* Tab Panels */}
        <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 md:p-8">

        {/* ── TAB: PROFIL PERUSAHAAN ── */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-3">Profil Perusahaan Klien</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nama Perusahaan</label>
                <input type="text" value={compName} onChange={(e) => setCompName(e.target.value)}
                  disabled
                  title="Nama perusahaan tidak dapat diubah di sini. Edit melalui halaman Profil."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-500 focus:outline-none text-sm cursor-not-allowed opacity-70" />
                <p className="text-[10px] text-slate-600 mt-1">Untuk mengubah nama, buka halaman <a href="/profile" className="text-indigo-400 hover:underline">Profil</a>.</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Bidang Usaha <span className="text-red-400">*</span>
                </label>
                <input type="text" value={compField} onChange={(e) => setCompField(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm ${
                    !compField.trim() ? 'border-red-500/60 bg-red-950/10' : 'border-slate-800'
                  }`} />
                {!compField.trim() && <p className="text-[10px] text-red-400 mt-1">⚠ Wajib diisi</p>}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Produk Utama <span className="text-red-400">*</span>
                </label>
                <input type="text" value={compProduct} onChange={(e) => setCompProduct(e.target.value)}
                  placeholder="Misal: Pakaian Jadi, Keripik Tempe"
                  className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm ${
                    !compProduct.trim() ? 'border-red-500/60 bg-red-950/10' : 'border-slate-800'
                  }`} />
                {!compProduct.trim() && <p className="text-[10px] text-red-400 mt-1">⚠ Wajib diisi</p>}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Jumlah Karyawan</label>
                <input type="number" value={compEmployees} onChange={(e) => setCompEmployees(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Alamat <span className="text-red-400">*</span>
                </label>
                <textarea value={compAddress} onChange={(e) => setCompAddress(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm h-16 ${
                    !compAddress.trim() ? 'border-red-500/60 bg-red-950/10' : 'border-slate-800'
                  }`} />
                {!compAddress.trim() && <p className="text-[10px] text-red-400 mt-1">⚠ Wajib diisi</p>}
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
            <div className="pt-4 flex items-center justify-between border-t border-slate-850/80">
              {(!compField.trim() || !compProduct.trim() || !compAddress.trim()) && (
                <p className="text-xs text-amber-400 flex items-center gap-1.5">
                  <span>⚠</span> Lengkapi field bertanda <span className="text-red-400 font-bold">*</span> sebelum menyimpan
                </p>
              )}
              <div className="ml-auto">
                <button onClick={handleSaveCompany} disabled={saving || !compField.trim() || !compProduct.trim() || !compAddress.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-650 text-sm font-semibold rounded-xl text-white hover:bg-indigo-600 transition-colors cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                  <Save className="h-4 w-4" />
                  {saving ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: PROJECT CHARTER ── */}
        {activeTab === 'charter' && (
          <fieldset disabled={isLocked && !isKonsultan} className="group disabled:opacity-80">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h2 className="text-lg font-bold text-slate-200">Productivity Project Charter</h2>
              <div className="flex gap-2 items-center">
                {/* Button removed by user request */}
              </div>
            </div>
            
            {isDrafting && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 text-sm font-semibold flex items-center justify-center gap-2 animate-pulse">
                <BrainCircuit className="h-5 w-5" /> Menyusun draft otomatis berdasarkan jawaban kuesioner Anda...
              </div>
            )}
            
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Pernyataan Masalah (Problem Statement)</label>
                <textarea value={charterProblem} onChange={(e) => handleFieldChange('problem_statement', e.target.value, setCharterProblem)}
                  placeholder="Detail kendala saat ini..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm h-24" />

              </div>
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tujuan &amp; Sasaran (Objectives)</label>
                <textarea value={charterObjectives} onChange={(e) => handleFieldChange('objectives', e.target.value, setCharterObjectives)}
                  placeholder="Tujuan terukur yang ingin dicapai..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm h-20" />

              </div>
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Target Produktivitas</label>
                <textarea value={charterTarget} onChange={(e) => handleFieldChange('productivity_target', e.target.value, setCharterTarget)} rows={3}
                  placeholder="Misal: Kenaikan OPH 15%, Penurunan reject rate ke <2%"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm" />

              </div>
              {/* === TIER SPECIFIC FIELDS (Scope, Business Case, Timeline) === */}
              {company?.tier === 'simple' && !showAdvancedFields ? (
                <div className="mt-6 p-4 border border-slate-800 border-dashed rounded-xl flex items-center justify-between bg-slate-900/30">
                  <div>
                    <h4 className="text-sm font-bold text-slate-300">Detail Lanjutan (Opsional)</h4>
                    <p className="text-xs text-slate-500 mt-1">Isi Ruang Lingkup, Business Case, dan Timeline jika diperlukan.</p>
                  </div>
                  <button onClick={() => setShowAdvancedFields(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer">
                    Tampilkan Kolom
                  </button>
                </div>
              ) : (
                <div className="space-y-4 mt-6 pt-4 border-t border-slate-800">
                  {company?.tier === 'simple' && (
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-bold text-slate-300">Detail Lanjutan (Opsional)</h4>
                      <button onClick={() => setShowAdvancedFields(false)} className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">Sembunyikan</button>
                    </div>
                  )}
                  
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Ruang Lingkup (Scope) {company?.tier === 'simple' && <span className="text-slate-600 normal-case font-normal">(Opsional)</span>}</label>
                    <textarea value={charterScope} onChange={(e) => handleFieldChange('scope', e.target.value, setCharterScope)} rows={3}
                      placeholder="Batasan perbaikan, area yang difokuskan, dan out-of-scope..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm" />
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Business Case {company?.tier === 'simple' && <span className="text-slate-600 normal-case font-normal">(Opsional)</span>}</label>
                    <textarea value={charterBusinessCase} onChange={(e) => handleFieldChange('business_case', e.target.value, setCharterBusinessCase)} rows={3}
                      placeholder="Alasan strategis finansial atau bisnis mengapa proyek ini penting..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm" />
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Timeline (Jadwal) {company?.tier === 'simple' && <span className="text-slate-600 normal-case font-normal">(Opsional)</span>}</label>
                    <textarea value={charterTimeline} onChange={(e) => handleFieldChange('timeline', e.target.value, setCharterTimeline)} rows={3}
                      placeholder="Estimasi waktu penyelesaian (Misal: Fase Measure di Bulan 1, Improve di Bulan 3)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-sm" />
                  </div>
                </div>
              )}
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
              <button onClick={handleSaveCharter} disabled={saving || (isLocked && !isKonsultan)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-650 text-sm font-semibold rounded-xl text-white hover:bg-indigo-600 transition-colors cursor-pointer shadow-md disabled:opacity-50">
                <Save className="h-4 w-4" />
                {saving ? 'Menyimpan...' : 'Simpan Project Charter'}
              </button>
            </div>
          </div>
          </fieldset>
        )}
        </div>{/* close glass-card */}
      </div>{/* close outer wrapper div */}
    </div>
  )
}
