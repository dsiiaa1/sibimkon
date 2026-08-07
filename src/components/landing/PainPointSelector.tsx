'use client'

import React, { useState } from 'react'
import { Settings, DollarSign, ClipboardList, Target, Truck, HardHat, TrendingUp } from 'lucide-react'

const PAIN_POINTS = [
  {
    id: 'downtime',
    label: 'Downtime mesin tinggi',
    icon: Settings,
    answer:
      'LinkPro memantau OEE (Overall Equipment Effectiveness) secara real-time di setiap lini. Ketika mesin mulai menunjukkan tanda-tanda penurunan performa, sistem memicu alert sebelum downtime terjadi — bukan laporan setelah kejadian.',
    stat: 'Rata-rata klien mengurangi downtime hingga 35% dalam 6 bulan pertama.',
    color: 'from-blue-500/20 to-blue-600/10 border-blue-400/40',
    iconBg: 'bg-blue-500/20 text-blue-300',
  },
  {
    id: 'cost',
    label: 'Biaya bahan baku bengkak',
    icon: DollarSign,
    answer:
      'Modul Cost di pilar PQCDSM melacak setiap komponen biaya produksi — material, energi, tenaga kerja, hingga waste — dan menampilkan drill-down biaya per lini, per produk, per shift. Pemborosan tersembunyi jadi terlihat dan bisa dipangkas.',
    stat: 'Rata-rata klien menekan biaya operasional 12–18% dalam 6 bulan pertama.',
    color: 'from-amber-500/20 to-amber-600/10 border-amber-400/40',
    iconBg: 'bg-amber-500/20 text-amber-300',
  },
  {
    id: 'report',
    label: 'Laporan manual & lambat',
    icon: ClipboardList,
    answer:
      'Dashboard LinkPro mengkonsolidasi data dari seluruh departemen secara otomatis — tidak ada lagi rekapan Excel mingguan atau menunggu laporan dari tiap kepala bagian. Direktur bisa melihat status operasional hari ini, bukan kondisi minggu lalu.',
    stat: 'Waktu penyusunan laporan berkurang rata-rata 80% setelah implementasi.',
    color: 'from-purple-500/20 to-purple-600/10 border-purple-400/40',
    iconBg: 'bg-purple-500/20 text-purple-300',
  },
  {
    id: 'quality',
    label: 'Kualitas tidak konsisten',
    icon: Target,
    answer:
      'Pilar Quality di PQCDSM mengukur defect rate, First Pass Yield, dan tren kualitas per batch. Ketika ada lonjakan defect, sistem langsung mengidentifikasi di lini mana, shift mana, dan mesin mana — sehingga akar masalah bisa ditangani, bukan hanya gejalanya.',
    stat: 'Klien rata-rata menurunkan tingkat defect 25–40% dalam kuartal pertama.',
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-400/40',
    iconBg: 'bg-emerald-500/20 text-emerald-300',
  },
  {
    id: 'delivery',
    label: 'Pengiriman sering terlambat',
    icon: Truck,
    answer:
      'LinkPro memantau On-Time Delivery rate dan mengintegrasikan data PPIC, produksi, dan warehouse. Keterlambatan produksi di hulu langsung terdeteksi sebelum berdampak ke jadwal pengiriman ke pelanggan.',
    stat: 'On-Time Delivery rate klien rata-rata naik 15–20 poin persentase.',
    color: 'from-indigo-500/20 to-indigo-600/10 border-indigo-400/40',
    iconBg: 'bg-indigo-500/20 text-indigo-300',
  },
  {
    id: 'safety',
    label: 'Insiden keselamatan berulang',
    icon: HardHat,
    answer:
      'Modul Safety mencatat dan menganalisis semua insiden, near-miss, dan kondisi tidak aman. Pola insiden yang berulang di area atau shift tertentu terdeteksi otomatis, sehingga intervensi bisa dilakukan sebelum terjadi kecelakaan serius.',
    stat: 'Rata-rata insiden kerja per bulan turun 50–80% setelah implementasi penuh.',
    color: 'from-rose-500/20 to-rose-600/10 border-rose-400/40',
    iconBg: 'bg-rose-500/20 text-rose-300',
  },
]

export default function PainPointSelector() {
  const [activeId, setActiveId] = useState<string | null>(null)

  const active = PAIN_POINTS.find(p => p.id === activeId)

  return (
    <section id="masalah" className="py-24 bg-[#0a1628] scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="text-xs font-bold tracking-[0.2em] text-teal-400 uppercase">
            Pain Points
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-3 mb-4">
            Pilih tantangan yang paling terasa
            <br />
            <span className="text-slate-400">di operasional Anda saat ini.</span>
          </h2>
          <p className="text-slate-500 text-sm">Klik salah satu untuk melihat bagaimana LinkPro menjawabnya.</p>
        </div>

        {/* Pain point cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {PAIN_POINTS.map(p => (
            <button
              key={p.id}
              id={`pain-point-${p.id}`}
              onClick={() => setActiveId(prev => (prev === p.id ? null : p.id))}
              className={`group relative flex items-center gap-4 px-5 py-4 rounded-2xl border text-left transition-all duration-200
                ${activeId === p.id
                  ? `bg-gradient-to-br ${p.color} scale-[1.02] shadow-lg`
                  : 'bg-[#121c2f] border-[#1e3055] hover:border-teal-400/40 hover:bg-[#162238]'
                }`}
            >
              <span className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${activeId === p.id ? p.iconBg : 'bg-[#1a2942] text-slate-400 group-hover:text-teal-300 group-hover:bg-[#1f2d45]'}`}>
                <p.icon className="w-6 h-6" />
              </span>
              <span className={`text-sm font-semibold leading-tight transition-colors ${activeId === p.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                {p.label}
              </span>
              {activeId === p.id && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Answer panel — muncul saat pain point dipilih */}
        <div
          className="overflow-hidden transition-all duration-400 ease-in-out"
          style={{
            maxHeight: active ? '400px' : '0',
            opacity: active ? 1 : 0,
          }}
        >
          {active && (
            <div className={`bg-gradient-to-br ${active.color} border rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 mt-2`}>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${active.iconBg}`}>
                <active.icon className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3">{active.label}</h3>
                <p className="text-slate-300 leading-relaxed text-sm mb-5">{active.answer}</p>
                <div className="flex items-center gap-3 bg-[#0B1220]/40 rounded-xl px-4 py-3 border border-white/10 w-fit">
                   <TrendingUp className="w-4 h-4 text-teal-400" />
                  <span className="text-teal-400 font-bold text-xs uppercase tracking-wider">Data Klien:</span>
                  <span className="text-teal-300 text-sm font-medium">{active.stat}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
