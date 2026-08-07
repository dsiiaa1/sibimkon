'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Building2, TrendingDown, Clock, ArrowRight } from 'lucide-react'

interface CounterProps {
  target: number
  duration?: number
  format?: (v: number) => string
  prefix?: string
  suffix?: string
}

function AnimatedCounter({ target, duration = 2000, format, prefix = '', suffix = '' }: CounterProps) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()
          const tick = (now: number) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
            setValue(Math.round(eased * target))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  const display = format ? format(value) : value.toLocaleString('id-ID')
  return <span ref={ref}>{prefix}{display}{suffix}</span>
}

const CASE_STUDIES = [
  {
    company: 'Pabrik Manufaktur FMCG — Jawa Barat',
    industry: 'Fast Moving Consumer Goods',
    before: { oee: '52%', defect: '7.2%', cost: 'Rp 2,3 M/bulan', delivery: '68%' },
    after: { oee: '71%', defect: '2.8%', cost: 'Rp 1,7 M/bulan', delivery: '89%' },
    duration: '6 bulan',
    saving: 'Rp 3,6 M',
    highlight: '+19 poin OEE',
  },
  {
    company: 'Produsen Komponen Otomotif — Jawa Tengah',
    industry: 'Automotive Parts',
    before: { oee: '61%', defect: '4.5%', cost: 'Rp 5,1 M/bulan', delivery: '74%' },
    after: { oee: '78%', defect: '1.2%', cost: 'Rp 4,1 M/bulan', delivery: '94%' },
    duration: '9 bulan',
    saving: 'Rp 9,0 M',
    highlight: 'Defect turun 73%',
  },
  {
    company: 'Industri Pengolahan Makanan — Sumatera Utara',
    industry: 'Food Processing',
    before: { oee: '48%', defect: '9.1%', cost: 'Rp 1,8 M/bulan', delivery: '61%' },
    after: { oee: '66%', defect: '3.4%', cost: 'Rp 1,3 M/bulan', delivery: '85%' },
    duration: '6 bulan',
    saving: 'Rp 3,0 M',
    highlight: 'OTD naik 24 poin',
  },
]

export default function SocialProofCounters() {
  return (
    <section id="bukti" className="py-24 bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-[0.2em] text-teal-600 uppercase">Hasil Nyata</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-4 mb-3">
            Bukan Klaim. Ini Angka dari Klien Kami.
          </h2>
          <p className="text-slate-500 text-base max-w-2xl mx-auto">*Angka contoh — akan diganti data riil sebelum publish</p>
        </div>

        {/* Animated counters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-24">
          <div className="text-center bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100/60 rounded-3xl p-10 hover:shadow-lg transition-all">
            <Building2 className="w-10 h-10 text-teal-400 mx-auto mb-6" />
            <p className="text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-4">
              <AnimatedCounter target={187} suffix="+" />
            </p>
            <p className="text-lg font-bold text-slate-800">Pabrik</p>
            <p className="text-sm text-slate-500 mt-1">telah menggunakan platform kami</p>
          </div>
          <div className="text-center bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/60 rounded-3xl p-10 hover:shadow-lg transition-all">
            <TrendingDown className="w-10 h-10 text-amber-400 mx-auto mb-6" />
            <p className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500 mb-4 mt-2">
              <AnimatedCounter
                target={42}
                prefix="Rp "
                suffix=" M"
                duration={2500}
              />
            </p>
            <p className="text-lg font-bold text-slate-800 mt-2">Biaya Dipangkas</p>
            <p className="text-sm text-slate-500 mt-1">secara kolektif oleh seluruh klien</p>
          </div>
          <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/60 rounded-3xl p-10 hover:shadow-lg transition-all">
            <Clock className="w-10 h-10 text-blue-400 mx-auto mb-6" />
            <p className="text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
              <AnimatedCounter target={3} suffix=" mgg" duration={1200} />
            </p>
            <p className="text-lg font-bold text-slate-800">Waktu Implementasi</p>
            <p className="text-sm text-slate-500 mt-1">dari onboarding hingga aktif</p>
          </div>
        </div>

        {/* Case studies */}
        <h3 className="text-xl font-extrabold text-slate-800 mb-8 text-center uppercase tracking-widest">Studi Kasus Ringkas</h3>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {CASE_STUDIES.map((cs, idx) => (
            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden hover:shadow-xl transition-all group">
              {/* Header */}
              <div className="bg-[#0B1220] px-6 py-6 border-b-4 border-teal-500">
                <p className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-2">{cs.industry}</p>
                <p className="text-base font-bold text-white leading-tight min-h-[48px]">{cs.company}</p>
                <div className="flex items-center gap-3 mt-4 bg-white/5 rounded-lg p-2 w-fit">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-300">{cs.duration}</span>
                  <div className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="text-xs font-bold text-teal-400">{cs.highlight}</span>
                </div>
              </div>
              {/* Before / After */}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"/>Sebelum</p>
                    <div className="space-y-2 text-xs text-slate-500 font-medium">
                      <div className="flex justify-between"><span>OEE:</span> <span className="font-bold text-slate-700">{cs.before.oee}</span></div>
                      <div className="flex justify-between"><span>Defect:</span> <span className="font-bold text-slate-700">{cs.before.defect}</span></div>
                      <div className="flex justify-between"><span>Cost:</span> <span className="font-bold text-slate-700">{cs.before.cost}</span></div>
                      <div className="flex justify-between"><span>OTD:</span> <span className="font-bold text-slate-700">{cs.before.delivery}</span></div>
                    </div>
                  </div>
                  <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100 shadow-sm relative">
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-white rounded-full p-0.5 shadow-sm">
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </div>
                    <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-teal-400"/>Sesudah</p>
                    <div className="space-y-2 text-xs text-teal-700 font-medium">
                      <div className="flex justify-between"><span>OEE:</span> <span className="font-black">{cs.after.oee}</span></div>
                      <div className="flex justify-between"><span>Defect:</span> <span className="font-black">{cs.after.defect}</span></div>
                      <div className="flex justify-between"><span>Cost:</span> <span className="font-black">{cs.after.cost}</span></div>
                      <div className="flex justify-between"><span>OTD:</span> <span className="font-black">{cs.after.delivery}</span></div>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-200 rounded-2xl p-4 text-center">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Penghematan</p>
                  <p className="text-2xl font-black text-teal-700">{cs.saving}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
