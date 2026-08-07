'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useDialog } from '@/hooks/useDialog'
import { Microscope, Calendar, CheckCircle, Mail, ArrowRight } from 'lucide-react'

interface FinalCTAProps {
  ctaRef?: React.RefObject<HTMLDivElement | null>
}

export default function FinalCTA({ ctaRef }: FinalCTAProps) {
  const { showAlert } = useDialog()
  const [formState, setFormState] = useState({
    name: '', email: '', company: '', message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formState.name || !formState.email || !formState.message) {
      await showAlert('Harap isi Nama, Email, dan Pesan Anda.', 'Input Tidak Lengkap')
      return
    }
    setIsSubmitting(true)
    await new Promise(r => setTimeout(r, 1000))
    setIsSubmitting(false)
    setSubmitted(true)
    setFormState({ name: '', email: '', company: '', message: '' })
  }

  return (
    <section id="kontak" className="py-24 bg-gradient-to-br from-[#080f1e] via-[#0B1220] to-[#0d1728] text-white relative overflow-hidden scroll-mt-10">
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-teal-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-[0.2em] text-teal-400 uppercase">Mulai Sekarang</span>
          <h2 className="text-3xl md:text-5xl font-extrabold mt-4 mb-6 leading-tight">
            Mulai dari Mana Saja —
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-400">
              Kami Sesuaikan dengan Kesiapan Anda
            </span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed text-lg">
            Tidak perlu komitmen besar di awal. Mulai dengan diagnostik gratis 5 menit, atau langsung
            jadwalkan demo dengan tim kami — kami yang menyesuaikan dengan kondisi dan kesiapan perusahaan Anda.
          </p>
        </div>

        {/* CTA cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-20" ref={ctaRef}>
          {/* Opsi 1 — Diagnostik */}
          <div className="bg-gradient-to-br from-teal-500/10 to-emerald-500/5 border border-teal-500/30 rounded-3xl p-8 md:p-10 hover:border-teal-400/60 transition-all flex flex-col h-full">
            <div className="w-14 h-14 bg-teal-500/20 text-teal-300 rounded-2xl flex items-center justify-center mb-6">
              <Microscope className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Mulai Diagnostik Gratis</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-1">
              Jawab 15 pertanyaan tentang kondisi operasional Anda. Dalam 5 menit, dapatkan laporan
              diagnostik produktivitas PQCDSM beserta area prioritas yang perlu dibenahi.
            </p>
            <div className="flex items-center gap-3 mb-8 bg-[#050810]/40 p-3 rounded-xl border border-white/5">
              <CheckCircle className="w-4 h-4 text-teal-400" />
              <span className="text-sm font-medium text-slate-300">100% gratis, tanpa perlu demo</span>
            </div>
            <Link
              id="cta-diagnostik-final"
              href="/login"
              className="w-full flex items-center justify-center gap-2 bg-teal-400 text-slate-900 px-6 py-4 rounded-xl font-bold text-sm hover:bg-teal-300 transition-all shadow-lg shadow-teal-500/20"
            >
              Mulai Diagnostik (5 menit) <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Opsi 2 — Demo */}
          <div className="bg-gradient-to-br from-[#121c2f] to-[#0a101d] border border-[#1e3055] rounded-3xl p-8 md:p-10 hover:border-slate-500 transition-all flex flex-col h-full">
            <div className="w-14 h-14 bg-[#1a2942] text-slate-300 rounded-2xl flex items-center justify-center mb-6">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Jadwalkan Demo dengan Tim</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-1">
              Lebih suka berbicara langsung dengan tim kami? Jadwalkan demo 30 menit — kami akan
              tunjukkan bagaimana LinkPro bekerja untuk industri dan skala bisnis Anda.
            </p>
            <div className="flex items-center gap-3 mb-8 bg-[#050810]/40 p-3 rounded-xl border border-white/5">
              <CheckCircle className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Demo 30 menit, jadwal fleksibel</span>
            </div>
            <button
              id="cta-demo-final"
              onClick={() => document.getElementById('form-kontak')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full flex items-center justify-center gap-2 border border-[#2a3f63] text-slate-300 px-6 py-4 rounded-xl font-bold text-sm hover:bg-[#1a2942] hover:text-white transition-all"
            >
              Hubungi Tim Kami <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div id="form-kontak" className="bg-[#0d1728] border border-[#1e3055] rounded-3xl p-8 md:p-12 max-w-3xl mx-auto shadow-2xl scroll-mt-24">
          {submitted ? (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-teal-500/20 text-teal-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Pesan Terkirim!</h3>
              <p className="text-slate-400 text-base">Tim kami akan menghubungi Anda dalam 1×24 jam kerja.</p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-8 text-teal-400 text-sm underline underline-offset-4 hover:text-teal-300"
              >
                Kirim pesan lain
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                <Mail className="text-teal-400 w-6 h-6" /> Hubungi Kami
              </h3>
              <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Nama Lengkap *</label>
                    <input
                      type="text"
                      id="contact-name"
                      value={formState.name}
                      onChange={e => setFormState({ ...formState, name: e.target.value })}
                      className="w-full bg-[#050810] border border-[#1e3055] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Email Profesional *</label>
                    <input
                      type="email"
                      id="contact-email"
                      value={formState.email}
                      onChange={e => setFormState({ ...formState, email: e.target.value })}
                      className="w-full bg-[#050810] border border-[#1e3055] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Nama Perusahaan</label>
                  <input
                    type="text"
                    id="contact-company"
                    value={formState.company}
                    onChange={e => setFormState({ ...formState, company: e.target.value })}
                    className="w-full bg-[#050810] border border-[#1e3055] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                    placeholder="PT. Inovasi Industri"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Pesan / Kebutuhan *</label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    value={formState.message}
                    onChange={e => setFormState({ ...formState, message: e.target.value })}
                    className="w-full bg-[#050810] border border-[#1e3055] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all resize-none"
                    placeholder="Jelaskan tantangan produktivitas perusahaan Anda — atau tempel hasil kalkulasi PQCDSM Anda di sini..."
                  />
                </div>
                <button
                  type="submit"
                  id="submit-contact"
                  disabled={isSubmitting}
                  className="w-full bg-teal-400 text-slate-900 px-6 py-4 rounded-xl font-bold text-sm hover:bg-teal-300 transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Mengirim...' : 'Kirim & Jadwalkan Assessment'} <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
