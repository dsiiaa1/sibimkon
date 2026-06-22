'use client'

import { useState, useEffect } from 'react'
import { createProject } from '@/lib/db'
import { Company, Project } from '@/lib/mockData'

interface Props {
  companies: Company[]
  currentUser: any
  currentUserId: string
  /** Untuk mode company detail — langsung terkunci ke 1 company */
  fixedCompanyId?: string
  fixedCompanyName?: string
  onCreated: (project: Project) => void
  onClose: () => void
}

export default function CreateProjectModal({
  companies,
  currentUser,
  currentUserId,
  fixedCompanyId,
  fixedCompanyName,
  onCreated,
  onClose,
}: Props) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [companyId, setCompanyId] = useState(fixedCompanyId || '')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 3)
    return d.toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Untuk role perusahaan: set companyId dari companies list berdasarkan organization
  useEffect(() => {
    if (fixedCompanyId) return
    if (currentUser?.role === 'perusahaan') {
      const org = (currentUser.organization || '').toLowerCase().trim()
      const comp = companies.find((c) =>
        c.name.toLowerCase().trim() === org ||
        c.name.toLowerCase().trim().includes(org) ||
        org.includes(c.name.toLowerCase().trim())
      )
      if (comp) setCompanyId(comp.id)
      else if (companies.length > 0) setCompanyId(companies[0].id)
    }
  }, [currentUser, companies, fixedCompanyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    if (!companyId) {
      setError('Pilih perusahaan terlebih dahulu')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const selectedCompany = fixedCompanyName
        ? { name: fixedCompanyName }
        : companies.find((c) => c.id === companyId)

      const newProj = await createProject({
        title: title.trim(),
        description: desc,
        company_id: companyId,
        company_name: selectedCompany?.name || currentUser?.organization || 'Unknown',
        consultant_id: currentUserId,
        status: 'define',
        start_date: startDate,
        target_end_date: endDate,
      })
      onCreated(newProj)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Gagal membuat proyek. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const isPerusahaan = currentUser?.role === 'perusahaan'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(2,6,15,0.80)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{
          background: 'var(--navy-900)',
          border: '1px solid var(--border-base)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.60)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-base)', background: 'var(--navy-950)' }}
        >
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {fixedCompanyName
              ? `Proyek Baru — ${fixedCompanyName}`
              : 'Mulai Proyek BIMKON Baru'}
          </h3>
          <button
            onClick={onClose}
            className="text-lg font-light transition-colors text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Judul Proyek
            </label>
            <input
              type="text"
              required
              placeholder="Misal: Reduksi Waste Bahan Baku Cutting Line"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Deskripsi Proyek
            </label>
            <textarea
              placeholder="Penjelasan singkat fokus improvement..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-indigo-500 text-sm h-20"
            />
          </div>

          {/* Perusahaan — locked kalau fixedCompanyId ada, atau kalau role perusahaan */}
          {!fixedCompanyId && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Perusahaan Klien
              </label>
              {isPerusahaan ? (
                <>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.organization}
                    className="w-full bg-slate-950/40 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-500 text-sm"
                  />
                  <input type="hidden" value={companyId} />
                </>
              ) : (
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="">-- Pilih Perusahaan --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Tanggal Mulai
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Target Selesai
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-350 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-650 text-sm font-semibold text-white hover:bg-indigo-600 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {saving ? 'Membuat...' : 'Buat Proyek'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
