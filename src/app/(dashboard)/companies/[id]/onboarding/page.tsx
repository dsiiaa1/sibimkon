'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCompanies, getCompanyBaselineAssessment, saveCompanyBaselineAssessment } from '@/lib/db'
import { CompanyBaselineAssessment, Company } from '@/lib/mockData'
import { ArrowLeft, CheckCircle2, Save, Send, Building, Users, Activity, BarChart, Settings, ListChecks } from 'lucide-react'

const RadioYesNo = ({ 
  value, 
  onChange, 
  disabled, 
  required = true, 
  name, 
  label,
  requiredMark = true,
  children,
  showReason = false,
  reasonValue = '',
  onReasonChange,
  yesLabel = "Ya",
  noLabel = "Tidak"
}: { 
  value: boolean | undefined, 
  onChange: (val: boolean) => void, 
  disabled?: boolean, 
  required?: boolean, 
  name: string,
  label: string,
  requiredMark?: boolean,
  children?: React.ReactNode,
  showReason?: boolean,
  reasonValue?: string,
  onReasonChange?: (val: string) => void,
  yesLabel?: string,
  noLabel?: string
}) => {
  return (
    <div className="flex flex-col gap-2 bg-slate-900/20 p-3 rounded-xl border border-slate-800/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <label className="text-sm text-slate-300 font-medium">
          {label} {requiredMark && <span className="text-amber-500">*</span>}
        </label>
        <div className="flex items-center gap-4 shrink-0">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input 
              type="radio" 
              name={name}
              checked={value === true} 
              onChange={() => onChange(true)} 
              disabled={disabled} 
              required={required} 
              className="text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700" 
            />
            {yesLabel}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input 
              type="radio" 
              name={name}
              checked={value === false} 
              onChange={() => onChange(false)} 
              disabled={disabled} 
              required={required} 
              className="text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700" 
            />
            {noLabel}
          </label>
        </div>
      </div>
      
      {showReason && value !== undefined && (
        <div className="mt-2 pt-2 border-t border-slate-800/50">
          <label className="text-xs text-slate-400 font-medium block mb-1">Alasan *</label>
          <textarea
            required={required}
            disabled={disabled}
            value={reasonValue}
            onChange={(e) => onReasonChange && onReasonChange(e.target.value)}
            className="w-full h-16 bg-slate-950/50 border border-slate-800 rounded-lg p-2 text-sm text-slate-200"
            placeholder="Tuliskan alasan..."
          />
        </div>
      )}

      {children && (
        <div className="mt-2 pt-2 border-t border-slate-800/50">
          {children}
        </div>
      )}
    </div>
  )
}

export default function OnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string

  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState<CompanyBaselineAssessment | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [activeTab, setActiveTab] = useState(1)

  // Editable Profile fields
  const [editablePhone, setEditablePhone] = useState('')
  const [editableEmail, setEditableEmail] = useState('')

  // New specific fields
  const [tahunPendirian, setTahunPendirian] = useState('')
  const [kepemilikan, setKepemilikan] = useState('')
  const [pemilikGender, setPemilikGender] = useState('L')
  const [asalInvestasi, setAsalInvestasi] = useState('')
  const [konsumenUtama, setKonsumenUtama] = useState('')
  
  const [ekspor, setEkspor] = useState<boolean | undefined>(undefined)
  const [eksporPersen, setEksporPersen] = useState<number | ''>('')
  
  const [kadin, setKadin] = useState<boolean | undefined>(undefined)
  const [kadinNama, setKadinNama] = useState('')
  
  const [serikatPekerja, setSerikatPekerja] = useState<boolean | undefined>(undefined)
  const [serikatPekerjaNama, setSerikatPekerjaNama] = useState('')
  
  const [pkb, setPkb] = useState<boolean | undefined>(undefined)
  const [pkbTanggal, setPkbTanggal] = useState('')

  const [strukturStaf, setStrukturStaf] = useState<any>({
    karyawan_tetap: { jumlah: '', perempuan: '' },
    manajer: { jumlah: '', perempuan: '' },
    supervisor: { jumlah: '', perempuan: '' },
    karyawan_tetap_lain: { jumlah: '', perempuan: '' },
    karyawan_kontrak: { jumlah: '', perempuan: '' }
  })
  
  const [jamKerja, setJamKerja] = useState('')
  const [upahDigital, setUpahDigital] = useState<boolean | undefined>(undefined)
  const [upahDigitalPersen, setUpahDigitalPersen] = useState<number | ''>('')

  const [dimensiProduction, setDimensiProduction] = useState<any>({})
  const [dimensiQuality, setDimensiQuality] = useState<any>({})
  const [dimensiCost, setDimensiCost] = useState<any>({})
  const [dimensiDelivery, setDimensiDelivery] = useState<any>({})
  const [dimensiSafety, setDimensiSafety] = useState<any>({})
  const [dimensiMorale, setDimensiMorale] = useState<any>({})

  const [ringkasanMasalah, setRingkasanMasalah] = useState('')
  const [ringkasanRencana, setRingkasanRencana] = useState('')
  const [ringkasanTraining, setRingkasanTraining] = useState('')
  const [baganOrganisasi, setBaganOrganisasi] = useState('')
  const [prosesProduksi, setProsesProduksi] = useState('')

  useEffect(() => {
    async function loadData() {
      const companies = await getCompanies()
      const comp = companies.find((c: any) => c.id === companyId)
      if (comp) setCompany(comp)
      
      const data = await getCompanyBaselineAssessment(companyId)
      if (data) {
        setAssessment(data)
        setTahunPendirian(data.tahun_pendirian || '')
        setKepemilikan(data.kepemilikan || '')
        setPemilikGender(data.pemilik_gender || 'L')
        setAsalInvestasi(data.asal_investasi || '')
        setKonsumenUtama(data.konsumen_utama || '')
        setEkspor(data.ekspor)
        setEksporPersen(data.ekspor_persen_produksi || '')
        
        const anyData = data as any;
        setKadin(anyData.kadin_member)
        setKadinNama(anyData.kadin_nama || '')
        setSerikatPekerja(anyData.serikat_pekerja)
        setSerikatPekerjaNama(anyData.serikat_pekerja_nama || '')
        setPkb(anyData.pkb)
        setPkbTanggal(anyData.pkb_tanggal || '')

        if (data.struktur_staf) setStrukturStaf(data.struktur_staf)
        setJamKerja(data.jam_kerja_keseluruhan || '')
        setUpahDigital(data.upah_digital)
        setUpahDigitalPersen(data.upah_digital_persen || '')

        setDimensiProduction(data.dimensi_production || {})
        setDimensiQuality(data.dimensi_quality || {})
        setDimensiCost(data.dimensi_cost || {})
        setDimensiDelivery(data.dimensi_delivery || {})
        setDimensiSafety(data.dimensi_safety || {})
        setDimensiMorale(data.dimensi_morale || {})

        setRingkasanMasalah(data.ringkasan_masalah_utama || '')
        setRingkasanRencana(data.ringkasan_rencana_program || '')
        setRingkasanTraining(data.ringkasan_kegiatan_training || '')
        setBaganOrganisasi(data.bagan_organisasi || '')
        setProsesProduksi(data.proses_produksi || '')
      }
      
      if (comp) {
        setEditablePhone(comp.pic_phone || '')
        setEditableEmail(comp.pic_email || '')
      }

      setLoading(false)
    }
    loadData()
  }, [companyId])

  const handleSave = async (status: 'draft' | 'submitted') => {
    const updated: any = {
      id: assessment?.id || `onb-${Date.now()}`,
      company_id: companyId,
      status,
      tahun_pendirian: tahunPendirian,
      kepemilikan,
      pemilik_gender: pemilikGender,
      asal_investasi: asalInvestasi,
      konsumen_utama: konsumenUtama,
      ekspor,
      ekspor_persen_produksi: eksporPersen,
      
      kadin_member: kadin,
      kadin_nama: kadinNama,
      serikat_pekerja: serikatPekerja,
      serikat_pekerja_nama: serikatPekerjaNama,
      pkb,
      pkb_tanggal: pkbTanggal,

      struktur_staf: strukturStaf,
      jam_kerja_keseluruhan: jamKerja,
      upah_digital: upahDigital,
      upah_digital_persen: upahDigitalPersen,
      
      dimensi_production: dimensiProduction,
      dimensi_quality: dimensiQuality,
      dimensi_cost: dimensiCost,
      dimensi_delivery: dimensiDelivery,
      dimensi_safety: dimensiSafety,
      dimensi_morale: dimensiMorale,
      
      ringkasan_masalah_utama: ringkasanMasalah,
      ringkasan_rencana_program: ringkasanRencana,
      ringkasan_kegiatan_training: ringkasanTraining,
      bagan_organisasi: baganOrganisasi,
      proses_produksi: prosesProduksi
    }
    
    if (status === 'submitted') {
      updated.submitted_at = new Date().toISOString()
    }
    
    await saveCompanyBaselineAssessment(updated)
    setAssessment(updated)
    
    if (status === 'submitted') {
      alert('Kuesioner berhasil dikirim dan dikunci.')
      router.push(`/profile`)
    } else {
      alert('Draft berhasil disimpan.')
    }
  }

  const updateStruktur = (role: string, field: string, val: string) => {
    setStrukturStaf((prev: any) => ({
      ...prev,
      [role]: { ...prev[role], [field]: val }
    }))
  }

  const updatePQCDSM = (dim: string, key: string, val: any) => {
    if (dim === 'production') setDimensiProduction((prev: any) => ({ ...prev, [key]: val }))
    else if (dim === 'quality') setDimensiQuality((prev: any) => ({ ...prev, [key]: val }))
    else if (dim === 'cost') setDimensiCost((prev: any) => ({ ...prev, [key]: val }))
    else if (dim === 'delivery') setDimensiDelivery((prev: any) => ({ ...prev, [key]: val }))
    else if (dim === 'safety') setDimensiSafety((prev: any) => ({ ...prev, [key]: val }))
    else if (dim === 'morale') setDimensiMorale((prev: any) => ({ ...prev, [key]: val }))
  }

  if (loading) return <div className="text-center py-20 text-slate-400 text-sm">Memuat form kuesioner...</div>

  const isLocked = assessment?.status === 'submitted' || assessment?.status === 'locked'

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="p-2 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-indigo-400" />
              KUESIONER BASELINE ASESSMENT
            </h1>
            <p className="text-xs text-slate-500 mt-1">Peningkatan Produktivitas - {company?.name}</p>
          </div>
        </div>
        {isLocked && (
          <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Terkunci Permanen
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 1, label: 'Profil & Staf', icon: Users },
          { id: 2, label: 'Ringkasan', icon: Settings },
          { id: 3, label: 'PQCDSM 1', icon: Activity },
          { id: 4, label: 'PQCDSM 2', icon: BarChart },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {isLocked && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
          ⚠️ Kuesioner ini sudah dikunci secara permanen dan tidak dapat diedit lagi.
        </div>
      )}

      {/* Forms Area */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          if (confirm('Anda yakin ingin mensubmit Kuesioner ini? Setelah dikirim, form akan TERKUNCI dan tidak dapat diubah lagi.')) {
            handleSave('submitted')
          }
        }} 
        className="glass-card bg-slate-950/40 border border-slate-800 rounded-3xl p-6 md:p-8"
      >
        
        {/* TAB 1: Profil & Staf */}
        <div className={activeTab === 1 ? 'block space-y-8 animate-fade-in' : 'hidden'}>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">A. Profil Perusahaan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Nama Perusahaan 🔗</label>
                <input type="text" value={company?.name || ''} readOnly className="w-full bg-slate-900/50 text-slate-500 rounded-lg p-2 text-sm border-0" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Alamat 🔗</label>
                <input type="text" value={company?.address || ''} readOnly className="w-full bg-slate-900/50 text-slate-500 rounded-lg p-2 text-sm border-0" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Phone *</label>
                <input required type="text" value={editablePhone} onChange={e => setEditablePhone(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Email (harus diisi) *</label>
                <input required type="email" value={editableEmail} onChange={e => setEditableEmail(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Produk Utama 🔗</label>
                <input type="text" value={company?.main_product || ''} readOnly className="w-full bg-slate-900/50 text-slate-500 rounded-lg p-2 text-sm border-0" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Tahun Pendirian *</label>
                <input required type="number" value={tahunPendirian} onChange={e => setTahunPendirian(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Kepemilikan *</label>
                <input required type="text" value={kepemilikan} onChange={e => setKepemilikan(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Pemilik (L/P) *</label>
                <select required value={pemilikGender} onChange={e => setPemilikGender(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm focus:border-indigo-500">
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Asal Investasi *</label>
                <input required type="text" value={asalInvestasi} onChange={e => setAsalInvestasi(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Konsumen Utama *</label>
                <input required type="text" value={konsumenUtama} onChange={e => setKonsumenUtama(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm focus:border-indigo-500" />
              </div>
              
              <div className="md:col-span-2">
                <RadioYesNo name="ekspor" label="Ekspor (langsung atau melalui perantara)" value={ekspor} onChange={setEkspor} disabled={isLocked}>
                  {ekspor === true && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">% Produksi:</span>
                      <input required type="number" step="0.01" value={eksporPersen} onChange={e => setEksporPersen(Number(e.target.value))} disabled={isLocked} className="w-32 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-1 text-sm focus:border-indigo-500" />
                    </div>
                  )}
                </RadioYesNo>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-400">Sertifikat yg dimiliki 🔗</label>
                <input type="text" value={company?.certifications?.join(', ') || ''} readOnly className="w-full bg-slate-900/50 text-slate-500 rounded-lg p-2 text-sm border-0" />
              </div>

              <div className="md:col-span-2">
                <RadioYesNo name="kadin" label="Masuk dalam Organisasi KADIN/APINDO" value={kadin} onChange={setKadin} disabled={isLocked}>
                  {kadin === true && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Nama:</span>
                      <input required type="text" value={kadinNama} onChange={e => setKadinNama(e.target.value)} disabled={isLocked} className="flex-1 max-w-sm bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-1 text-sm focus:border-indigo-500" />
                    </div>
                  )}
                </RadioYesNo>
              </div>

              <div className="md:col-span-2">
                <RadioYesNo name="serikatPekerja" label="Serikat Pekerja" value={serikatPekerja} onChange={setSerikatPekerja} disabled={isLocked}>
                  {serikatPekerja === true && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Nama:</span>
                      <input required type="text" value={serikatPekerjaNama} onChange={e => setSerikatPekerjaNama(e.target.value)} disabled={isLocked} className="flex-1 max-w-sm bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-1 text-sm focus:border-indigo-500" />
                    </div>
                  )}
                </RadioYesNo>
              </div>

              <div className="md:col-span-2">
                <RadioYesNo name="pkb" label="Perjanjian Kerja Bersama (PKB)" value={pkb} onChange={setPkb} disabled={isLocked}>
                  {pkb === true && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Berlaku sampai (Tanggal):</span>
                      <input required type="text" value={pkbTanggal} onChange={e => setPkbTanggal(e.target.value)} disabled={isLocked} className="flex-1 max-w-sm bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-1 text-sm focus:border-indigo-500" placeholder="DD/MM/YYYY" />
                    </div>
                  )}
                </RadioYesNo>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">B. Struktur Staf</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3 font-semibold">Tipe Staf</th>
                    <th className="p-3 font-semibold">Jumlah [Angka] *</th>
                    <th className="p-3 font-semibold">Perempuan [Angka] *</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'karyawan_tetap', label: 'Jumlah karyawan (karyawan tetap)' },
                    { key: 'manajer', label: 'Jumlah manajer (mengawasi tugas supervisor)' },
                    { key: 'supervisor', label: 'Jumlah supervisor (mengawasi tugas pekerja)' },
                    { key: 'karyawan_tetap_lain', label: 'Jumlah karyawan tetap yang lain' },
                    { key: 'karyawan_kontrak', label: 'Jumlah karyawan temporer/kontrak' },
                  ].map(row => (
                    <tr key={row.key} className="border-b border-slate-800/50 hover:bg-slate-900/20">
                      <td className="p-3">{row.label}</td>
                      <td className="p-3">
                        <input required type="number" value={strukturStaf[row.key]?.jumlah || ''} onChange={e => updateStruktur(row.key, 'jumlah', e.target.value)} disabled={isLocked} className="w-full max-w-[120px] bg-slate-950/50 border border-slate-800 rounded p-1 text-center text-slate-200" />
                      </td>
                      <td className="p-3">
                        <input required type="number" value={strukturStaf[row.key]?.perempuan || ''} onChange={e => updateStruktur(row.key, 'perempuan', e.target.value)} disabled={isLocked} className="w-full max-w-[120px] bg-slate-950/50 border border-slate-800 rounded p-1 text-center text-slate-200" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Jam kerja keseluruhan *</label>
                <input required type="text" value={jamKerja} onChange={e => setJamKerja(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm" />
              </div>
              <div className="space-y-2">
                <RadioYesNo name="upahDigital" label="Pembayaran upah secara digital (semua atau sebagian)" value={upahDigital} onChange={setUpahDigital} disabled={isLocked}>
                  {upahDigital === true && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Berapa % yg digital:</span>
                      <input required type="number" step="0.01" value={upahDigitalPersen} onChange={e => setUpahDigitalPersen(Number(e.target.value))} disabled={isLocked} className="w-24 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-1 text-sm" />
                    </div>
                  )}
                </RadioYesNo>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 2: Ringkasan */}
        <div className={activeTab === 2 ? 'block space-y-8 animate-fade-in' : 'hidden'}>
          <h3 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-2">C. Ringkasan Pendahuluan</h3>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-300">Penjelasan Singkat Manajemen (Masalah utama dalam Peningkatan Produktivitas menurut Manajemen)</label>
              <textarea value={ringkasanMasalah} onChange={e => setRingkasanMasalah(e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-3 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-300">Rencana Program dan kegiatan utama Peningkatan Produktivitas yang dimasukkan dalam Perencanaan Strategis Perusahaan</label>
              <textarea value={ringkasanRencana} onChange={e => setRingkasanRencana(e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-3 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-300">Kegiatan Training/Vokasi yang dilakukan</label>
              <textarea value={ringkasanTraining} onChange={e => setRingkasanTraining(e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-3 text-sm" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-300">Bagan organisasi / Struktur</label>
                <textarea placeholder="Jelaskan atau sertakan link" value={baganOrganisasi} onChange={e => setBaganOrganisasi(e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-3 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-300">Proses Produksi</label>
                <textarea placeholder="Jelaskan proses produksi..." value={prosesProduksi} onChange={e => setProsesProduksi(e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-3 text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* TAB 3: PQCDSM 1 */}
        <div className={activeTab === 3 ? 'block space-y-8 animate-fade-in' : 'hidden'}>
          <h3 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-2">D. Bidang Peningkatan (Part 1)</h3>
          
          {/* 1. Production */}
          <div className="space-y-4">
            <h4 className="font-bold text-indigo-400">1. Kelancaran Produksi (Production)</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Informasi tentang bahan dan mesin/sarana produksi: Informasi tentang Kelancaran Produksi mulai dari ketersediaan bahan dan Proses *</label>
                <textarea required value={dimensiProduction.info_kelancaran || ''} onChange={e => updatePQCDSM('production', 'info_kelancaran', e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200" placeholder="Tanggapan/Komentar bebas..." />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Apakah terdapat masalah Ketersediaan Bahan-bahan dan kontinuitas *</label>
                <textarea required value={dimensiProduction.masalah_bahan || ''} onChange={e => updatePQCDSM('production', 'masalah_bahan', e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200" placeholder="Tanggapan/Komentar bebas..." />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Apakah ada masalah dalam kelangsungan proses produksi selain bahan, misalnya Mesin dan Penggunaan sarana dan prasarana *</label>
                <textarea required value={dimensiProduction.masalah_mesin || ''} onChange={e => updatePQCDSM('production', 'masalah_mesin', e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200" placeholder="Tanggapan/Komentar bebas..." />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Dukungan semua karyawan yg terkait dengan produksi sesuai dengan bidang dan tugasnya *</label>
                <textarea required value={dimensiProduction.dukungan_karyawan || ''} onChange={e => updatePQCDSM('production', 'dukungan_karyawan', e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200" placeholder="Tanggapan/Komentar bebas..." />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-slate-400 font-medium">Gangguan Kelancaran Proses akibat bahan (kali) *</label>
                  <input required type="number" value={dimensiProduction.gangguan_bahan_kali || ''} onChange={e => updatePQCDSM('production', 'gangguan_bahan_kali', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-400 font-medium">Gangguan proses akbat kerusakan mesin (kali) *</label>
                  <input required type="number" value={dimensiProduction.gangguan_mesin_kali || ''} onChange={e => updatePQCDSM('production', 'gangguan_mesin_kali', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Apakah pnjadualan produksi berjalan sesuai dengan rencana *</label>
                <textarea required value={dimensiProduction.penjadwalan_sesuai || ''} onChange={e => updatePQCDSM('production', 'penjadwalan_sesuai', e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200" placeholder="Tanggapan/Komentar bebas..." />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Apakah pernah terjadi keterlambatan produksi? *</label>
                <textarea required value={dimensiProduction.pernah_keterlambatan || ''} onChange={e => updatePQCDSM('production', 'pernah_keterlambatan', e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200" placeholder="Tanggapan/Komentar bebas..." />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Bagaimana keselarasan bidang/departemen yang mendukung kelancaran produksi terkait dengan ketepatan waktu produksi *</label>
                <textarea required value={dimensiProduction.keselarasan_departemen || ''} onChange={e => updatePQCDSM('production', 'keselarasan_departemen', e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200" placeholder="Tanggapan/Komentar bebas..." />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Apakah target produksi selalu tercapai atau tidak *</label>
                <textarea required value={dimensiProduction.target_tercapai || ''} onChange={e => updatePQCDSM('production', 'target_tercapai', e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200" placeholder="Tanggapan/Komentar bebas..." />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-400 font-medium">Jika tidak dimana penyebabnya *</label>
                <textarea required value={dimensiProduction.penyebab_tidak_tercapai || ''} onChange={e => updatePQCDSM('production', 'penyebab_tidak_tercapai', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200" placeholder="Tanggapan/Komentar bebas..." />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Bagaimana kondisi seluruh sarana produksi dalam rangka mendukung kelancaran produksi *</label>
                <textarea required value={dimensiProduction.kondisi_sarana || ''} onChange={e => updatePQCDSM('production', 'kondisi_sarana', e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200" placeholder="Tanggapan/Komentar bebas..." />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold text-amber-400">Persoalan-persoalan penting yang perlu disampaikan di bidang Kelancaran Produksi *</label>
                <textarea required value={dimensiProduction.persoalan_penting || ''} onChange={e => updatePQCDSM('production', 'persoalan_penting', e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:border-amber-500/50" placeholder="Tanggapan/Komentar bebas..." />
              </div>
            </div>
          </div>

          {/* 2. Quality */}
          <div className="space-y-4 pt-8 border-t border-slate-800/50">
            <h4 className="font-bold text-indigo-400">2. Kualitas/Mutu (Quality)</h4>
            <div className="space-y-4">
              <RadioYesNo name="qual_paham" label="Perusahaan memahami keinginan pelanggan dan memiliki keinginan yang tinggi untuk mempertahankan pelanggan" value={dimensiQuality.paham_pelanggan} onChange={v => updatePQCDSM('quality', 'paham_pelanggan', v)} disabled={isLocked} requiredMark={false} required={false} />
              <RadioYesNo name="qual_survei" label="Survei teratur untuk memperoleh masukan dari pelanggan" value={dimensiQuality.survei_pelanggan} onChange={v => updatePQCDSM('quality', 'survei_pelanggan', v)} disabled={isLocked} requiredMark={false} required={false} />
              <RadioYesNo name="qual_kebijakan" label="Ada kebijakan tentang mutu (yang sudah dijelaskan secara terperinci, dan diterapkan dan dipahami oleh para karyawan)" value={dimensiQuality.kebijakan_mutu} onChange={v => updatePQCDSM('quality', 'kebijakan_mutu', v)} disabled={isLocked} requiredMark={true} required={true} />
              <RadioYesNo name="qual_telusur" label="Perusahaan menelusuri Indikator Kinerja Utama (KPI) tentang mutu produksi" value={dimensiQuality.telusur_kpi} onChange={v => updatePQCDSM('quality', 'telusur_kpi', v)} disabled={isLocked} requiredMark={false} required={false} />
              <RadioYesNo name="qual_sampaikan" label="Perusahaan menyampaikan data kinerja yang bermutu (dalam bentuk tabel, grafik dll.) kepada karyawan" value={dimensiQuality.sampaikan_data} onChange={v => updatePQCDSM('quality', 'sampaikan_data', v)} disabled={isLocked} requiredMark={true} required={true} />
              <RadioYesNo name="qual_faktor" label="Faktor penyebab terjadinya barang cacat dianalisa dan diatasi secara sistematis" value={dimensiQuality.faktor_cacat_diatasi} onChange={v => updatePQCDSM('quality', 'faktor_cacat_diatasi', v)} disabled={isLocked} requiredMark={false} required={false} />
              <RadioYesNo name="qual_sop" label="Prosedur pengoperasian standar (SOP) digunakan secara teratur" value={dimensiQuality.sop_digunakan} onChange={v => updatePQCDSM('quality', 'sop_digunakan', v)} disabled={isLocked} requiredMark={false} required={false} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-slate-400 font-medium">% Jumlah Produk Cacat dari total Produk</label>
                  <input type="number" step="0.01" value={dimensiQuality.persen_cacat || ''} onChange={e => updatePQCDSM('quality', 'persen_cacat', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Penyebab utama terjadinya cacat produksi</label>
                <textarea value={dimensiQuality.penyebab_utama || ''} onChange={e => updatePQCDSM('quality', 'penyebab_utama', e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200" />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold text-amber-400">Persoalan-persoalan utama yang harus diatasi di bidang manajemen mutu</label>
                <textarea value={dimensiQuality.persoalan_penting || ''} onChange={e => updatePQCDSM('quality', 'persoalan_penting', e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:border-amber-500/50" />
              </div>
            </div>
          </div>

          {/* 3. Cost */}
          <div className="space-y-4 pt-8 border-t border-slate-800/50">
            <h4 className="font-bold text-indigo-400">3. Efisiensi Biaya (Cost)</h4>
            <div className="space-y-4">
              <RadioYesNo name="cost_pantau" label="Pemakaian sumber daya dipantau secara baik (bahan mentah, listrik, air dll.)" value={dimensiCost.pantau_sumber_daya} onChange={v => updatePQCDSM('cost', 'pantau_sumber_daya', v)} showReason={true} reasonValue={dimensiCost.pantau_sumber_daya_alasan} onReasonChange={v => updatePQCDSM('cost', 'pantau_sumber_daya_alasan', v)} disabled={isLocked} requiredMark={false} required={false} />
              <RadioYesNo name="cost_kurangi_bahan" label="Ada proses/prosedur untuk mengurangi pemakaian bahan dan ada tindakan yang sudah dilaksanakan" value={dimensiCost.proses_kurangi_bahan} onChange={v => updatePQCDSM('cost', 'proses_kurangi_bahan', v)} showReason={true} reasonValue={dimensiCost.proses_kurangi_bahan_alasan} onReasonChange={v => updatePQCDSM('cost', 'proses_kurangi_bahan_alasan', v)} disabled={isLocked} requiredMark={false} required={false} />
              <RadioYesNo name="cost_kurangi_energi" label="Ada proses untuk mengurangi pemakaian energy dan ada tindakan yang sudah dilaksanakan" value={dimensiCost.proses_kurangi_energi} onChange={v => updatePQCDSM('cost', 'proses_kurangi_energi', v)} showReason={true} reasonValue={dimensiCost.proses_kurangi_energi_alasan} onReasonChange={v => updatePQCDSM('cost', 'proses_kurangi_energi_alasan', v)} disabled={isLocked} requiredMark={true} required={true} />
              <RadioYesNo name="cost_mesin" label="Mesin diperiksa secara teratur untuk mencegah kerusakan dan untuk memantau bagian-bagian yang sudah aus serta mematau pemakaian bahan bakar" value={dimensiCost.mesin_diperiksa} onChange={v => updatePQCDSM('cost', 'mesin_diperiksa', v)} showReason={true} reasonValue={dimensiCost.mesin_diperiksa_alasan} onReasonChange={v => updatePQCDSM('cost', 'mesin_diperiksa_alasan', v)} disabled={isLocked} requiredMark={false} required={false} />
              <RadioYesNo name="cost_rawat" label="Ada sistem perawatan mesin" value={dimensiCost.sistem_perawatan} onChange={v => updatePQCDSM('cost', 'sistem_perawatan', v)} showReason={true} reasonValue={dimensiCost.sistem_perawatan_alasan} onReasonChange={v => updatePQCDSM('cost', 'sistem_perawatan_alasan', v)} disabled={isLocked} requiredMark={true} required={true} />
              
              <RadioYesNo name="cost_efisiensi" label="Efisiensi penggunaan bahan" value={dimensiCost.efisiensi_bahan} onChange={v => updatePQCDSM('cost', 'efisiensi_bahan', v)} showReason={true} reasonValue={dimensiCost.efisiensi_bahan_alasan} onReasonChange={v => updatePQCDSM('cost', 'efisiensi_bahan_alasan', v)} disabled={isLocked} noLabel="Tidak ada" requiredMark={false} required={false} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-slate-400 font-medium">Berapa % produk tidak terjual setiap tahun</label>
                  <input type="number" step="0.01" value={dimensiCost.persen_tidak_terjual || ''} onChange={e => updatePQCDSM('cost', 'persen_tidak_terjual', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold text-amber-400">Persoalan-persoalan penting yang harus diatasi di bidang Efisiensi biaya (Tkerja; Bahan; Mesin/Alat; Prosedur/SOP; Lingkungan)</label>
                <textarea value={dimensiCost.persoalan_penting || ''} onChange={e => updatePQCDSM('cost', 'persoalan_penting', e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:border-amber-500/50" />
              </div>
            </div>
          </div>
        </div>

        {/* TAB 4: PQCDSM 2 */}
        <div className={activeTab === 4 ? 'block space-y-8 animate-fade-in' : 'hidden'}>
          <h3 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-2">E. Bidang Peningkatan (Part 2)</h3>
          
          {/* 4. Delivery */}
          <div className="space-y-4">
            <h4 className="font-bold text-indigo-400">4. Waktu Penyerahan yang Tepat (Delivery Time)</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-slate-400 font-medium">Rata-rata waktu penyelesaian produk/cycle time (jam/menit/detik)</label>
                  <input type="text" value={dimensiDelivery.cycle_time || ''} onChange={e => updatePQCDSM('delivery', 'cycle_time', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-400 font-medium">Rata-rata keterlambatan waktu (jam/menit/detik)</label>
                  <input type="text" value={dimensiDelivery.waktu_terlambat || ''} onChange={e => updatePQCDSM('delivery', 'waktu_terlambat', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-400 font-medium">Jlh kali complain pelanggan akibat keterlambatan penyerahan/tahun</label>
                  <input type="number" value={dimensiDelivery.komplain_kali || ''} onChange={e => updatePQCDSM('delivery', 'komplain_kali', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-slate-400 font-medium">Waktu terlambat akibat dari Tkerja (%)</label>
                  <input type="number" step="0.01" value={dimensiDelivery.terlambat_tkerja || ''} onChange={e => updatePQCDSM('delivery', 'terlambat_tkerja', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-400 font-medium">Waktu terlambat akibat dari Bahan (%)</label>
                  <input type="number" step="0.01" value={dimensiDelivery.terlambat_bahan || ''} onChange={e => updatePQCDSM('delivery', 'terlambat_bahan', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-400 font-medium">Waktu terlambat akibat dari Mesin (%)</label>
                  <input type="number" step="0.01" value={dimensiDelivery.terlambat_mesin || ''} onChange={e => updatePQCDSM('delivery', 'terlambat_mesin', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                </div>
              </div>

              <RadioYesNo name="deliv_catat" label="Pencatatan Keterlambatan waktu (Monitoring Waktu)" value={dimensiDelivery.catat_keterlambatan} onChange={v => updatePQCDSM('delivery', 'catat_keterlambatan', v)} disabled={isLocked} requiredMark={false} required={false} />

              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold text-amber-400">Hal-hal penting yang perlu diperbaiki terkait dengan penyebab keterlambatan waktu</label>
                <textarea value={dimensiDelivery.persoalan_penting || ''} onChange={e => updatePQCDSM('delivery', 'persoalan_penting', e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:border-amber-500/50" />
              </div>
            </div>
          </div>

          {/* 5. Safety */}
          <div className="space-y-4 pt-8 border-t border-slate-800/50">
            <h4 className="font-bold text-indigo-400">5. Kenyamanan dan Keselamatan (Safety/K3)</h4>
            <div className="space-y-4">
              <RadioYesNo name="safe_penting" label="Kesehatan dan keselamatan karyawan adalah persoalan penting bagi perusahaan" value={dimensiSafety.k3_penting} onChange={v => updatePQCDSM('safety', 'k3_penting', v)} showReason={true} reasonValue={dimensiSafety.k3_penting_alasan} onReasonChange={v => updatePQCDSM('safety', 'k3_penting_alasan', v)} disabled={isLocked} requiredMark={false} required={false} />
              <RadioYesNo name="safe_komite" label="Sudah dibentuk Komite K3/ P2K3 yang melibatkan karyawan dan manajer (secara aktif)" value={dimensiSafety.komite_k3} onChange={v => updatePQCDSM('safety', 'komite_k3', v)} showReason={true} reasonValue={dimensiSafety.komite_k3_alasan} onReasonChange={v => updatePQCDSM('safety', 'komite_k3_alasan', v)} disabled={isLocked} requiredMark={true} required={true} />
              <RadioYesNo name="safe_kebijakan" label="Sudah ada kebijakan tentang K3 (yang sudah dijelaskan secara terperinci, diterapkan, dan dipahami oleh karyawan)" value={dimensiSafety.kebijakan_k3} onChange={v => updatePQCDSM('safety', 'kebijakan_k3', v)} showReason={true} reasonValue={dimensiSafety.kebijakan_k3_alasan} onReasonChange={v => updatePQCDSM('safety', 'kebijakan_k3_alasan', v)} disabled={isLocked} requiredMark={true} required={true} />
              <RadioYesNo name="safe_gender" label="Ketentuan tentang K3 berisi resiko-resiko spesifik gender yang sudah diidentifikasi (misalnya ketentuan khusus untuk perempuan hamil)" value={dimensiSafety.resiko_gender} onChange={v => updatePQCDSM('safety', 'resiko_gender', v)} showReason={true} reasonValue={dimensiSafety.resiko_gender_alasan} onReasonChange={v => updatePQCDSM('safety', 'resiko_gender_alasan', v)} disabled={isLocked} requiredMark={false} required={false} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-slate-400 font-medium">Jumlah kecelakaan dan kejadian yang menimbulkan kecelakaan Kerja (kali)</label>
                  <input type="number" value={dimensiSafety.kecelakaan_kali || ''} onChange={e => updatePQCDSM('safety', 'kecelakaan_kali', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Penyebab utama timbulnya kecelakaan</label>
                <textarea value={dimensiSafety.penyebab_kecelakaan || ''} onChange={e => updatePQCDSM('safety', 'penyebab_kecelakaan', e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200" />
              </div>

              <RadioYesNo name="safe_risiko" label="Penilaian resiko digunakan secara teratur (penilaian dilaksanakan minimal dua kali setahun)" value={dimensiSafety.penilaian_resiko} onChange={v => updatePQCDSM('safety', 'penilaian_resiko', v)} showReason={true} reasonValue={dimensiSafety.penilaian_resiko_alasan} onReasonChange={v => updatePQCDSM('safety', 'penilaian_resiko_alasan', v)} disabled={isLocked} requiredMark={true} required={true} />
              <RadioYesNo name="safe_pintu" label="Disediakan pintu keluar darurat dan diberi tanda secara jelas" value={dimensiSafety.pintu_darurat} onChange={v => updatePQCDSM('safety', 'pintu_darurat', v)} showReason={true} reasonValue={dimensiSafety.pintu_darurat_alasan} onReasonChange={v => updatePQCDSM('safety', 'pintu_darurat_alasan', v)} disabled={isLocked} requiredMark={true} required={true} />
              <RadioYesNo name="safe_apd" label="Alat Pelindung Diri (APD) disediakan untuk digunakan oleh karyawan" value={dimensiSafety.apd_disediakan} onChange={v => updatePQCDSM('safety', 'apd_disediakan', v)} showReason={true} reasonValue={dimensiSafety.apd_disediakan_alasan} onReasonChange={v => updatePQCDSM('safety', 'apd_disediakan_alasan', v)} disabled={isLocked} requiredMark={true} required={true} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-slate-400 font-medium">Berapa % Kondisi kerja di atas rata-rata sehingga karyawan merasa puas</label>
                  <input type="number" step="0.01" value={dimensiSafety.puas_kondisi || ''} onChange={e => updatePQCDSM('safety', 'puas_kondisi', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                </div>
              </div>

              <RadioYesNo name="safe_pantau_puas" label="Tingkat kepuasan karyawan dipantau" value={dimensiSafety.pantau_kepuasan} onChange={v => updatePQCDSM('safety', 'pantau_kepuasan', v)} showReason={true} reasonValue={dimensiSafety.pantau_kepuasan_alasan} onReasonChange={v => updatePQCDSM('safety', 'pantau_kepuasan_alasan', v)} disabled={isLocked} requiredMark={false} required={false} />
              
              <RadioYesNo name="safe_absen" label="Absensi dipantau" value={dimensiSafety.pantau_absensi} onChange={v => updatePQCDSM('safety', 'pantau_absensi', v)} showReason={true} reasonValue={dimensiSafety.pantau_absensi_alasan} onReasonChange={v => updatePQCDSM('safety', 'pantau_absensi_alasan', v)} disabled={isLocked} requiredMark={false} required={false}>
                {dimensiSafety.pantau_absensi === true && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Rate (%):</span>
                    <input required type="number" step="0.01" value={dimensiSafety.pantau_absensi_rate || ''} onChange={e => updatePQCDSM('safety', 'pantau_absensi_rate', e.target.value)} disabled={isLocked} className="w-24 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-1 text-sm" />
                  </div>
                )}
              </RadioYesNo>

              <RadioYesNo name="safe_turnover" label="Tingkat perputaran pekerja dipantau" value={dimensiSafety.pantau_turnover} onChange={v => updatePQCDSM('safety', 'pantau_turnover', v)} showReason={true} reasonValue={dimensiSafety.pantau_turnover_alasan} onReasonChange={v => updatePQCDSM('safety', 'pantau_turnover_alasan', v)} disabled={isLocked} requiredMark={false} required={false}>
                {dimensiSafety.pantau_turnover === true && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Rate (%):</span>
                    <input required type="number" step="0.01" value={dimensiSafety.pantau_turnover_rate || ''} onChange={e => updatePQCDSM('safety', 'pantau_turnover_rate', e.target.value)} disabled={isLocked} className="w-24 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-1 text-sm" />
                  </div>
                )}
              </RadioYesNo>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold text-amber-400">Persoalan-persoalan penting yang akan diatasi di bidang kesehatan dan keselamatan kerja (K3)</label>
                <textarea placeholder="Jika ya berapa nilainya atau %" value={dimensiSafety.persoalan_penting || ''} onChange={e => updatePQCDSM('safety', 'persoalan_penting', e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:border-amber-500/50" />
              </div>
            </div>
          </div>

          {/* 6. Morale */}
          <div className="space-y-4 pt-8 border-t border-slate-800/50">
            <h4 className="font-bold text-indigo-400">6. Moral Kerja SDM dan Loyalitas (Morale)</h4>
            <div className="space-y-4">
              <RadioYesNo name="moral_uu" label="Melaksnakan kebijakan dan praktek SDM sesuai dengan peraturan ketenagakerjaan nasional dan internasional" value={dimensiMorale.penuhi_uu} onChange={v => updatePQCDSM('morale', 'penuhi_uu', v)} showReason={true} reasonValue={dimensiMorale.penuhi_uu_alasan} onReasonChange={v => updatePQCDSM('morale', 'penuhi_uu_alasan', v)} disabled={isLocked} requiredMark={false} required={false} />
              <RadioYesNo name="moral_kebijakan" label="Ada kebijakan SDM (yang sudah dijelaskan secara terperinci, diterapkan, diperbaharui dan dipahami oleh karyawan)" value={dimensiMorale.kebijakan_sdm} onChange={v => updatePQCDSM('morale', 'kebijakan_sdm', v)} showReason={true} reasonValue={dimensiMorale.kebijakan_sdm_alasan} onReasonChange={v => updatePQCDSM('morale', 'kebijakan_sdm_alasan', v)} disabled={isLocked} requiredMark={false} required={false} />
              <RadioYesNo name="moral_upah" label="Setidaknya upah minimum sesuai UU dibayarkan" value={dimensiMorale.upah_minimum} onChange={v => updatePQCDSM('morale', 'upah_minimum', v)} showReason={true} reasonValue={dimensiMorale.upah_minimum_alasan} onReasonChange={v => updatePQCDSM('morale', 'upah_minimum_alasan', v)} disabled={isLocked} requiredMark={true} required={true} />
              <RadioYesNo name="moral_lembur" label="Lembur dibayar dengan benar dan konsisten" value={dimensiMorale.lembur_dibayar} onChange={v => updatePQCDSM('morale', 'lembur_dibayar', v)} showReason={true} reasonValue={dimensiMorale.lembur_dibayar_alasan} onReasonChange={v => updatePQCDSM('morale', 'lembur_dibayar_alasan', v)} disabled={isLocked} requiredMark={true} required={true} />
              <RadioYesNo name="moral_jam" label="Jam kerja sesuai dengan batas yang ditetapkan UU" value={dimensiMorale.jam_kerja_uu} onChange={v => updatePQCDSM('morale', 'jam_kerja_uu', v)} showReason={true} reasonValue={dimensiMorale.jam_kerja_uu_alasan} onReasonChange={v => updatePQCDSM('morale', 'jam_kerja_uu_alasan', v)} disabled={isLocked} requiredMark={true} required={true} />
              <RadioYesNo name="moral_gender" label="Praktek SDM mencakup ketentuan-ketentuan khusus yang mengatur masalah-masalah yang terkait dengan gender" value={dimensiMorale.sdm_gender} onChange={v => updatePQCDSM('morale', 'sdm_gender', v)} showReason={true} reasonValue={dimensiMorale.sdm_gender_alasan} onReasonChange={v => updatePQCDSM('morale', 'sdm_gender_alasan', v)} disabled={isLocked} requiredMark={false} required={false} />
              <RadioYesNo name="moral_aset" label="Praktek SDM mengakui karyawan sebagai aset penting perusahaan" value={dimensiMorale.sdm_aset} onChange={v => updatePQCDSM('morale', 'sdm_aset', v)} showReason={true} reasonValue={dimensiMorale.sdm_aset_alasan} onReasonChange={v => updatePQCDSM('morale', 'sdm_aset_alasan', v)} disabled={isLocked} requiredMark={false} required={false} />
              <RadioYesNo name="moral_reward" label="Ada sistem pemberian penghargaan (reward) untuk prestasi kerja yang tinggi (misalnya dalam bentuk pengakuan, pemberian insentif)" value={dimensiMorale.reward_sistem} onChange={v => updatePQCDSM('morale', 'reward_sistem', v)} showReason={true} reasonValue={dimensiMorale.reward_sistem_alasan} onReasonChange={v => updatePQCDSM('morale', 'reward_sistem_alasan', v)} disabled={isLocked} requiredMark={true} required={true} />
              <RadioYesNo name="moral_training" label="Ada sistem pelatihan karyawan untuk memastikan karyawan diberi pelatihan secara teratur" value={dimensiMorale.training_sistem} onChange={v => updatePQCDSM('morale', 'training_sistem', v)} showReason={true} reasonValue={dimensiMorale.training_sistem_alasan} onReasonChange={v => updatePQCDSM('morale', 'training_sistem_alasan', v)} disabled={isLocked} requiredMark={true} required={true} />
              <RadioYesNo name="moral_keluhan" label="Ada sistem penyampaian keluhan" value={dimensiMorale.keluhan_sistem} onChange={v => updatePQCDSM('morale', 'keluhan_sistem', v)} showReason={true} reasonValue={dimensiMorale.keluhan_sistem_alasan} onReasonChange={v => updatePQCDSM('morale', 'keluhan_sistem_alasan', v)} disabled={isLocked} requiredMark={true} required={true} />
              
              <RadioYesNo name="moral_absen" label="Absensi dipantau" value={dimensiMorale.pantau_absensi} onChange={v => updatePQCDSM('morale', 'pantau_absensi', v)} showReason={true} reasonValue={dimensiMorale.pantau_absensi_alasan} onReasonChange={v => updatePQCDSM('morale', 'pantau_absensi_alasan', v)} disabled={isLocked} requiredMark={false} required={false}>
                {dimensiMorale.pantau_absensi === true && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Rata-rata absen (%):</span>
                    <input required type="number" step="0.01" value={dimensiMorale.pantau_absensi_rate || ''} onChange={e => updatePQCDSM('morale', 'pantau_absensi_rate', e.target.value)} disabled={isLocked} className="w-24 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-1 text-sm" />
                  </div>
                )}
              </RadioYesNo>

              <RadioYesNo name="moral_turnover" label="Tingkat perputaran pekerja (Turn Over Tenaga Kerja)" value={dimensiMorale.turnover} onChange={v => updatePQCDSM('morale', 'turnover', v)} showReason={true} reasonValue={dimensiMorale.turnover_alasan} onReasonChange={v => updatePQCDSM('morale', 'turnover_alasan', v)} disabled={isLocked} requiredMark={false} required={false}>
                {dimensiMorale.turnover === true && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Rata-rata (%):</span>
                    <input required type="number" step="0.01" value={dimensiMorale.turnover_rate || ''} onChange={e => updatePQCDSM('morale', 'turnover_rate', e.target.value)} disabled={isLocked} className="w-24 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-1 text-sm" />
                  </div>
                )}
              </RadioYesNo>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-900/20 border border-slate-800/50 rounded-xl">
                <div className="space-y-1">
                  <label className="text-sm text-slate-400 font-medium">Jumlah Tenaga Kerja yang mengikuti pelatihan/vokasi pertahun (orang)</label>
                  <input type="number" value={dimensiMorale.jumlah_training_orang || ''} onChange={e => updatePQCDSM('morale', 'jumlah_training_orang', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-400 font-medium">% total Tenaga Kerja</label>
                  <input type="number" step="0.01" value={dimensiMorale.jumlah_training_persen || ''} onChange={e => updatePQCDSM('morale', 'jumlah_training_persen', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                </div>
              </div>

              <RadioYesNo name="moral_investasi" label="Investasi Pelatihan dan Vokasi Tenaga Kerja" value={dimensiMorale.investasi_training} onChange={v => updatePQCDSM('morale', 'investasi_training', v)} showReason={true} reasonValue={dimensiMorale.investasi_training_alasan} onReasonChange={v => updatePQCDSM('morale', 'investasi_training_alasan', v)} disabled={isLocked} requiredMark={false} required={false}>
                {dimensiMorale.investasi_training === true && (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Rp.../Tahun:</span>
                      <input required type="number" value={dimensiMorale.investasi_rupiah || ''} onChange={e => updatePQCDSM('morale', 'investasi_rupiah', e.target.value)} disabled={isLocked} className="w-32 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-1 text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">% Kenaikan pertahun:</span>
                      <input required type="number" step="0.01" value={dimensiMorale.investasi_kenaikan_persen || ''} onChange={e => updatePQCDSM('morale', 'investasi_kenaikan_persen', e.target.value)} disabled={isLocked} className="w-24 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-1 text-sm" />
                    </div>
                  </div>
                )}
              </RadioYesNo>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold text-amber-400">Masalah yang dihadapi dalam pelaksanaan pelatihan (Materi/silabus/Instruktur/durasi/relevansi)</label>
                <textarea value={dimensiMorale.persoalan_penting || ''} onChange={e => updatePQCDSM('morale', 'persoalan_penting', e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:border-amber-500/50" />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Buttons Always Visible */}
        <div className="pt-8 mt-8 border-t border-slate-800 flex justify-end gap-4">
          {!isLocked && (
            <>
              <button 
                type="button"
                onClick={() => {
                  const form = document.querySelector('form');
                  if (form) {
                    const elements = form.elements as any;
                    for (let i = 0; i < elements.length; i++) {
                      elements[i].required = false;
                    }
                    handleSave('draft');
                  }
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold transition-colors"
              >
                <Save className="h-4 w-4" /> Simpan Draft
              </button>
              <button 
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                <Send className="h-4 w-4" /> Submit & Kunci Permanen
              </button>
            </>
          )}
        </div>

      </form>
    </div>
  )
}
