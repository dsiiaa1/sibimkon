'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCompanies, getCompanyBaselineAssessment, saveCompanyBaselineAssessment } from '@/lib/db'
import { CompanyBaselineAssessment, Company } from '@/lib/mockData'
import { ArrowLeft, CheckCircle2, Save, Send, Building, Users, Activity, BarChart, Settings, ListChecks } from 'lucide-react'

export default function OnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string

  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState<CompanyBaselineAssessment | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [activeTab, setActiveTab] = useState(1)

  // Editable Profile fields (only phone and email)
  const [editablePhone, setEditablePhone] = useState('')
  const [editableEmail, setEditableEmail] = useState('')

  // New specific fields
  const [tahunPendirian, setTahunPendirian] = useState('')
  const [kepemilikan, setKepemilikan] = useState('')
  const [pemilikGender, setPemilikGender] = useState('L')
  const [asalInvestasi, setAsalInvestasi] = useState('')
  const [konsumenUtama, setKonsumenUtama] = useState('')
  const [ekspor, setEkspor] = useState(false)
  const [eksporPersen, setEksporPersen] = useState<number | undefined>(undefined)

  const [strukturStaf, setStrukturStaf] = useState<any>({
    karyawan_tetap: { jumlah: '', perempuan: '' },
    manajer: { jumlah: '', perempuan: '' },
    supervisor: { jumlah: '', perempuan: '' },
    karyawan_tetap_lain: { jumlah: '', perempuan: '' },
    karyawan_kontrak: { jumlah: '', perempuan: '' }
  })
  const [jamKerja, setJamKerja] = useState('')
  const [upahDigital, setUpahDigital] = useState(false)
  const [upahDigitalPersen, setUpahDigitalPersen] = useState<number | undefined>(undefined)

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
        setEkspor(data.ekspor || false)
        setEksporPersen(data.ekspor_persen_produksi)
        
        if (data.struktur_staf) setStrukturStaf(data.struktur_staf)
        setJamKerja(data.jam_kerja_keseluruhan || '')
        setUpahDigital(data.upah_digital || false)
        setUpahDigitalPersen(data.upah_digital_persen)

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
    const updated: CompanyBaselineAssessment = {
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
          { id: 2, label: 'PQCDSM 1', icon: Activity },
          { id: 3, label: 'PQCDSM 2', icon: BarChart },
          { id: 4, label: 'Ringkasan', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
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
      <div className="glass-card bg-slate-950/40 border border-slate-800 rounded-3xl p-6 md:p-8">
        
        {/* TAB 1: Profil & Staf */}
        {activeTab === 1 && (
          <div className="space-y-8 animate-fade-in">
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
                  <label className="text-xs font-semibold text-slate-400">Phone</label>
                  <input type="text" value={editablePhone} onChange={e => setEditablePhone(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Email *</label>
                  <input type="email" value={editableEmail} onChange={e => setEditableEmail(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Produk Utama 🔗</label>
                  <input type="text" value={company?.main_product || ''} readOnly className="w-full bg-slate-900/50 text-slate-500 rounded-lg p-2 text-sm border-0" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Tahun Pendirian</label>
                  <input type="text" value={tahunPendirian} onChange={e => setTahunPendirian(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Kepemilikan</label>
                  <input type="text" value={kepemilikan} onChange={e => setKepemilikan(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Pemilik (L/P)</label>
                  <select value={pemilikGender} onChange={e => setPemilikGender(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm focus:border-indigo-500">
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Asal Investasi</label>
                  <input type="text" value={asalInvestasi} onChange={e => setAsalInvestasi(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Konsumen Utama</label>
                  <input type="text" value={konsumenUtama} onChange={e => setKonsumenUtama(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm focus:border-indigo-500" />
                </div>
                
                {/* Checkbox fields */}
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" checked={ekspor} onChange={e => setEkspor(e.target.checked)} disabled={isLocked} className="rounded border-slate-700 bg-slate-900" />
                      Ekspor (Langsung / Perantara)
                    </label>
                    {ekspor && (
                      <input type="number" placeholder="% Produksi" value={eksporPersen || ''} onChange={e => setEksporPersen(Number(e.target.value))} disabled={isLocked} className="w-32 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-1 text-sm focus:border-indigo-500" />
                    )}
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Sertifikat yg dimiliki 🔗</label>
                  <input type="text" value={company?.certifications?.join(', ') || ''} readOnly className="w-full bg-slate-900/50 text-slate-500 rounded-lg p-2 text-sm border-0" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Keanggotaan KADIN/APINDO 🔗</label>
                  <input type="text" value={company?.kadin_membership || ''} readOnly className="w-full bg-slate-900/50 text-slate-500 rounded-lg p-2 text-sm border-0" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Serikat Pekerja 🔗</label>
                  <input type="text" value={company?.labor_union || ''} readOnly className="w-full bg-slate-900/50 text-slate-500 rounded-lg p-2 text-sm border-0" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">PKB (Perjanjian Kerja Bersama) 🔗</label>
                  <input type="text" value={company?.pkb_status || ''} readOnly className="w-full bg-slate-900/50 text-slate-500 rounded-lg p-2 text-sm border-0" />
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
                      <th className="p-3 font-semibold">Jumlah Keseluruhan</th>
                      <th className="p-3 font-semibold">Jumlah Perempuan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'karyawan_tetap', label: 'Jumlah Karyawan (Karyawan Tetap)' },
                      { key: 'manajer', label: 'Jumlah Manajer (Mengawasi Supervisor)' },
                      { key: 'supervisor', label: 'Jumlah Supervisor (Mengawasi Pekerja)' },
                      { key: 'karyawan_tetap_lain', label: 'Jumlah Karyawan Tetap Lainnya' },
                      { key: 'karyawan_kontrak', label: 'Jumlah Karyawan Temporer/Kontrak' },
                    ].map(row => (
                      <tr key={row.key} className="border-b border-slate-800/50 hover:bg-slate-900/20">
                        <td className="p-3">{row.label}</td>
                        <td className="p-3">
                          <input type="number" value={strukturStaf[row.key]?.jumlah || ''} onChange={e => updateStruktur(row.key, 'jumlah', e.target.value)} disabled={isLocked} className="w-24 bg-slate-950/50 border border-slate-800 rounded p-1 text-center" />
                        </td>
                        <td className="p-3">
                          <input type="number" value={strukturStaf[row.key]?.perempuan || ''} onChange={e => updateStruktur(row.key, 'perempuan', e.target.value)} disabled={isLocked} className="w-24 bg-slate-950/50 border border-slate-800 rounded p-1 text-center" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Jam Kerja Keseluruhan</label>
                  <input type="text" value={jamKerja} onChange={e => setJamKerja(e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-2 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-300 h-full mt-4">
                    <input type="checkbox" checked={upahDigital} onChange={e => setUpahDigital(e.target.checked)} disabled={isLocked} className="rounded border-slate-700 bg-slate-900" />
                    Pembayaran Upah Digital
                  </label>
                  {upahDigital && (
                    <div className="flex items-center gap-2">
                      <input type="number" placeholder="%" value={upahDigitalPersen || ''} onChange={e => setUpahDigitalPersen(Number(e.target.value))} disabled={isLocked} className="w-24 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-1 text-sm" />
                      <span className="text-xs text-slate-500">% Karyawan</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PQCDSM 1 */}
        {activeTab === 2 && (
          <div className="space-y-8 animate-fade-in">
            <h3 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-2">C. Bidang Peningkatan (Part 1)</h3>
            
            {/* 1. Production */}
            <div className="space-y-4">
              <h4 className="font-bold text-indigo-400">1. Kelancaran Produksi (Production)</h4>
              <div className="space-y-3 bg-slate-900/20 p-4 rounded-2xl border border-slate-800/50">
                <p className="text-sm text-slate-400 font-semibold mb-2">Informasi tentang bahan dan mesin/sarana produksi:</p>
                <textarea placeholder="Informasi Kelancaran Produksi..." value={dimensiProduction.info_kelancaran || ''} onChange={e => updatePQCDSM('production', 'info_kelancaran', e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200" />
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={dimensiProduction.masalah_bahan || false} onChange={e => updatePQCDSM('production', 'masalah_bahan', e.target.checked)} disabled={isLocked} /> Terdapat masalah Ketersediaan Bahan
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={dimensiProduction.masalah_mesin || false} onChange={e => updatePQCDSM('production', 'masalah_mesin', e.target.checked)} disabled={isLocked} /> Terdapat masalah kelangsungan proses (Mesin/Sarana)
                </label>
                <div className="flex flex-col sm:flex-row gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Gangguan akibat bahan:</span>
                    <input type="number" placeholder="...kali" value={dimensiProduction.gangguan_bahan_kali || ''} onChange={e => updatePQCDSM('production', 'gangguan_bahan_kali', e.target.value)} disabled={isLocked} className="w-20 bg-slate-950/50 border border-slate-800 rounded p-1 text-sm text-center text-slate-200" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Gangguan akibat mesin:</span>
                    <input type="number" placeholder="...kali" value={dimensiProduction.gangguan_mesin_kali || ''} onChange={e => updatePQCDSM('production', 'gangguan_mesin_kali', e.target.value)} disabled={isLocked} className="w-20 bg-slate-950/50 border border-slate-800 rounded p-1 text-sm text-center text-slate-200" />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/50">
                  <label className="text-sm font-semibold text-amber-400 block mb-2">Persoalan-persoalan penting yang perlu disampaikan:</label>
                  <textarea placeholder="Ceritakan permasalahan utama kelancaran produksi..." value={dimensiProduction.persoalan_penting || ''} onChange={e => updatePQCDSM('production', 'persoalan_penting', e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:border-amber-500/50" />
                </div>
              </div>
            </div>

            {/* 2. Quality */}
            <div className="space-y-4">
              <h4 className="font-bold text-indigo-400">2. Kualitas/Mutu (Quality)</h4>
              <div className="space-y-3 bg-slate-900/20 p-4 rounded-2xl border border-slate-800/50">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={dimensiQuality.paham_pelanggan || false} onChange={e => updatePQCDSM('quality', 'paham_pelanggan', e.target.checked)} disabled={isLocked} /> Memahami keinginan pelanggan
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={dimensiQuality.survei_pelanggan || false} onChange={e => updatePQCDSM('quality', 'survei_pelanggan', e.target.checked)} disabled={isLocked} /> Survei teratur ke pelanggan
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-slate-400">% Jumlah Produk Cacat:</span>
                  <input type="number" placeholder="%" value={dimensiQuality.persen_cacat || ''} onChange={e => updatePQCDSM('quality', 'persen_cacat', e.target.value)} disabled={isLocked} className="w-20 bg-slate-950/50 border border-slate-800 rounded p-1 text-sm text-center text-slate-200" />
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800/50">
                  <label className="text-sm font-semibold text-amber-400 block mb-2">Persoalan-persoalan utama di bidang manajemen mutu:</label>
                  <textarea placeholder="Ceritakan permasalahan defect/kualitas..." value={dimensiQuality.persoalan_penting || ''} onChange={e => updatePQCDSM('quality', 'persoalan_penting', e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:border-amber-500/50" />
                </div>
              </div>
            </div>

            {/* 3. Cost */}
            <div className="space-y-4">
              <h4 className="font-bold text-indigo-400">3. Efisiensi Biaya (Cost)</h4>
              <div className="space-y-3 bg-slate-900/20 p-4 rounded-2xl border border-slate-800/50">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={dimensiCost.pantau_sumber_daya || false} onChange={e => updatePQCDSM('cost', 'pantau_sumber_daya', e.target.checked)} disabled={isLocked} /> Pemakaian sumber daya dipantau
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-slate-400">% produk tidak terjual tiap tahun:</span>
                  <input type="number" placeholder="%" value={dimensiCost.persen_tidak_terjual || ''} onChange={e => updatePQCDSM('cost', 'persen_tidak_terjual', e.target.value)} disabled={isLocked} className="w-20 bg-slate-950/50 border border-slate-800 rounded p-1 text-sm text-center text-slate-200" />
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800/50">
                  <label className="text-sm font-semibold text-amber-400 block mb-2">Persoalan-persoalan penting Efisiensi Biaya:</label>
                  <textarea placeholder="Ceritakan pemborosan/masalah biaya..." value={dimensiCost.persoalan_penting || ''} onChange={e => updatePQCDSM('cost', 'persen_penting', e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:border-amber-500/50" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PQCDSM 2 */}
        {activeTab === 3 && (
          <div className="space-y-8 animate-fade-in">
            <h3 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-2">C. Bidang Peningkatan (Part 2)</h3>
            
            {/* 4. Delivery */}
            <div className="space-y-4">
              <h4 className="font-bold text-indigo-400">4. Waktu Penyerahan (Delivery)</h4>
              <div className="space-y-3 bg-slate-900/20 p-4 rounded-2xl border border-slate-800/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Rata-rata Waktu Siklus (Cycle Time)</label>
                    <input type="text" value={dimensiDelivery.cycle_time || ''} onChange={e => updatePQCDSM('delivery', 'cycle_time', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Komplain akibat keterlambatan</label>
                    <input type="text" placeholder="...kali" value={dimensiDelivery.komplain_kali || ''} onChange={e => updatePQCDSM('delivery', 'komplain_kali', e.target.value)} disabled={isLocked} className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-sm text-slate-200" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800/50">
                  <label className="text-sm font-semibold text-amber-400 block mb-2">Penyebab Keterlambatan Waktu:</label>
                  <textarea placeholder="..." value={dimensiDelivery.persoalan_penting || ''} onChange={e => updatePQCDSM('delivery', 'persoalan_penting', e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:border-amber-500/50" />
                </div>
              </div>
            </div>

            {/* 5. Safety */}
            <div className="space-y-4">
              <h4 className="font-bold text-indigo-400">5. Kenyamanan & Keselamatan (Safety)</h4>
              <div className="space-y-3 bg-slate-900/20 p-4 rounded-2xl border border-slate-800/50">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={dimensiSafety.kebijakan_k3 || false} onChange={e => updatePQCDSM('safety', 'kebijakan_k3', e.target.checked)} disabled={isLocked} /> Ada kebijakan K3
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-slate-400">Jumlah kecelakaan kerja:</span>
                  <input type="number" placeholder="...kali" value={dimensiSafety.kecelakaan_kali || ''} onChange={e => updatePQCDSM('safety', 'kecelakaan_kali', e.target.value)} disabled={isLocked} className="w-20 bg-slate-950/50 border border-slate-800 rounded p-1 text-sm text-center text-slate-200" />
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800/50">
                  <label className="text-sm font-semibold text-amber-400 block mb-2">Persoalan-persoalan K3:</label>
                  <textarea placeholder="..." value={dimensiSafety.persoalan_penting || ''} onChange={e => updatePQCDSM('safety', 'persoalan_penting', e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:border-amber-500/50" />
                </div>
              </div>
            </div>

            {/* 6. Morale */}
            <div className="space-y-4">
              <h4 className="font-bold text-indigo-400">6. Moral Kerja SDM & Loyalitas (Morale)</h4>
              <div className="space-y-3 bg-slate-900/20 p-4 rounded-2xl border border-slate-800/50">
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-slate-400">Turn Over Tenaga Kerja rata-rata:</span>
                  <input type="number" placeholder="%" value={dimensiMorale.turnover_persen || ''} onChange={e => updatePQCDSM('morale', 'turnover_persen', e.target.value)} disabled={isLocked} className="w-20 bg-slate-950/50 border border-slate-800 rounded p-1 text-sm text-center text-slate-200" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-slate-400">Tingkat Absensi:</span>
                  <input type="number" placeholder="%" value={dimensiMorale.absensi_persen || ''} onChange={e => updatePQCDSM('morale', 'absensi_persen', e.target.value)} disabled={isLocked} className="w-20 bg-slate-950/50 border border-slate-800 rounded p-1 text-sm text-center text-slate-200" />
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800/50">
                  <label className="text-sm font-semibold text-amber-400 block mb-2">Masalah pelaksanaan pelatihan/moral:</label>
                  <textarea placeholder="..." value={dimensiMorale.persoalan_penting || ''} onChange={e => updatePQCDSM('morale', 'persoalan_penting', e.target.value)} disabled={isLocked} className="w-full h-24 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:border-amber-500/50" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Ringkasan */}
        {activeTab === 4 && (
          <div className="space-y-8 animate-fade-in">
            <h3 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-2">D. Ringkasan & Submit</h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-300">Penjelasan Singkat Manajemen (Masalah utama)</label>
                <textarea value={ringkasanMasalah} onChange={e => setRingkasanMasalah(e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-3 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-300">Rencana Program Peningkatan Produktivitas</label>
                <textarea value={ringkasanRencana} onChange={e => setRingkasanRencana(e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-3 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-300">Kegiatan Training / Vokasi</label>
                <textarea value={ringkasanTraining} onChange={e => setRingkasanTraining(e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-3 text-sm" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-300">Struktur / Bagan Organisasi</label>
                  <textarea placeholder="Jelaskan atau sertakan link" value={baganOrganisasi} onChange={e => setBaganOrganisasi(e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-3 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-300">Proses Produksi</label>
                  <textarea placeholder="Jelaskan proses produksi..." value={prosesProduksi} onChange={e => setProsesProduksi(e.target.value)} disabled={isLocked} className="w-full h-20 bg-slate-950/50 text-slate-200 border border-slate-800 rounded-lg p-3 text-sm" />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-800 flex justify-end gap-4">
              {!isLocked && (
                <>
                  <button 
                    onClick={() => handleSave('draft')}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold transition-colors"
                  >
                    <Save className="h-4 w-4" /> Simpan Draft
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm('Anda yakin ingin mensubmit Kuesioner ini? Setelah dikirim, form akan TERKUNCI dan tidak dapat diubah lagi.')) {
                        handleSave('submitted')
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <Send className="h-4 w-4" /> Submit & Kunci Permanen
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
