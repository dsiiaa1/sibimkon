'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getMockDB, Project, ActionPlan, Assessment } from '@/lib/mockData'
import { generateFinalReport, generateCertificate } from '@/lib/pdf-generator'
import { FileText, Award, ShieldCheck, Download, Edit3, CheckCircle2 } from 'lucide-react'

export default function ReportsPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  
  // Signature states
  const [consultantSigned, setConsultantSigned] = useState(false)
  const [disnakerSigned, setDisnakerSigned] = useState(false)
  const [kemnakerSigned, setKemnakerSigned] = useState(false)

  // PDF Loading simulation
  const [pdfLoading, setPdfLoading] = useState(false)
  const [certLoading, setCertLoading] = useState(false)

  useEffect(() => {
    const db = getMockDB()
    const proj = db.projects.find((p: Project) => p.id === projectId)
    if (!proj) {
      router.push('/dashboard')
      return
    }
    setProject(proj)
    setActionPlans(db.actionPlans[projectId] || [])
    setAssessments(db.assessments[projectId] || [])
  }, [projectId, router])

  const handleDownloadPDF = () => {
    if (!project) return
    setPdfLoading(true)
    try {
      const doc = generateFinalReport(project, assessments, actionPlans)
      doc.save(`Laporan_Akhir_${project.project_code}.pdf`)
    } catch (error) {
      console.error(error)
      alert('Gagal membuat PDF: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setPdfLoading(false)
    }
  }

  const handleDownloadCert = () => {
    if (!project) return
    setCertLoading(true)
    try {
      const doc = generateCertificate(project)
      doc.save(`E-Sertifikat_${project.company_name.replace(/\s+/g, '_')}.pdf`)
    } catch (error) {
      console.error(error)
      alert('Gagal membuat Sertifikat: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setCertLoading(false)
    }
  }

  if (!project) return null

  // Calculate stats
  const beforeScore = project.baseline_score || 50
  const afterScore = project.current_score || 75
  const improvement = afterScore - beforeScore
  
  // Calculate mock ROI/Savings
  const totalCostSaving = 25000000 * 3 // Rp 75,000,000 savings over 3 months
  const totalInvestment = actionPlans.reduce((acc, act) => acc + 2500000, 0) // Rp 2.5jt per action plan item

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 p-6 rounded-3xl border border-slate-800/80">
        <div>
          <span className="text-xs font-mono text-indigo-400">{project.project_code}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{project.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Modul Dokumen: Cetak Laporan, Sertifikat, dan Lembar Verifikasi Digital</p>
        </div>
      </div>

      {/* Grid: Reports and Sign-off */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Col: Final Report & E-Certificate (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Laporan Akhir */}
          <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 md:p-8 space-y-4">
            <h3 className="font-bold text-slate-200 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              Laporan Produktivitas Akhir
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Auto-generate dokumen laporan program BIMKON lengkap 7 Bab resmi sesuai format standar Kementrian Ketenagakerjaan RI. Mencakup Before vs After, Cost Saving, dan Indeks Sustainability.
            </p>

            <div className="grid grid-cols-3 gap-2 bg-slate-950 border border-slate-850 p-4 rounded-2xl">
              <div className="text-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Baseline</span>
                <span className="text-lg font-bold text-slate-400">{beforeScore}%</span>
              </div>
              <div className="text-center border-x border-slate-850">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Aktual</span>
                <span className="text-lg font-bold text-indigo-400">{afterScore}%</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Peningkatan</span>
                <span className="text-lg font-bold text-emerald-400">+{improvement}%</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-650 hover:bg-indigo-600 text-sm font-semibold rounded-xl text-white transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {pdfLoading ? 'Menyusun Laporan Akhir...' : 'Unduh Laporan Akhir (PDF)'}
              </button>
            </div>
          </div>

          {/* E-Certificate */}
          <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 md:p-8 space-y-4">
            <h3 className="font-bold text-slate-200 flex items-center gap-2">
              <Award className="h-5 w-5 text-cyan-400" />
              E-Sertifikat Peningkatan Produktivitas
            </h3>
            
            {/* Visual Certificate Mockup */}
            <div className="border border-amber-500/20 bg-gradient-to-tr from-slate-950 to-slate-900 p-6 rounded-2xl text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500">Sertifikat Penghargaan</span>
                <h4 className="text-sm font-extrabold text-slate-200 uppercase">{project.company_name}</h4>
                <p className="text-[10px] text-slate-400 leading-normal max-w-xs mx-auto">Telah menyelesaikan Program Bimbingan Konsultansi Peningkatan Produktivitas Kemnaker RI</p>
                <div className="flex justify-center pt-2">
                  <div className="h-12 w-12 bg-white p-1 rounded flex items-center justify-center">
                    {/* Simulated QR code */}
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[6px] text-white">QR</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleDownloadCert}
                disabled={certLoading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-sm font-semibold rounded-xl text-white transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {certLoading ? 'Membuat Sertifikat...' : 'Unduh E-Sertifikat (PDF)'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Sign-off & ROI (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* ROI Calculation */}
          <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 space-y-4">
            <h3 className="font-bold text-slate-200">Dampak Ekonomi & ROI</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-950 border border-slate-850 p-3 rounded-xl">
                <span className="text-xs text-slate-500">Estimasi Cost Saving</span>
                <span className="text-xs font-bold text-emerald-400">Rp {totalCostSaving.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950 border border-slate-850 p-3 rounded-xl">
                <span className="text-xs text-slate-500">Total Investasi Program</span>
                <span className="text-xs font-bold text-indigo-400">Rp {totalInvestment.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center bg-indigo-500/5 border border-indigo-500/10 p-3.5 rounded-xl">
                <span className="text-xs font-bold text-indigo-300">Estimasi ROI</span>
                <span className="text-xs font-bold text-white">{(totalCostSaving / (totalInvestment || 1)).toFixed(1)}x Lipat</span>
              </div>
            </div>
          </div>

          {/* Lembar Verifikasi Digital */}
          <div className="glass-card rounded-3xl border border-slate-800 bg-slate-950/20 p-6 space-y-4">
            <h3 className="font-bold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
              Tanda Tangan Digital
            </h3>
            <p className="text-xs text-slate-500 leading-normal">
              Lembar verifikasi digital untuk menyelesaikan dan melaporkan proyek BIMKON ini secara nasional.
            </p>

            <div className="space-y-4">
              {/* Consultant signature */}
              <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Konsultan Pendamping</span>
                  <span className="text-xs font-semibold text-slate-300 mt-1 block">Ahmad Consultant</span>
                </div>
                {consultantSigned ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Telah TTD
                  </span>
                ) : (
                  <button
                    onClick={() => setConsultantSigned(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-xs font-bold rounded-lg text-white cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Tanda Tangan
                  </button>
                )}
              </div>

              {/* Disnaker signature */}
              <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Verifikator Disnaker</span>
                  <span className="text-xs font-semibold text-slate-300 mt-1 block">Admin Disnaker Jabar</span>
                </div>
                {disnakerSigned ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Telah TTD
                  </span>
                ) : (
                  <button
                    onClick={() => setDisnakerSigned(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-xs font-bold rounded-lg text-white cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Tanda Tangan
                  </button>
                )}
              </div>

              {/* Kemnaker signature */}
              <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Verifikator Kemnaker</span>
                  <span className="text-xs font-semibold text-slate-300 mt-1 block">Direktorat Bina Produktivitas</span>
                </div>
                {kemnakerSigned ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Telah TTD
                  </span>
                ) : (
                  <button
                    onClick={() => setKemnakerSigned(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-xs font-bold rounded-lg text-white cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Tanda Tangan
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
