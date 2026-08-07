'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Zap, ChevronRight, TrendingDown } from 'lucide-react'
import { estimateHeroSavings, formatRupiah } from '@/lib/pqcdsmFormulas'

interface HeroProps {
  onScrollToCalculator: () => void
  onScrollToContact: () => void
}

export default function Hero({ onScrollToCalculator, onScrollToContact }: HeroProps) {
  const [numberOfLines, setNumberOfLines] = useState(5)
  const [avgDowntime, setAvgDowntime] = useState(40)
  const [savings, setSavings] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setSavings(estimateHeroSavings(numberOfLines, avgDowntime))
  }, [numberOfLines, avgDowntime])

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section
      id="hero"
      className="relative bg-[#0B1220] text-white overflow-hidden"
      style={{ minHeight: 'calc(100vh - 64px)' }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/8 rounded-full blur-[120px] translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/6 rounded-full blur-[100px] -translate-x-1/4 translate-y-1/4" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center">

          {/* ── LEFT: Copy ── */}
          <div
            className="flex flex-col gap-7"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            {/* Label */}
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-[11px] font-bold tracking-[0.25em] text-teal-400/80 uppercase">
                Sistem Manajemen Produktivitas Terpadu
              </span>
            </div>

            {/* Stat badge */}
            <div className="inline-flex items-center gap-3 self-start bg-teal-500/10 border border-teal-400/30 rounded-2xl px-5 py-3">
              <Zap className="w-5 h-5 text-teal-300 flex-shrink-0" />
              <span className="text-lg font-black text-white">
                Efisiensi Cost Bisnis Kamu{' '}
                <span className="text-teal-300">Hingga 90%</span>
                <sup className="text-teal-400/60 text-xs font-normal ml-0.5">*</sup>
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl md:text-4xl xl:text-5xl font-extrabold leading-[1.18] tracking-tight">
              Berapa Banyak Efisiensi yang{' '}
              <span className="text-teal-300">Hilang</span>{' '}
              di Lini Produksi Anda —{' '}
              <span className="text-slate-400">Tanpa Anda Sadari?</span>
            </h1>

            {/* Sub-headline */}
            <p className="text-base text-slate-400 leading-relaxed max-w-lg">
              Smart Productive LinkPro® mengubah data operasional harian Anda menjadi keputusan
              yang lebih cepat, lebih murah, dan lebih akurat — dari lantai pabrik sampai ruang direksi.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                id="cta-diagnostik-hero"
                onClick={onScrollToContact}
                className="flex items-center gap-2 bg-teal-400 text-slate-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-teal-300 transition-colors shadow-lg shadow-teal-500/20"
              >
                Mulai Diagnostik Gratis
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                id="cta-demo-hero"
                onClick={onScrollToContact}
                className="flex items-center gap-2 border border-slate-600 text-slate-300 px-6 py-3 rounded-xl font-semibold text-sm hover:border-teal-400/50 hover:text-teal-300 transition-colors"
              >
                Jadwalkan Demo
              </button>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
              *Berdasarkan skenario optimal klien existing.{' '}
              <button onClick={onScrollToCalculator} className="text-teal-500 hover:text-teal-400 transition-colors underline underline-offset-2">
                Hitung potensi Anda →
              </button>
            </p>
          </div>

          {/* ── RIGHT: Widget kalkulator mini ── */}
          <div
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s',
            }}
          >
            <div className="bg-[#111827] rounded-2xl border border-[#1f2d45] p-6 shadow-2xl">
              {/* Widget header */}
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-[#1f2d45]">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                <h2 className="text-xs font-bold tracking-widest text-teal-400 uppercase">
                  Cek Potensi Penghematan Anda
                </h2>
              </div>

              {/* Slider: Jumlah lini */}
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="hero-lines" className="text-sm font-medium text-slate-300">
                    Jumlah Lini Produksi
                  </label>
                  <span className="text-sm font-bold text-teal-300 bg-teal-500/10 px-2.5 py-0.5 rounded-lg">
                    {numberOfLines}
                  </span>
                </div>
                <input
                  id="hero-lines"
                  type="range" min={1} max={50} step={1}
                  value={numberOfLines}
                  onChange={e => setNumberOfLines(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[#1f2d45]"
                  style={{ accentColor: '#2dd4bf' }}
                />
                <div className="flex justify-between text-[11px] text-slate-600 mt-1.5">
                  <span>1 lini</span><span>50 lini</span>
                </div>
              </div>

              {/* Slider: Downtime */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="hero-downtime" className="text-sm font-medium text-slate-300">
                    Rata-rata Downtime / Bulan
                  </label>
                  <span className="text-sm font-bold text-teal-300 bg-teal-500/10 px-2.5 py-0.5 rounded-lg">
                    {avgDowntime} jam
                  </span>
                </div>
                <input
                  id="hero-downtime"
                  type="range" min={0} max={300} step={5}
                  value={avgDowntime}
                  onChange={e => setAvgDowntime(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[#1f2d45]"
                  style={{ accentColor: '#2dd4bf' }}
                />
                <div className="flex justify-between text-[11px] text-slate-600 mt-1.5">
                  <span>0 jam</span><span>300 jam</span>
                </div>
              </div>

              {/* Output */}
              <div className="bg-[#0d1728] border border-teal-500/20 rounded-xl p-4 mb-4">
                <p className="text-xs text-slate-500 mb-1">Estimasi Penghematan per Bulan</p>
                <div className="flex items-baseline gap-2">
                  <TrendingDown className="w-4 h-4 text-teal-400" />
                  <span className="text-2xl font-black text-teal-300">
                    {formatRupiah(savings)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">*Rata-rata penurunan downtime 45%</p>
              </div>

              {/* CTA ke kalkulator lengkap */}
              <button
                id="cta-calculator-hero-widget"
                onClick={onScrollToCalculator}
                className="w-full flex items-center justify-center gap-2 border border-[#1f2d45] text-slate-400 py-2.5 rounded-xl text-sm font-medium hover:border-teal-400/40 hover:text-teal-300 transition-colors"
              >
                Lihat Perhitungan Lengkap (6 Pilar PQCDSM)
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
