'use client'

import { useState, useEffect } from 'react'
import { getCompanies, createCompany, updateCompany } from '@/lib/db'
import { Company } from '@/lib/mockData'
import { Building, Save, User, Phone, Mail } from 'lucide-react'

export default function CompanyProfilePage() {
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

  // PIC details
  const [picName, setPicName] = useState('')
  const [picPosition, setPicPosition] = useState('')
  const [picPhone, setPicPhone] = useState('')
  const [picEmail, setPicEmail] = useState('')

  useEffect(() => {
    async function loadCompany() {
      const localUser = localStorage.getItem('sibimkon_user')
      if (!localUser) return
      const u = JSON.parse(localUser)
      const userOrg = u.organization || 'My Company'
      
      const companies = await getCompanies()
      const org = userOrg.toLowerCase().trim()
      let comp = companies.find((c) => {
        const name = c.name.toLowerCase().trim()
        return name === org || name.includes(org) || org.includes(name)
      })

      if (!comp) {
        comp = await createCompany({
          name: userOrg,
          address: '',
          province: '',
          city: '',
          business_field: '',
          total_employees: 0,
          certifications: [],
          pic_name: u.full_name || '',
          pic_email: u.email || '',
        })
      }

      setCompany(comp)
      setCompName(comp.name)
      setCompAddress(comp.address || '')
      setCompEmployees(comp.total_employees || 0)
      setCompField(comp.business_field || '')
      setCompProduct((comp as any).main_product || '')
      setCompKadin((comp as any).kadin_membership || 'tidak_aktif')
      setCompUnion((comp as any).labor_union || '')
      setCompPkb((comp as any).pkb_status || 'tidak_ada')
      setCompCertifications(comp.certifications || [])
      
      setPicName(comp.pic_name || '')
      setPicPosition(comp.pic_position || '')
      setPicPhone(comp.pic_phone || '')
      setPicEmail(comp.pic_email || '')
    }
    loadCompany()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return
    setSaving(true)
    setSaveMsg(null)

    try {
      // Simpan ke Supabase via updateCompany, fallback ke mockDB otomatis di dalam fungsi
      await updateCompany(company.id, {
        name: compName,
        address: compAddress,
        total_employees: Number(compEmployees),
        business_field: compField,
        main_product: compProduct,
        kadin_membership: compKadin,
        labor_union: compUnion,
        pkb_status: compPkb,
        certifications: compCertifications,
        pic_name: picName,
        pic_position: picPosition,
        pic_phone: picPhone,
        pic_email: picEmail,
      })

      // Sync mockDB agar tampilan sidebar tetap konsisten
      const { getMockDB, updateMockDB } = await import('@/lib/mockData')
      const db = getMockDB()
      const updatedCompany = {
        ...company,
        name: compName,
        address: compAddress,
        total_employees: Number(compEmployees),
        business_field: compField,
        certifications: compCertifications,
        pic_name: picName,
        pic_position: picPosition,
        pic_phone: picPhone,
        pic_email: picEmail,
      }
      const updatedList = db.companies.map((c: any) =>
        c.id === company.id ? updatedCompany : c
      )
      updateMockDB('companies', updatedList)
      setCompany(updatedCompany as any)

      setSaveMsg('Profil perusahaan dan kontak PIC berhasil disimpan!')
      setTimeout(() => setSaveMsg(null), 3000)
    } catch (err) {
      console.error(err)
      setSaveMsg('Gagal menyimpan. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCert = () => {
    if (!newCert || compCertifications.includes(newCert)) return
    setCompCertifications([...compCertifications, newCert])
    setNewCert('')
  }

  const handleDeleteCert = (certName: string) => {
    if (!window.confirm(`Hapus sertifikasi "${certName}"?`)) return
    setCompCertifications(compCertifications.filter(c => c !== certName))
  }

  if (!company) {
    return <div className="text-center py-20 text-slate-400 text-sm">Memuat profil perusahaan...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Building className="h-6 w-6 text-indigo-400" />
            Profil Perusahaan &amp; PIC
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola identitas perusahaan klien dan data kontak person in charge (PIC) resmi</p>
        </div>
      </div>

      {saveMsg && (
        <div className="px-4 py-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-sm text-emerald-400 animate-fade-in">
          ✅ {saveMsg}
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        
        {/* Section 1: Profil Perusahaan */}
        <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-3 flex items-center gap-2">
            <Building className="h-5 w-5 text-indigo-400" /> Data Profil Perusahaan
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nama Perusahaan</label>
              <input type="text" value={compName} disabled
                className="w-full bg-slate-950/40 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-500 text-sm" />
              <p className="text-[10px] text-slate-600 mt-1">Nama perusahaan dikunci berdasarkan pendaftaran akun.</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Sektor Industri / Bidang Usaha</label>
              <input type="text" required placeholder="Garmen, Makanan, Tekstil, Kayu..." value={compField} onChange={(e) => setCompField(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-350 focus:outline-none focus:border-indigo-500 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Produk Utama</label>
              <input type="text" placeholder="Misal: Pakaian Jadi, Keripik Tempe" value={compProduct} onChange={(e) => setCompProduct(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-350 focus:outline-none focus:border-indigo-500 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Jumlah Tenaga Kerja</label>
              <input type="number" required value={compEmployees} onChange={(e) => setCompEmployees(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-350 focus:outline-none focus:border-indigo-500 text-sm" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Alamat Lengkap Perusahaan</label>
              <textarea required value={compAddress} onChange={(e) => setCompAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-350 focus:outline-none focus:border-indigo-500 text-sm h-18" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Keanggotaan Asosiasi</label>
              <select value={compKadin} onChange={(e) => setCompKadin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-350 focus:outline-none focus:border-indigo-500 text-sm">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-350 focus:outline-none focus:border-indigo-500 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Perjanjian Kerja Bersama (PKB)</label>
              <select value={compPkb} onChange={(e) => setCompPkb(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-350 focus:outline-none focus:border-indigo-500 text-sm">
                <option value="tidak_ada">Belum Ada PKB</option>
                <option value="ada_aktif">Ada (Aktif)</option>
                <option value="proses_perpanjangan">Dalam Proses Perpanjangan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Daftar Sertifikasi (ISO, SMK3, Halal, dll)</label>
              <div className="flex gap-2">
                <input type="text" value={newCert} onChange={(e) => setNewCert(e.target.value)}
                  placeholder="Tambah Sertifikasi..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500" />
                <button type="button" onClick={handleAddCert}
                  className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-xs font-bold rounded-xl text-indigo-400">Tambah</button>
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
        </div>

        {/* Section 2: Data PIC Wajib */}
        <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-3 flex items-center gap-2">
            <User className="h-5 w-5 text-amber-400" /> Kontak Person in Charge (PIC)
          </h2>
          <p className="text-xs text-slate-500 -mt-3">
            PIC adalah perwakilan resmi perusahaan yang dapat dihubungi langsung oleh konsultan SIBIMKON untuk koordinasi program.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nama PIC <span className="text-red-400">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-600" />
                <input type="text" required placeholder="Nama Lengkap PIC" value={picName} onChange={(e) => setPicName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-350 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Jabatan PIC <span className="text-red-400">*</span></label>
              <input type="text" required placeholder="Supervisor Sewing / Manager Produksi / HR" value={picPosition} onChange={(e) => setPicPosition(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-350 focus:outline-none focus:border-indigo-500 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">No. Telepon / WhatsApp <span className="text-red-400">*</span></label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-600" />
                <input type="text" required placeholder="08xxxxxxxxxx" value={picPhone} onChange={(e) => setPicPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-350 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email PIC <span className="text-red-400">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-600" />
                <input type="email" required placeholder="pic@perusahaan.com" value={picEmail} onChange={(e) => setPicEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-350 focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-650 hover:bg-indigo-600 text-sm font-bold rounded-xl text-white transition-colors cursor-pointer shadow-md disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? 'Menyimpan...' : 'Simpan Profil & PIC'}
          </button>
        </div>
      </form>
    </div>
  )
}
