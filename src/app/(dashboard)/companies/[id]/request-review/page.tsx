'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCompanies } from '@/lib/db'
import { Company, TierReviewRequest } from '@/lib/mockData'
import { ArrowLeft, Send } from 'lucide-react'
import { useDialog } from '@/hooks/useDialog'

export default function TierReviewRequestPage() {
  const { id } = useParams()
  const router = useRouter()
  const { showAlert } = useDialog()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!id) return
      try {
        const companies = await getCompanies()
        const comp = companies.find(c => c.id === id)
        if (comp) setCompany(comp)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return
    setSubmitting(true)
    
    try {
      const stored = localStorage.getItem('smartproductive_tierReviewRequests')
      const existing = stored ? JSON.parse(stored) : []
      
      const newRequest: TierReviewRequest = {
        id: `trq-${Math.random().toString(36).substring(2, 9)}`,
        company_id: company.id,
        requested_by: 'perusahaan',
        requested_at: new Date().toISOString(),
        message: message,
        status: 'open'
      }
      
      localStorage.setItem('smartproductive_tierReviewRequests', JSON.stringify([...existing, newRequest]))
      await showAlert('Pengajuan peninjauan tier berhasil dikirim ke Konsultan.')
      router.push('/dashboard')
    } catch (err) {
      console.error(err)
      await showAlert('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Memuat...</div>
  if (!company) return <div className="p-8 text-center text-slate-400">Data tidak ditemukan</div>

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>
      
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-xl font-bold text-white mb-2">Ajukan Peninjauan Tier</h1>
        <p className="text-sm text-slate-400 mb-6">
          Jika Anda merasa tier <strong>{company.tier}</strong> tidak sesuai dengan kondisi riil operasional Anda (misalnya ada pabrik tambahan atau karyawan kontrak tidak terhitung), silakan ajukan peninjauan kepada Konsultan.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Alasan Peninjauan</label>
            <textarea 
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Jelaskan alasan mengapa tier Anda perlu ditinjau ulang..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">
              Batal
            </button>
            <button type="submit" disabled={submitting || !message.trim()} className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
              <Send className="w-4 h-4" />
              Kirim Pengajuan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
