'use client'

import React from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const scrollToContact = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const element = document.getElementById('kontak')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-[#3dd9b0] selection:text-white">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-[#0B1220] border-b border-[#1a2942] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <img src="/sibimkonicon.png" alt="Smart Productive Logo" className="h-10 w-10 object-contain" style={{ width: '40px', height: '40px' }} />
              <div className="flex flex-col">
                <span className="font-bold text-xl tracking-tight leading-tight">SMART PRODUCTIVE</span>
                <span className="text-[10px] text-slate-400 tracking-[0.2em] font-medium uppercase">Link Productive</span>
              </div>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#tentang" className="text-slate-300 hover:text-[#d4a017] transition-colors text-sm font-medium">Tentang</a>
              <a href="#filosofi" className="text-slate-300 hover:text-[#d4a017] transition-colors text-sm font-medium">Filosofi</a>
              <a href="#framework" className="text-slate-300 hover:text-[#d4a017] transition-colors text-sm font-medium">Framework</a>
              <a href="#pqcdsm" className="text-slate-300 hover:text-[#d4a017] transition-colors text-sm font-medium">PQCDSM</a>
              <a href="#pilar" className="text-slate-300 hover:text-[#d4a017] transition-colors text-sm font-medium">Pilar</a>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="hidden sm:flex text-slate-300 hover:text-white font-medium text-sm transition-colors">
                Masuk
              </Link>
              <Link href="/login" className="bg-gradient-to-r from-[#d4af37] to-[#aa821c] text-[#0B1220] px-5 py-2.5 rounded-lg font-bold text-sm hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all transform hover:-translate-y-0.5">
                Daftar Sekarang
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 4.1 HERO SECTION */}
      <section className="relative bg-[#0B1220] text-white pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-[#1a2942] to-transparent rounded-full blur-[100px] opacity-50 transform translate-x-1/3 -translate-y-1/4"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#3dd9b0]/10 to-transparent rounded-full blur-[80px] opacity-60 transform -translate-x-1/4 translate-y-1/4"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a2942] border border-[#2a3f63] mb-8">
            <span className="w-2 h-2 rounded-full bg-[#3dd9b0] animate-pulse"></span>
            <span className="text-xs font-bold tracking-widest text-[#3dd9b0] uppercase">ENTERPRISE PRODUCTIVITY MANAGEMENT</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight max-w-4xl mx-auto">
            Transformasikan Produktivitas Industri dari Strategi hingga Operasional
          </h1>
          <h2 className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto font-light">
            Tingkatkan Produktivitas Industri dengan <span className="text-[#d4af37] font-semibold">Smart Productive LinkPro®</span>
          </h2>
          <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Solusi terintegrasi untuk meningkatkan kinerja produksi, menurunkan biaya, menghilangkan pemborosan, mempercepat proses bisnis, dan mendorong profitabilitas perusahaan.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <a href="#kontak" onClick={scrollToContact} className="w-full sm:w-auto bg-[#3dd9b0] text-[#0B1220] px-8 py-4 rounded-xl font-bold hover:bg-[#2bb394] hover:shadow-[0_0_20px_rgba(61,217,176,0.3)] transition-all transform hover:-translate-y-1">
              Jadwalkan Productivity Assessment
            </a>
            <a href="#kontak" onClick={scrollToContact} className="w-full sm:w-auto bg-transparent border-2 border-[#d4af37] text-[#d4af37] px-8 py-4 rounded-xl font-bold hover:bg-[#d4af37]/10 transition-all">
              Request Demo SPLP®
            </a>
            <a href="#kontak" onClick={scrollToContact} className="w-full sm:w-auto text-slate-300 hover:text-white underline-offset-4 hover:underline px-6 py-4 font-medium transition-all">
              Konsultasi Gratis
            </a>
          </div>
        </div>
      </section>

      {/* 4.2 APA ITU SPLP */}
      <section id="tentang" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-sm font-bold text-[#d4af37] tracking-widest uppercase mb-4">Tentang Platform</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8">Apa itu Smart Productive LinkPro®?</h3>
          <div className="prose prose-lg text-slate-600 mx-auto leading-relaxed">
            <p className="mb-6">
              <strong>Smart Productive LinkPro® (SPLP)</strong> adalah <strong>Enterprise Productivity Management System</strong> yang dirancang untuk membantu perusahaan meningkatkan produktivitas secara menyeluruh melalui integrasi <strong>People, Process, Technology, Data,</strong> dan <strong>Continuous Improvement</strong>.
            </p>
            <p>
              SPLP tidak hanya memberikan rekomendasi, tetapi juga menyediakan <strong>framework, metode, dashboard, KPI, AI,</strong> dan <strong>sistem monitoring</strong> agar peningkatan produktivitas dapat diukur, dijalankan, dan dipertahankan secara berkelanjutan.
            </p>
          </div>
        </div>
      </section>

      {/* 4.3 FILOSOFI */}
      <section id="filosofi" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-[#d4af37] tracking-widest uppercase mb-4">Core Values</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900">Filosofi Kami</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* SMART */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-[#0B1220] rounded-xl flex items-center justify-center text-white font-bold text-2xl mb-6 shadow-lg shadow-[#0B1220]/20">S</div>
              <h4 className="text-2xl font-bold text-slate-900 mb-6">SMART</h4>
              <ul className="space-y-4">
                <li className="flex items-start"><span className="text-[#3dd9b0] font-bold mr-3">S</span><div><span className="font-semibold text-slate-800">Sustainable</span> <span className="text-slate-500">(Berkelanjutan)</span></div></li>
                <li className="flex items-start"><span className="text-[#3dd9b0] font-bold mr-3">M</span><div><span className="font-semibold text-slate-800">Measurable</span> <span className="text-slate-500">(Terukur)</span></div></li>
                <li className="flex items-start"><span className="text-[#3dd9b0] font-bold mr-3">A</span><div><span className="font-semibold text-slate-800">Agile</span> <span className="text-slate-500">(Adaptif)</span></div></li>
                <li className="flex items-start"><span className="text-[#3dd9b0] font-bold mr-3">R</span><div><span className="font-semibold text-slate-800">Reliable</span> <span className="text-slate-500">(Andal)</span></div></li>
                <li className="flex items-start"><span className="text-[#3dd9b0] font-bold mr-3">T</span><div><span className="font-semibold text-slate-800">Transformative</span> <span className="text-slate-500">(Mendorong Transformasi)</span></div></li>
              </ul>
            </div>
            
            {/* PRODUCTIVE */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-[#0B1220] rounded-xl flex items-center justify-center text-white font-bold text-2xl mb-6 shadow-lg shadow-[#0B1220]/20">P</div>
              <h4 className="text-2xl font-bold text-slate-900 mb-4">PRODUCTIVE</h4>
              <p className="text-slate-500 mb-6 text-sm">Meningkatkan nilai tambah melalui:</p>
              <ul className="space-y-4 text-slate-700">
                <li className="flex items-center"><div className="w-2 h-2 bg-[#d4af37] rounded-full mr-3"></div> Efisiensi</li>
                <li className="flex items-center"><div className="w-2 h-2 bg-[#d4af37] rounded-full mr-3"></div> Efektivitas</li>
                <li className="flex items-center"><div className="w-2 h-2 bg-[#d4af37] rounded-full mr-3"></div> Inovasi</li>
                <li className="flex items-center"><div className="w-2 h-2 bg-[#d4af37] rounded-full mr-3"></div> Digitalisasi</li>
                <li className="flex items-center"><div className="w-2 h-2 bg-[#d4af37] rounded-full mr-3"></div> Continuous Improvement</li>
              </ul>
            </div>
            
            {/* LINKPRO */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-[#0B1220] rounded-xl flex items-center justify-center text-white font-bold text-2xl mb-6 shadow-lg shadow-[#0B1220]/20">L</div>
              <h4 className="text-2xl font-bold text-slate-900 mb-4">LINKPRO</h4>
              <p className="text-slate-500 mb-6 text-sm leading-relaxed">Menghubungkan seluruh proses bisnis menjadi satu ekosistem produktivitas.</p>
              <div className="space-y-6">
                <div>
                  <h5 className="font-bold text-slate-800 flex items-center"><span className="text-[#3dd9b0] mr-2">LINK</span></h5>
                  <p className="text-slate-600 mt-2 text-sm leading-relaxed">Menghubungkan: Strategy, People, Process, Technology, Data</p>
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 flex items-center"><span className="text-[#3dd9b0] mr-2">PRO</span></h5>
                  <p className="text-slate-600 mt-2 text-sm">Professional Productivity Optimization</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4.4 FRAMEWORK */}
      <section id="framework" className="py-24 bg-[#0B1220] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-[#3dd9b0] tracking-widest uppercase mb-4">Methodology</h2>
            <h3 className="text-3xl md:text-4xl font-bold mb-6">Smart Productive LinkPro Framework®</h3>
            <p className="text-slate-400 max-w-2xl mx-auto">Pendekatan 11 tahap terstruktur untuk mencapai keunggulan operasional.</p>
          </div>
          
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-[27px] md:left-1/2 top-4 bottom-4 w-1 bg-gradient-to-b from-[#1a2942] via-[#2a3f63] to-[#1a2942] -translate-x-1/2"></div>
            
            <div className="space-y-8">
              {[
                "Business Strategy", "Enterprise Assessment", "Business Process Mapping", 
                "Productivity Measurement", "Waste Identification", "PQCDSM Performance",
                "Digital Transformation", "Artificial Intelligence", "Performance Dashboard",
                "Continuous Improvement", "Business Excellence"
              ].map((step, index) => (
                <div key={index} className={`relative flex items-center gap-6 ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                  <div className="hidden md:block md:w-1/2"></div>
                  
                  {/* Step Dot */}
                  <div className="absolute left-0 md:left-1/2 z-10 w-14 h-14 rounded-full bg-[#0B1220] border-4 border-[#3dd9b0] text-[#3dd9b0] font-bold text-xl flex items-center justify-center -translate-x-1/2 shadow-[0_0_15px_rgba(61,217,176,0.3)]">
                    {index + 1}
                  </div>
                  
                  {/* Content Card */}
                  <div className="ml-16 md:ml-0 md:w-1/2 flex justify-start">
                    <div className={`bg-[#121c2f] p-6 rounded-2xl border border-[#1e2f4a] hover:border-[#3dd9b0]/50 transition-colors shadow-lg w-full max-w-md ${index % 2 === 0 ? 'md:mr-10' : 'md:ml-10'}`}>
                      <h4 className="text-lg font-semibold text-white">{step}</h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4.5 WHEEL - MENINGKATKAN SELURUH AREA BISNIS */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Meningkatkan Seluruh Area Bisnis</h3>
          </div>
          
          <div className="flex justify-center items-center py-12 relative min-h-[500px]">
            {/* Center Node */}
            <div className="absolute z-20 w-48 h-48 bg-[#0B1220] rounded-full flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(11,18,32,0.3)] border-4 border-[#d4af37]">
              <span className="text-[#d4af37] font-extrabold text-xl leading-tight px-4">SMART<br/>PRODUCTIVE<br/>LINKPRO®</span>
            </div>
            
            {/* Surrounding Nodes (Grid fallback for responsiveness) */}
            <div className="hidden md:block absolute inset-0 z-10">
               {/* Pure CSS circular positioning is tricky without fixed sizing, we'll use a responsive grid representation for better reliability across devices, while styled circularly on desktop */}
               <div className="relative w-full h-full max-w-3xl mx-auto">
                 {[
                   {name: 'Marketing', deg: 0}, {name: 'Purchasing', deg: 25}, {name: 'PPIC', deg: 51}, 
                   {name: 'Production', deg: 77}, {name: 'Quality Control', deg: 102}, {name: 'Warehouse', deg: 128},
                   {name: 'Distribution', deg: 154}, {name: 'Human Resources', deg: 180}, {name: 'Finance', deg: 205},
                   {name: 'Maintenance', deg: 231}, {name: 'Quality Assurance', deg: 257}, {name: 'HSE', deg: 282},
                   {name: 'R&D', deg: 308}, {name: 'IT', deg: 334}
                 ].map((dept, i) => {
                   const rad = (dept.deg - 90) * (Math.PI / 180);
                   const radius = 280;
                   const x = Math.cos(rad) * radius;
                   const y = Math.sin(rad) * radius;
                   return (
                     <div key={i} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110" style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}>
                       <div className="bg-white px-4 py-2 rounded-lg shadow-md border border-slate-200 text-sm font-semibold text-slate-700 whitespace-nowrap">
                         {dept.name}
                       </div>
                       <svg className="absolute left-1/2 top-1/2 w-full h-full -z-10 text-slate-200 pointer-events-none" style={{ overflow: 'visible' }}>
                          <line x1="0" y1="0" x2={-x} y2={-y} stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                       </svg>
                     </div>
                   );
                 })}
               </div>
            </div>
            
            {/* Mobile Fallback */}
            <div className="md:hidden w-full max-w-md mx-auto grid grid-cols-2 gap-3 mt-48 z-10">
              {['Marketing', 'Purchasing', 'PPIC', 'Production', 'QC', 'Warehouse', 'Distribution', 'HR', 'Finance', 'Maintenance', 'QA', 'HSE', 'R&D', 'IT'].map((d, i) => (
                <div key={i} className="bg-slate-50 text-center py-2 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700">{d}</div>
              ))}
            </div>
          </div>
          
          <div className="mt-16 text-center max-w-3xl mx-auto bg-slate-50 p-8 rounded-2xl border border-slate-100">
            <p className="text-2xl font-serif italic text-slate-800">
              "Satu Platform. Satu Framework. Seluruh Departemen Bergerak Menuju Produktivitas yang Sama."
            </p>
          </div>
        </div>
      </section>

      {/* 4.6 PQCDSM STANDARDS */}
      <section id="pqcdsm" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-sm font-bold text-[#d4af37] tracking-widest uppercase mb-4">Measurement</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Smart Productive LinkPro® Menggunakan Standar PQCDSM</h3>
            <p className="text-lg text-slate-600">
              Standar PQCDSM merupakan inti dari pengelolaan produktivitas perusahaan. Seluruh aktivitas bisnis diukur, dianalisis, dan ditingkatkan berdasarkan enam indikator utama berikut.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { l: 'P', color: 'bg-blue-100 text-blue-700 border-blue-200', title: 'Production', desc: 'Mengoptimalkan kapasitas produksi, meningkatkan output, mengurangi downtime, serta memaksimalkan Overall Equipment Effectiveness (OEE).' },
              { l: 'Q', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', title: 'Quality', desc: 'Menjamin kualitas produk melalui pengurangan defect, peningkatan First Pass Yield (FPY), pengendalian proses, dan penerapan Quality Management System.' },
              { l: 'C', color: 'bg-amber-100 text-amber-700 border-amber-200', title: 'Cost', desc: 'Mengendalikan biaya operasional dengan mengurangi pemborosan (Waste), meningkatkan efisiensi penggunaan material, energi, tenaga kerja, dan aset.' },
              { l: 'D', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', title: 'Delivery', desc: 'Memastikan ketepatan jadwal produksi dan pengiriman sehingga meningkatkan kepuasan pelanggan melalui On-Time Delivery (OTD).' },
              { l: 'S', color: 'bg-rose-100 text-rose-700 border-rose-200', title: 'Safety', desc: 'Menciptakan lingkungan kerja yang aman, sehat, bebas kecelakaan kerja, serta mendukung budaya keselamatan di seluruh organisasi.' },
              { l: 'M', color: 'bg-purple-100 text-purple-700 border-purple-200', title: 'Morale', desc: 'Membangun SDM yang kompeten, produktif, disiplin, inovatif, serta memiliki engagement tinggi terhadap perusahaan.' },
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mb-6 border-4 ${item.color}`}>
                  {item.l}
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-4">{item.title}</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4.7 4 PILAR */}
      <section id="pilar" className="py-24 bg-[#0B1220] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-6">Empat Pilar Smart Productive LinkPro®</h3>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "1. Productivity Consulting",
                items: ["Productivity Assessment", "Business Diagnosis", "Gap Analysis", "Benchmarking", "Business Strategy Development"]
              },
              {
                title: "2. Productivity Improvement",
                items: ["Lean Manufacturing", "Kaizen", "Six Sigma", "Total Productive Maintenance (TPM)", "Business Process Improvement", "Standardization", "Operational Excellence"]
              },
              {
                title: "3. Smart Digital Platform",
                items: ["Executive Dashboard", "ERP Integration", "HRIS", "KPI Management", "Digital Workflow", "AI Assistant", "Business Intelligence", "Analytics", "Mobile Monitoring"]
              },
              {
                title: "4. Sustainability",
                items: ["Productivity Monitoring", "Coaching & Mentoring", "Internal Audit", "Continuous Improvement", "Business Excellence", "Performance Review"]
              }
            ].map((pillar, idx) => (
              <div key={idx} className="bg-[#121c2f] p-8 rounded-2xl border-t-4 border-[#3dd9b0] hover:bg-[#162238] transition-colors">
                <h4 className="text-lg font-bold text-[#d4af37] mb-6 min-h-[56px]">{pillar.title}</h4>
                <ul className="space-y-3">
                  {pillar.items.map((item, i) => (
                    <li key={i} className="flex items-start text-sm text-slate-300">
                      <svg className="w-4 h-4 text-[#3dd9b0] mt-1 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4.8 ECOSYSTEM */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-16">Smart Productive LinkPro® Ecosystem</h3>
          
          <div className="flex justify-center flex-wrap gap-4 max-w-4xl mx-auto">
            {['Productivity Assessment', 'Productivity Index', 'KPI Management', 'SOP Management', 'Digital Workflow', 'AI Assistant', 'Business Intelligence', 'Executive Dashboard', 'Performance Management', 'Continuous Improvement', 'Enterprise Risk Management', 'Knowledge Management'].map((item, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 text-slate-700 px-6 py-3 rounded-full font-medium shadow-sm hover:border-[#3dd9b0] transition-colors cursor-default">
                {item}
              </div>
            ))}
          </div>
          
          <p className="mt-12 text-slate-500 italic">
            Visual ini menjadi identitas utama platform Smart Productive LinkPro® sebagai Enterprise Productivity Ecosystem.
          </p>
        </div>
      </section>

      {/* 4.9 PERBANDINGAN */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900">Mengapa Smart Productive LinkPro® Berbeda?</h3>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
            <div className="grid grid-cols-2 bg-[#0B1220] text-white">
              <div className="p-6 text-center font-bold text-lg border-r border-slate-700 text-slate-400">Konsultan Tradisional</div>
              <div className="p-6 text-center font-bold text-lg text-[#3dd9b0]">Smart Productive LinkPro®</div>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                ['Memberikan rekomendasi', 'Memberikan roadmap implementasi'],
                ['Audit sesaat', 'Monitoring berkelanjutan'],
                ['Laporan statis', 'Dashboard real-time'],
                ['Pelatihan terpisah', 'Pendampingan implementasi'],
                ['Manual', 'Digital & Artificial Intelligence'],
                ['Fokus satu departemen', 'Integrasi seluruh perusahaan']
              ].map((row, idx) => (
                <div key={idx} className="grid grid-cols-2 hover:bg-slate-50 transition-colors">
                  <div className="p-6 text-center text-slate-500 border-r border-slate-100">{row[0]}</div>
                  <div className="p-6 text-center text-slate-900 font-semibold">{row[1]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4.10 CONTACT CTA */}
      <section id="kontak" className="py-24 bg-gradient-to-br from-[#0B1220] to-[#1a2942] text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-8">Saatnya Meningkatkan Produktivitas Perusahaan Anda</h2>
          <div className="prose prose-lg prose-invert mx-auto mb-12">
            <p className="text-slate-300">
              Di era persaingan industri yang semakin kompetitif, produktivitas bukan lagi pilihan, melainkan kebutuhan. Smart Productive LinkPro® membantu perusahaan membangun sistem manajemen produktivitas yang terintegrasi, terukur, dan berkelanjutan untuk mencapai Operational Excellence, meningkatkan daya saing, dan mendorong pertumbuhan bisnis jangka panjang.
            </p>
            <p className="text-[#3dd9b0] font-semibold text-xl mt-8">
              Mulailah transformasi produktivitas perusahaan Anda bersama Link Productive.
            </p>
          </div>
          
          <h3 className="text-2xl font-bold text-[#d4af37] mb-8">Hubungi Kami Sekarang</h3>
          
          {/* Placeholder Contact Form or Buttons */}
          <div className="bg-[#121c2f]/80 p-8 rounded-2xl border border-[#2a3f63] backdrop-blur-sm max-w-2xl mx-auto">
             <form className="space-y-4 mb-8 text-left" onSubmit={(e) => e.preventDefault()}>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-400 mb-1">Nama Lengkap</label>
                   <input type="text" className="w-full bg-[#0B1220] border border-[#2a3f63] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3dd9b0]" placeholder="John Doe" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-400 mb-1">Email Profesional</label>
                   <input type="email" className="w-full bg-[#0B1220] border border-[#2a3f63] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3dd9b0]" placeholder="john@company.com" />
                 </div>
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-400 mb-1">Nama Perusahaan</label>
                 <input type="text" className="w-full bg-[#0B1220] border border-[#2a3f63] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3dd9b0]" placeholder="PT. Inovasi Industri" />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-400 mb-1">Pesan / Kebutuhan</label>
                 <textarea rows={3} className="w-full bg-[#0B1220] border border-[#2a3f63] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#3dd9b0]" placeholder="Jelaskan tantangan produktivitas perusahaan Anda..."></textarea>
               </div>
             </form>
             
             <div className="flex flex-col sm:flex-row gap-4 justify-center">
               <button type="button" className="bg-[#3dd9b0] text-[#0B1220] px-6 py-3 rounded-lg font-bold hover:bg-[#2bb394] transition-colors w-full sm:w-auto">
                 Jadwalkan Assessment
               </button>
               <button type="button" className="bg-transparent border border-[#d4af37] text-[#d4af37] px-6 py-3 rounded-lg font-bold hover:bg-[#d4af37]/10 transition-colors w-full sm:w-auto">
                 Request Demo
               </button>
               <button type="button" className="bg-[#1a2942] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#2a3f63] transition-colors w-full sm:w-auto">
                 Konsultasi Gratis
               </button>
             </div>
          </div>
        </div>
      </section>

      {/* 4.11 FOOTER BRAND STATEMENT BAND */}
      <footer className="bg-[#060a12] text-white pt-16 pb-8 border-t border-[#1a2942]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-widest text-[#d4af37] mb-4">SMART PRODUCTIVE LINKPRO®</h2>
          <p className="text-xl font-bold tracking-widest text-slate-300 uppercase mb-8">One System. One Framework. Unlimited Productivity.</p>
          
          <div className="flex flex-col gap-3 text-slate-400 mb-12 max-w-3xl mx-auto">
            <p>Transforming Strategy into Operational Excellence.</p>
            <p>Measure Better. Improve Faster. Grow Stronger.</p>
            <p className="text-slate-300 font-medium">Menghubungkan Strategi • People • Process • Technology • Data menjadi Produktivitas yang Terukur, Berkelanjutan, dan Berdaya Saing Global.</p>
          </div>
          
          <div className="mb-12">
            <p className="font-bold text-[#3dd9b0] text-lg">Enterprise Productivity Management System</p>
            <p className="text-slate-500 text-sm mt-1">Powered by Link Productive®</p>
          </div>
          
          <blockquote className="text-2xl font-serif italic text-white mb-16 border-l-4 border-[#d4af37] pl-6 inline-block text-left">
            "Productivity is Not an Activity.<br/>Productivity is a Culture."
          </blockquote>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <p className="font-bold text-slate-400">Building High Performance Industries Through Integrated Productivity Excellence.</p>
            <p>Smart Productive LinkPro® — Link Productive | &copy; {new Date().getFullYear()} Link Productive</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
