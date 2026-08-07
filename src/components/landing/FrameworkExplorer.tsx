'use client'

import React, { useState } from 'react'
import { BarChart3 } from 'lucide-react'

const PILLARS = [
  {
    key: 'P',
    label: 'Productivity',
    color: '#3b82f6',
    glowColor: 'rgba(59,130,246,0.4)',
    bgClass: 'from-blue-500/20 to-blue-600/10 border-blue-400/40',
    desc: 'Optimasi kapasitas produksi, OEE, dan output per lini — pastikan setiap jam mesin menghasilkan nilai maksimal.',
    metric: 'Rata-rata peningkatan OEE klien: +14–22 poin persentase dalam 6 bulan.',
    angle: 270, // top
  },
  {
    key: 'Q',
    label: 'Quality',
    color: '#10b981',
    glowColor: 'rgba(16,185,129,0.4)',
    bgClass: 'from-emerald-500/20 to-emerald-600/10 border-emerald-400/40',
    desc: 'Kendalikan defect rate dan First Pass Yield — kualitas yang konsisten bukan keberuntungan, melainkan sistem.',
    metric: 'Penurunan defect rate rata-rata 25–40% di kuartal pertama.',
    angle: 330, // top-right
  },
  {
    key: 'C',
    label: 'Cost',
    color: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.4)',
    bgClass: 'from-amber-500/20 to-amber-600/10 border-amber-400/40',
    desc: 'Lacak setiap rupiah biaya operasional — material, energi, tenaga kerja — dan identifikasi waste yang tersembunyi.',
    metric: 'Rata-rata klien menekan biaya operasional 12–18% dalam 6 bulan pertama.',
    angle: 30, // top-right (bottom side)
  },
  {
    key: 'D',
    label: 'Delivery',
    color: '#6366f1',
    glowColor: 'rgba(99,102,241,0.4)',
    bgClass: 'from-indigo-500/20 to-indigo-600/10 border-indigo-400/40',
    desc: 'Pantau On-Time Delivery rate dan integrasikan PPIC, produksi, dan warehouse dalam satu alur yang sinkron.',
    metric: 'On-Time Delivery rate naik rata-rata 15–20 poin persentase.',
    angle: 90, // bottom
  },
  {
    key: 'S',
    label: 'Safety',
    color: '#f43f5e',
    glowColor: 'rgba(244,63,94,0.4)',
    bgClass: 'from-rose-500/20 to-rose-600/10 border-rose-400/40',
    desc: 'Rekam insiden, near-miss, dan kondisi tidak aman — deteksi pola berbahaya sebelum menjadi kecelakaan serius.',
    metric: 'Insiden kerja per bulan turun 50–80% setelah implementasi penuh.',
    angle: 150, // bottom-left
  },
  {
    key: 'M',
    label: 'Morale',
    color: '#a855f7',
    glowColor: 'rgba(168,85,247,0.4)',
    bgClass: 'from-purple-500/20 to-purple-600/10 border-purple-400/40',
    desc: 'Ukur turnover, engagement, dan kompetensi SDM — bangun budaya produktivitas yang berkelanjutan dari dalam.',
    metric: 'Tingkat turnover karyawan turun rata-rata 30–50% setelah 12 bulan.',
    angle: 210, // bottom-left (top side)
  },
]

export default function FrameworkExplorer() {
  const [activeKey, setActiveKey] = useState<string | null>('P')

  const active = PILLARS.find(p => p.key === activeKey)
  const R = 150 // radius hex
  const CX = 220 // center X of SVG
  const CY = 220 // center Y of SVG

  return (
    <section id="framework" className="py-24 bg-slate-50 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-[0.2em] text-teal-600 uppercase">
            Framework PQCDSM
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-3 mb-4">
            Enam Pilar yang Bekerja Bersamaan,
            <br />
            <span className="text-slate-500">Bukan Sendiri-Sendiri</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Satu masalah kecil di lini produksi bisa merambat ke enam area sekaligus. LinkPro
            memantau keenamnya secara real-time — Anda tinggal lihat mana yang butuh perhatian dulu.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20">
          {/* Radial diagram */}
          <div className="flex-shrink-0 relative">
            <svg
              width="440"
              height="440"
              viewBox="0 0 440 440"
              className="drop-shadow-xl"
              role="img"
              aria-label="Diagram interaktif 6 pilar PQCDSM"
            >
              {/* Connection lines */}
              {PILLARS.map(p => {
                const rad = ((p.angle - 90) * Math.PI) / 180
                const nx = CX + Math.cos(rad) * R
                const ny = CY + Math.sin(rad) * R
                return (
                  <line
                    key={`line-${p.key}`}
                    x1={CX} y1={CY} x2={nx} y2={ny}
                    stroke={activeKey === p.key ? p.color : '#cbd5e1'}
                    strokeWidth={activeKey === p.key ? 2.5 : 1.5}
                    strokeDasharray={activeKey === p.key ? '' : '4 4'}
                    style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
                  />
                )
              })}

              {/* Center node */}
              <circle cx={CX} cy={CY} r={52} fill="#0f172a" stroke={active?.color ?? '#3dd9b0'} strokeWidth={3} />
              <text x={CX} y={CY - 8} textAnchor="middle" fill="white" fontSize={11} fontWeight="700" letterSpacing="1">SMART</text>
              <text x={CX} y={CY + 6} textAnchor="middle" fill="white" fontSize={11} fontWeight="700" letterSpacing="1">PRODUCTIVE</text>
              <text x={CX} y={CY + 20} textAnchor="middle" fill="#3dd9b0" fontSize={10} fontWeight="600" letterSpacing="1">LINKPRO®</text>

              {/* Pillar nodes */}
              {PILLARS.map(p => {
                const rad = ((p.angle - 90) * Math.PI) / 180
                const nx = CX + Math.cos(rad) * R
                const ny = CY + Math.sin(rad) * R
                const isActive = activeKey === p.key
                return (
                  <g key={p.key}>
                    {/* Glow */}
                    {isActive && (
                      <circle cx={nx} cy={ny} r={40} fill={p.glowColor} />
                    )}
                    <circle
                      cx={nx} cy={ny} r={34}
                      fill={isActive ? p.color : '#1e293b'}
                      stroke={isActive ? p.color : '#334155'}
                      strokeWidth={isActive ? 0 : 2}
                      style={{ transition: 'fill 0.3s, r 0.2s' }}
                    />
                    <text
                      x={nx} y={ny - 5}
                      textAnchor="middle"
                      fill="white"
                      fontSize={18}
                      fontWeight="900"
                      style={{ userSelect: 'none' }}
                    >
                      {p.key}
                    </text>
                    <text
                      x={nx} y={ny + 10}
                      textAnchor="middle"
                      fill={isActive ? 'rgba(255,255,255,0.9)' : '#94a3b8'}
                      fontSize={8}
                      fontWeight="600"
                      letterSpacing="0.5"
                      style={{ userSelect: 'none' }}
                    >
                      {p.label.toUpperCase()}
                    </text>
                    {/* Invisible click target */}
                    <circle
                      cx={nx} cy={ny} r={38}
                      fill="transparent"
                      className="cursor-pointer"
                      role="button"
                      aria-label={`Pilih pilar ${p.label}`}
                      tabIndex={0}
                      onClick={() => setActiveKey(prev => prev === p.key ? null : p.key)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setActiveKey(prev => prev === p.key ? null : p.key) }}
                    />
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Detail panel */}
          <div className="flex-1 max-w-lg min-h-[360px] flex flex-col justify-center">
            {active ? (
              <div
                key={active.key}
                className={`bg-gradient-to-br ${active.bgClass} border rounded-3xl p-8`}
                style={{ animation: 'fadeSlideIn 0.3s ease' }}
              >
                <div className="flex items-center gap-5 mb-6">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg flex-shrink-0"
                    style={{ backgroundColor: active.color }}
                  >
                    {active.key}
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-1">Pilar</p>
                    <h3 className="text-2xl font-bold text-slate-900">{active.label}</h3>
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed text-base mb-6">{active.desc}</p>
                <div className="bg-white/70 border border-white/80 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                  <BarChart3 className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-800 font-medium">{active.metric}</p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm">
                <p className="text-slate-400">Klik salah satu pilar PQCDSM untuk melihat detail dan data benchmark klien.</p>
              </div>
            )}

            {/* Keyboard navigation hint */}
            <div className="flex gap-2 mt-6 flex-wrap justify-center lg:justify-start">
              {PILLARS.map(p => (
                <button
                  key={p.key}
                  id={`framework-tab-${p.key}`}
                  onClick={() => setActiveKey(prev => prev === p.key ? null : p.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    activeKey === p.key
                      ? 'text-white border-transparent shadow-md'
                      : 'text-slate-500 bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                  style={activeKey === p.key ? { backgroundColor: p.color } : {}}
                >
                  {p.key} — {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
