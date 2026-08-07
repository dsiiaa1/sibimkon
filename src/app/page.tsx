'use client'

import React, { useRef, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { Zap } from 'lucide-react'

// Static components
import Hero from '@/components/landing/Hero'
import PainPointSelector from '@/components/landing/PainPointSelector'
import SocialProofCounters from '@/components/landing/SocialProofCounters'
import FinalCTA from '@/components/landing/FinalCTA'

// Dynamic (client-heavy, interactive)
const FrameworkExplorer = dynamic(() => import('@/components/landing/FrameworkExplorer'), { ssr: false })
const PQCDSMCalculator = dynamic(() => import('@/components/landing/PQCDSMCalculator'), { ssr: false })
const DashboardPreview = dynamic(() => import('@/components/landing/DashboardPreview'), { ssr: false })

export default function LandingPage() {
  const calculatorRef = useRef<HTMLElement | null>(null)
  const contactRef = useRef<HTMLDivElement | null>(null)
  const [heroLines, setHeroLines] = useState(5)

  // Ensure native smooth scrolling is applied to the document
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => {
      document.documentElement.style.scrollBehavior = 'auto'
    }
  }, [])

  const scrollToCalculator = () => {
    document.getElementById('kalkulator')?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToContact = () => {
    document.getElementById('kontak')?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollTo = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#080f1e] text-slate-100 font-sans selection:bg-teal-500/40 selection:text-white">

      {/* ══ NAVBAR ══ */}
      <nav className="sticky top-0 z-50 bg-[#0B1220]/95 backdrop-blur-md border-b border-[#1a2942]/80 shadow-[0_1px_20px_rgba(0,0,0,0.4)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18 py-3">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Image src="/sibimkonicon.png" alt="Smart Productive Logo" width={36} height={36} className="h-9 w-9 object-contain" />
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tight leading-tight text-white">SMART PRODUCTIVE</span>
                <span className="text-[9px] text-teal-400/70 tracking-[0.22em] font-bold uppercase">LinkPro®</span>
              </div>
            </div>

            {/* Nav links */}
            <div className="hidden md:flex items-center space-x-6">
              <a href="#masalah" onClick={scrollTo('masalah')} className="text-slate-400 hover:text-teal-300 transition-colors text-sm font-medium">Tantangan</a>
              <a href="#framework" onClick={scrollTo('framework')} className="text-slate-400 hover:text-teal-300 transition-colors text-sm font-medium">Framework</a>
              <a href="#kalkulator" onClick={scrollTo('kalkulator')} className="text-slate-400 hover:text-teal-300 transition-colors text-sm font-medium">Kalkulator</a>
              <a href="#bukti" onClick={scrollTo('bukti')} className="text-slate-400 hover:text-teal-300 transition-colors text-sm font-medium">Bukti</a>
              <a href="#preview" onClick={scrollTo('preview')} className="text-slate-400 hover:text-teal-300 transition-colors text-sm font-medium">Dashboard</a>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:flex text-slate-400 hover:text-white font-medium text-sm transition-colors">
                Masuk
              </Link>
              <button
                onClick={scrollToCalculator}
                className="hidden sm:flex items-center gap-1.5 border border-teal-400/40 text-teal-300 px-4 py-2 rounded-xl text-xs font-bold hover:bg-teal-400/10 hover:border-teal-400 transition-all"
              >
                <Zap className="w-3.5 h-3.5 text-teal-400" /> Hitung Potensi
              </button>
              <Link
                href="/login"
                className="bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-[0_0_15px_rgba(45,212,191,0.35)] transition-all hover:-translate-y-0.5"
              >
                Daftar Gratis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ══ SECTIONS ══ */}

      {/* A. Hero — Live Diagnostic + Stat Badge */}
      <Hero onScrollToCalculator={scrollToCalculator} onScrollToContact={scrollToContact} />

      {/* B. Pain Point Selector */}
      <PainPointSelector />

      {/* C. Framework PQCDSM Explorer */}
      <FrameworkExplorer />

      {/* C.1 PQCDSM Calculator */}
      <PQCDSMCalculator initialLines={heroLines} onScrollToContact={scrollToContact} />

      {/* D. Social Proof — Animated Counters + Case Studies */}
      <SocialProofCounters />

      {/* Filosofi / Pilar (dipertahankan) */}
      <PhilosophySection />

      {/* E. Dashboard Preview */}
      <DashboardPreview />

      {/* F. Final CTA */}
      <FinalCTA ctaRef={contactRef} />

      {/* Footer */}
      <Footer />
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Filosofi Section (dipertahankan dari versi lama, ringan)
// ──────────────────────────────────────────────────────────
function PhilosophySection() {
  return (
    <section id="filosofi" className="py-24 bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-bold text-amber-600 tracking-widest uppercase">Filosofi & Pilar</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-3">Empat Pilar Smart Productive LinkPro®</h2>
          <p className="text-slate-500 mt-4 max-w-xl mx-auto leading-relaxed">Dari strategi hingga keberlanjutan — satu ekosistem produktivitas yang terintegrasi.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            {
              num: '01', title: 'Productivity Consulting',
              items: ['Productivity Assessment', 'Business Diagnosis', 'Gap Analysis', 'Benchmarking', 'Strategy Development'],
              color: 'border-blue-400 bg-blue-50',
              accent: 'text-blue-600',
            },
            {
              num: '02', title: 'Productivity Improvement',
              items: ['Lean Manufacturing', 'Kaizen', 'Six Sigma', 'Total Productive Maintenance', 'Operational Excellence'],
              color: 'border-teal-400 bg-teal-50',
              accent: 'text-teal-700',
            },
            {
              num: '03', title: 'Smart Digital Platform',
              items: ['Executive Dashboard', 'KPI Management', 'AI Assistant', 'Business Intelligence', 'Mobile Monitoring'],
              color: 'border-emerald-400 bg-emerald-50',
              accent: 'text-emerald-700',
            },
            {
              num: '04', title: 'Sustainability',
              items: ['Productivity Monitoring', 'Coaching & Mentoring', 'Internal Audit', 'Continuous Improvement', 'Business Excellence'],
              color: 'border-amber-400 bg-amber-50',
              accent: 'text-amber-700',
            },
          ].map((p, i) => (
             <div key={i} className={`border-t-4 ${p.color} rounded-2xl p-6 hover:-translate-y-1 transition-all shadow-sm hover:shadow-md`}>
              <span className={`text-xs font-black tracking-widest ${p.accent} mb-3 block`}>{p.num}</span>
              <h3 className="text-base font-bold text-slate-900 mb-5 leading-tight">{p.title}</h3>
              <ul className="space-y-3">
                {p.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden max-w-4xl mx-auto">
          <div className="grid grid-cols-2 bg-[#0B1220]">
            <div className="p-6 text-center font-bold text-slate-400 border-r border-slate-700 text-sm uppercase tracking-wider">Konsultan Tradisional</div>
            <div className="p-6 text-center font-bold text-teal-400 text-sm uppercase tracking-wider">Smart Productive LinkPro®</div>
          </div>
          {[
            ['Memberikan rekomendasi', 'Memberikan roadmap implementasi terstruktur'],
            ['Audit sesaat', 'Monitoring real-time berkelanjutan'],
            ['Laporan statis', 'Dashboard interaktif 6 pilar PQCDSM'],
            ['Pelatihan terpisah', 'Pendampingan implementasi penuh'],
            ['Manual & spreadsheet', 'Digital + AI Assistant terintegrasi'],
            ['Fokus satu departemen', 'Integrasi seluruh perusahaan'],
          ].map((row, i) => (
            <div key={i} className="grid grid-cols-2 border-t border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="p-5 text-center text-slate-500 text-sm border-r border-slate-100">{row[0]}</div>
              <div className="p-5 text-center text-slate-900 font-bold text-sm">{row[1]}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────
// Footer
// ──────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-[#040810] text-white pt-16 pb-8 border-t border-[#1a2942]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-400 to-teal-300 mb-4">
            SMART PRODUCTIVE LINKPRO®
          </h2>
          <p className="text-sm md:text-lg font-bold tracking-widest text-slate-400 uppercase mb-4">
            One System. One Framework. Unlimited Productivity.
          </p>
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500/15 to-emerald-500/10 border border-teal-400/30 rounded-full px-6 py-2.5 mt-4">
            <Zap className="w-4 h-4 text-teal-300" />
            <span className="text-teal-300 font-bold text-sm">Efisiensi Cost Bisnis Hingga 90%</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-10 mb-16 text-sm text-slate-400 max-w-4xl mx-auto">
          <div>
            <p className="font-bold text-teal-400 mb-4 uppercase tracking-wider text-xs">Platform</p>
            <ul className="space-y-3">
              {['Productivity Assessment', 'KPI Management', 'Executive Dashboard', 'AI Assistant'].map(i => (
                <li key={i} className="hover:text-teal-300 cursor-default transition-colors">{i}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-bold text-teal-400 mb-4 uppercase tracking-wider text-xs">Framework</p>
            <ul className="space-y-3">
              {['PQCDSM Standards', 'Lean Manufacturing', 'Six Sigma', 'Continuous Improvement'].map(i => (
                <li key={i} className="hover:text-teal-300 cursor-default transition-colors">{i}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-bold text-teal-400 mb-4 uppercase tracking-wider text-xs">Perusahaan</p>
            <ul className="space-y-3">
              {['Tentang Kami', 'Studi Kasus', 'Blog', 'Karir'].map(i => (
                <li key={i} className="hover:text-teal-300 cursor-default transition-colors">{i}</li>
              ))}
            </ul>
          </div>
        </div>

        <blockquote className="text-center text-xl md:text-2xl font-serif italic text-slate-400 mb-16 border-y border-[#1a2942] py-10 max-w-3xl mx-auto">
           "Productivity is Not an Activity.
           <br />
           Productivity is a Culture."
        </blockquote>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600">
          <p>Building High Performance Industries Through Integrated Productivity Excellence.</p>
          <p>Smart Productive LinkPro® — Link Productive | © {new Date().getFullYear()} Link Productive</p>
        </div>
      </div>
    </footer>
  )
}
