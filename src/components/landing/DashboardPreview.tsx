'use client'

import React, { useState } from 'react'
import { AlertTriangle, CheckCircle, Bot, Activity } from 'lucide-react'

const PILLARS = [
  { key: 'P', label: 'Productivity', value: 78, unit: '% OEE', color: '#3b82f6', trend: '+23%' },
  { key: 'Q', label: 'Quality', value: 96.8, unit: '% FPY', color: '#10b981', trend: '-65%' },
  { key: 'C', label: 'Cost', value: 'Rp 1,4M', unit: '/bulan', color: '#f59e0b', trend: '-31%' },
  { key: 'D', label: 'Delivery', value: 94, unit: '% OTD', color: '#6366f1', trend: '+26%' },
  { key: 'S', label: 'Safety', value: 0, unit: 'insiden', color: '#f43f5e', trend: '-100%' },
  { key: 'M', label: 'Morale', value: 4.2, unit: '% turnover', color: '#a855f7', trend: '-47%' },
]

const ALERTS = [
  { time: '09:14', type: 'warning', msg: 'Lini 3 — OEE turun ke 61%, threshold 65%', icon: AlertTriangle },
  { time: '09:22', type: 'info', msg: 'AI: Rekomendasi PM Mesin 3B dijadwalkan ulang', icon: Bot },
  { time: '10:05', type: 'success', msg: 'Lini 1 & 2 — Target produksi hari ini tercapai 100%', icon: CheckCircle },
]

export default function DashboardPreview() {
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts'>('overview')

  return (
    <section id="preview" className="py-24 bg-[#050810] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="text-xs font-bold tracking-[0.2em] text-teal-400 uppercase">
            Preview Dashboard
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-3 mb-4">
            Sebelum Daftar, Intip Dulu Seperti Apa Dashboard-nya
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
            Geser dan eksplorasi bagaimana enam pilar PQCDSM Anda akan terpantau dalam satu layar.
          </p>
        </div>

        {/* Mock dashboard */}
        <div className="rounded-2xl overflow-hidden border border-[#1e3055] shadow-2xl max-w-5xl mx-auto">
          {/* Browser chrome */}
          <div className="bg-[#0d1728] px-4 py-3 flex items-center gap-3 border-b border-[#1e3055]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex-1 bg-[#050810] rounded-lg px-3 py-1.5 text-xs text-slate-500 max-w-[280px] flex items-center gap-2 border border-[#1e3055]">
              <Activity className="w-3 h-3" /> app.smartproductive.id/dashboard
            </div>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${activeTab === 'overview' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1a2942]'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${activeTab === 'alerts' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1a2942]'}`}
              >
                Alerts (3)
              </button>
            </div>
          </div>

          {/* Dashboard content */}
          <div className="bg-[#050810] p-6 lg:p-8">
            {/* Top bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h3 className="text-white font-bold text-lg">PT. Industri Nusantara Makmur</h3>
                <p className="text-slate-500 text-xs mt-1">Update terakhir: 11:37 WIB — Real-time</p>
              </div>
              <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-xl px-4 py-2 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-teal-300 text-xs font-bold tracking-widest">LIVE</span>
              </div>
            </div>

            {activeTab === 'overview' ? (
              <>
                {/* PQCDSM cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                  {PILLARS.map(p => (
                    <div
                      key={p.key}
                      className="bg-[#0d1728] border border-[#1e3055] rounded-2xl p-4 hover:border-slate-500 transition-colors cursor-default group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white"
                          style={{ backgroundColor: p.color }}
                        >
                          {p.key}
                        </span>
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{ color: p.color, backgroundColor: `${p.color}15` }}
                        >
                          {p.trend}
                        </span>
                      </div>
                      <p className="text-2xl font-black text-white leading-none">{p.value}</p>
                      <div className="mt-2">
                         <p className="text-[11px] font-semibold text-slate-400">{p.label}</p>
                         <p className="text-[10px] text-slate-500">{p.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mini chart placeholder */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-[#0d1728] border border-[#1e3055] rounded-2xl p-6">
                    <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">Tren OEE — 6 Bulan</p>
                    <div className="flex items-end gap-3 h-24">
                      {[52, 55, 61, 65, 72, 78].map((v, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                          <div
                            className="w-full rounded-t-md transition-all"
                            style={{ height: `${(v / 80) * 100}%`, backgroundColor: '#3b82f6', opacity: 0.5 + (i * 0.1) }}
                          />
                          <span className="text-[9px] text-slate-500 font-medium">{v}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#0d1728] border border-[#1e3055] rounded-2xl p-6">
                    <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">Penghematan Kumulatif</p>
                    <div className="flex flex-col gap-4">
                      {[
                        { label: 'Bulan 1–3', value: 'Rp 3,2 M', pct: 35 },
                        { label: 'Bulan 4–6', value: 'Rp 5,8 M', pct: 63 },
                        { label: 'Bulan 7–9', value: 'Rp 9,0 M', pct: 100 },
                      ].map(r => (
                        <div key={r.label}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-slate-400">{r.label}</span>
                            <span className="text-teal-400 font-bold">{r.value}</span>
                          </div>
                          <div className="h-1.5 bg-[#1a2942] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" style={{ width: `${r.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {ALERTS.map((a, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-4 p-5 rounded-2xl border ${
                      a.type === 'warning' ? 'bg-amber-500/10 border-amber-400/20' :
                      a.type === 'success' ? 'bg-emerald-500/10 border-emerald-400/20' :
                      'bg-blue-500/10 border-blue-400/20'
                    }`}
                  >
                    <span className="flex-shrink-0 mt-0.5">
                      <a.icon className={`w-5 h-5 ${
                         a.type === 'warning' ? 'text-amber-400' :
                         a.type === 'success' ? 'text-emerald-400' : 'text-blue-400'
                      }`} />
                    </span>
                    <div>
                      <p className={`text-sm font-semibold mb-1 ${
                        a.type === 'warning' ? 'text-amber-300' :
                        a.type === 'success' ? 'text-emerald-300' :
                        'text-blue-300'
                      }`}>{a.msg}</p>
                      <p className="text-xs text-slate-500">{a.time} WIB</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Data disclaimer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          *Data di atas adalah ilustrasi dengan angka dummy — bukan data klien aktual.
        </p>
      </div>
    </section>
  )
}
