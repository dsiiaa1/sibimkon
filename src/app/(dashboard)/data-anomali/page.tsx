'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDialog } from '@/hooks/useDialog'
import {
  AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw,
  Filter, ChevronDown, Database, ShieldAlert, Eye
} from 'lucide-react'

type AuditStatus = 'pending_review' | 'approved' | 'rejected'

interface AuditLogEntry {
  id: string
  source_table: string
  record_id: string
  project_id: string | null
  validation_rule_failed: string
  raw_value: Record<string, unknown> | null
  error_detail: string
  status: AuditStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  project_title?: string
}

const STATUS_CONFIG: Record<AuditStatus, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  pending_review: {
    label: 'Menunggu Review',
    icon: <Clock className="h-3.5 w-3.5" />,
    color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30',
  },
  approved: {
    label: 'Disetujui',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30',
  },
  rejected: {
    label: 'Ditolak',
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30',
  },
}

const RULE_LABELS: Record<string, string> = {
  null_check: 'Field Kosong',
  range_check: 'Nilai di Luar Rentang',
  cross_consistency: 'Inkonsistensi Data',
  anomaly_spike: 'Anomali / Lonjakan',
}

export default function DataAnomaliPage() {
  const { showConfirm, showPrompt, showAlert } = useDialog()
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterStatus, setFilterStatus] = useState<AuditStatus | 'all'>('pending_review')
  const [userRole, setUserRole] = useState<string>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 })

  const loadEntries = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const supabase = createClient()
      let query = supabase
        .from('data_audit_log')
        .select('*, bimkon_projects(title)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (filterStatus !== 'all') query = query.eq('status', filterStatus)

      const { data, error } = await query
      if (error) throw error

      setEntries((data ?? []).map((row: Record<string, unknown>) => ({
        ...(row as unknown as AuditLogEntry),
        project_title: (row.bimkon_projects as { title?: string } | null)?.title ?? '—',
      })))

      const { data: allStats } = await supabase.from('data_audit_log').select('status')
      const s = { pending: 0, approved: 0, rejected: 0 }
      ;(allStats ?? []).forEach((r: { status: string }) => {
        if (r.status === 'pending_review') s.pending++
        else if (r.status === 'approved') s.approved++
        else if (r.status === 'rejected') s.rejected++
      })
      setStats(s)
    } catch (err) {
      console.error('[data-anomali]', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filterStatus])

  useEffect(() => {
    const u = localStorage.getItem('smartproductive_user')
    if (u) setUserRole(JSON.parse(u).role || '')
    loadEntries()
  }, [loadEntries])

  const handleReview = async (entry: AuditLogEntry, action: 'approved' | 'rejected') => {
    const verb = action === 'approved' ? 'menyetujui' : 'menolak'
    const ok = await showConfirm(`Yakin ingin ${verb} anomali ini?\n\n"${entry.error_detail}"`,
      action === 'approved' ? 'Setujui Data' : 'Tolak Data')
    if (!ok) return

    let note = ''
    if (action === 'rejected') {
      const input = await showPrompt('Alasan penolakan (opsional):', 'Catatan Review')
      if (input === null) return
      note = input
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.from('data_audit_log').update({
        status: action,
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        reviewed_at: new Date().toISOString(),
        review_note: note || null,
      }).eq('id', entry.id)
      if (error) throw error
      await loadEntries(true)
    } catch (err: unknown) {
      await showAlert(`Gagal memperbarui status: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const isReviewer = userRole === 'konsultan' || userRole === 'admin'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm">Memuat data anomali...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-400" />
            Data Anomali Menunggu Review
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Data yang gagal validasi otomatis — perlu persetujuan sebelum tampil di dashboard
          </p>
        </div>
        <button onClick={() => loadEntries(true)} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Menunggu Review', count: stats.pending, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: <Clock className="h-5 w-5" /> },
          { label: 'Disetujui', count: stats.approved, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: <CheckCircle2 className="h-5 w-5" /> },
          { label: 'Ditolak', count: stats.rejected, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: <XCircle className="h-5 w-5" /> },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-5 border ${s.bg} ${s.border} flex items-center justify-between`}>
            <div>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.count}</p>
            </div>
            <div className={s.color}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
        <Filter className="h-4 w-4 text-slate-500" />
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Filter:</span>
        <div className="flex gap-2">
          {(['all', 'pending_review', 'approved', 'rejected'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>
              {s === 'all' ? 'Semua' : STATUS_CONFIG[s as AuditStatus].label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 rounded-2xl">
          <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mb-3" />
          <p className="text-sm font-semibold text-slate-400">
            {filterStatus === 'pending_review' ? 'Tidak ada anomali menunggu review' : 'Tidak ada data'}
          </p>
          <p className="text-xs text-slate-600 mt-1">Semua data PQCDSM lolos validasi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => {
            const sc = STATUS_CONFIG[entry.status]
            const isExpanded = expandedId === entry.id
            return (
              <div key={entry.id} className={`rounded-2xl border transition-all ${sc.bg} ${sc.border}`}>
                <div className="p-4 flex items-start gap-4">
                  <div className={`mt-0.5 flex-shrink-0 ${sc.color}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${sc.bg} ${sc.border} ${sc.color}`}>
                        {sc.icon}{sc.label}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 border border-slate-700 text-slate-400">
                        <Database className="h-3 w-3" />{RULE_LABELS[entry.validation_rule_failed] ?? entry.validation_rule_failed}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{entry.source_table}</span>
                    </div>
                    <p className="text-sm text-slate-200 font-medium leading-snug">{entry.error_detail}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      <span className="text-[11px] text-slate-500">Proyek: <span className="text-slate-400">{entry.project_title}</span></span>
                      <span className="text-[11px] text-slate-600">
                        {new Date(entry.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    {isReviewer && entry.status === 'pending_review' && (
                      <>
                        <button onClick={() => handleReview(entry, 'approved')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-600/30 hover:bg-emerald-600/40 text-emerald-400 text-xs font-bold transition-all">
                          Setujui
                        </button>
                        <button onClick={() => handleReview(entry, 'rejected')}
                          className="px-3 py-1.5 rounded-lg bg-rose-600/20 border border-rose-600/30 hover:bg-rose-600/40 text-rose-400 text-xs font-bold transition-all">
                          Tolak
                        </button>
                      </>
                    )}
                    <ChevronDown className={`h-4 w-4 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-800/50 pt-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-500 font-medium mb-1">Record ID</p>
                        <p className="font-mono text-slate-300 text-[11px] break-all">{entry.record_id}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-medium mb-1">Project ID</p>
                        <p className="font-mono text-slate-300 text-[11px] break-all">{entry.project_id ?? '—'}</p>
                      </div>
                      {entry.raw_value && (
                        <div className="col-span-2">
                          <p className="text-slate-500 font-medium mb-1">Raw Value</p>
                          <pre className="bg-slate-950/60 rounded-lg p-3 text-[11px] text-slate-300 overflow-x-auto border border-slate-800">
                            {JSON.stringify(entry.raw_value, null, 2)}
                          </pre>
                        </div>
                      )}
                      {entry.review_note && (
                        <div className="col-span-2">
                          <p className="text-slate-500 font-medium mb-1">Catatan Review</p>
                          <p className="text-slate-300 text-[11px]">{entry.review_note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
