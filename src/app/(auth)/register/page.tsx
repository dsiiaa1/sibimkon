'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Eye, EyeOff, User, Building2, Phone, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function RegisterPage() {
  // Navigation step state
  const [step, setStep] = useState(1)

  // Form Field States
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role] = useState<'perusahaan'>('perusahaan')
  
  // Step 2 Fields
  const [companyName, setCompanyName] = useState('')
  const [businessField, setBusinessField] = useState('Manufaktur')

  // Step 3 Fields
  const [phone, setPhone] = useState('')
  const [picPosition, setPicPosition] = useState('')

  // UI Control States
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Validation Dirtiness States
  const [emailDirty, setEmailDirty] = useState(false)
  const [passwordDirty, setPasswordDirty] = useState(false)
  const [confirmPasswordDirty, setConfirmPasswordDirty] = useState(false)
  const [phoneDirty, setPhoneDirty] = useState(false)

  const router = useRouter()

  // Real-time Validations
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isPasswordValid = password.length >= 6
  const isConfirmPasswordValid = password === confirmPassword
  const isPhoneValid = /^(?:\+62|62|0)8[1-9][0-9]{6,11}$/.test(phone.replace(/[\s-]/g, ''))

  // Validation helpers for Step 1
  const isStep1Valid = 
    name.trim().length >= 3 && 
    isEmailValid && 
    isPasswordValid && 
    isConfirmPasswordValid

  // Validation helpers for Step 2
  const isStep2Valid = companyName.trim().length >= 3

  // Validation helpers for Step 3
  const isStep3Valid = isPhoneValid && picPosition.trim().length >= 2

  const nextStep = () => {
    if (step === 1 && !isStep1Valid) {
      setEmailDirty(true)
      setPasswordDirty(true)
      setConfirmPasswordDirty(true)
      return
    }
    if (step === 2 && !isStep2Valid) return
    setStep((prev) => prev + 1)
  }

  const prevStep = () => {
    setStep((prev) => prev - 1)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isStep3Valid) {
      setPhoneDirty(true)
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const finalOrganization = companyName

    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password.trim(),
        options: {
          data: {
            full_name: name,
            role: role,
            company_name: companyName,
          },
        },
      })

      if (signUpError) {
        if (signUpError.message?.includes('User already registered')) {
          throw new Error('Email ini sudah terdaftar. Silakan login atau gunakan email lain.')
        }
        if (signUpError.message?.includes('Email rate limit exceeded')) {
          throw new Error('Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.')
        }
        if (signUpError.message?.includes('Unable to validate email address')) {
          throw new Error('Format email tidak valid.')
        }
        throw new Error(signUpError.message || JSON.stringify(signUpError))
      }

      if (data?.user) {
        try {
          const { error: profileErr } = await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: name,
            email: email,
            phone: phone,
            role: role,
            organization: finalOrganization,
            is_active: true,
          }, { onConflict: 'id' })

          if (profileErr) {
            console.warn('Profile insert warning:', profileErr)
          }
        } catch (profileErr) {
          console.warn('Profile insert failed (trigger may handle it):', profileErr)
        }

      }

      setSuccess(
        data?.user?.identities?.length === 0
          ? 'Email ini sudah terdaftar. Silakan login.'
          : 'Pendaftaran berhasil! Akun Anda sudah aktif. Silakan login.'
      )

      setTimeout(() => {
        router.push('/login?registered=true')
      }, 4000)

    } catch (err: any) {
      console.error('Register error:', err)
      const msg = typeof err === 'string' ? err
        : err?.message ? err.message
        : err?.error_description ? err.error_description
        : JSON.stringify(err)
      setError(msg || 'Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen w-full bg-[#050a18]">
      
      {/* LEFT COLUMN: BRANDING & DETAILS (Navy) */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-[#050a18] via-[#09142c] to-[#040814] border-r border-slate-800/60 text-white">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-r from-amber-500/10 to-transparent blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-l from-[#1e4080]/15 to-transparent blur-[80px] pointer-events-none" />
        
        {/* Top Branding Logo */}
        <div className="flex items-center gap-4 z-10">
          <img src="/sibimkonicon.png" alt="Logo" className="h-10 w-10 object-contain" />
          <div>
            <h1 className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
              SIBIMKON
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400">
              Link Productive
            </p>
          </div>
        </div>

        {/* Center Text Info */}
        <div className="z-10 max-w-lg my-auto space-y-6">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-[#f4c430] inline-block tracking-wider uppercase">
            Portal Registrasi
          </span>
          <h2 className="text-4xl font-extrabold leading-tight text-slate-100">
            Bergabunglah dengan Ekosistem Peningkatan Produktivitas
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Dapatkan bimbingan terstruktur, pantau perkembangan proyek perbaikan secara real-time, dan capai efisiensi maksimal dengan solusi berbasis digital.
          </p>

          {/* Stepper info card */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4" style={{ background: 'rgba(10,22,40,0.3)', backdropFilter: 'blur(10px)' }}>
            <h3 className="text-xs font-bold text-slate-350 tracking-wider uppercase">3 Langkah Mudah Pendaftaran</h3>
            <div className="space-y-3">
              {[
                { stepNum: 1, title: 'Informasi Akun', desc: 'Detail login email dan password aman.' },
                { stepNum: 2, title: 'Profil Perusahaan', desc: 'Identitas instansi atau bidang usaha.' },
                { stepNum: 3, title: 'Kontak & PIC', desc: 'Nomor WhatsApp aktif untuk koordinasi bimbingan.' }
              ].map((item) => (
                <div key={item.stepNum} className="flex gap-3.5 items-start">
                  <div className={`h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                    step === item.stepNum 
                      ? 'bg-amber-400 text-[#050a18] shadow' 
                      : step > item.stepNum 
                        ? 'bg-amber-600/70 text-white' 
                        : 'bg-slate-900 border border-slate-800 text-slate-500'
                  }`}>
                    {item.stepNum}
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${step === item.stepNum ? 'text-amber-400' : 'text-slate-300'}`}>{item.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Brand Info */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/40 pt-6 z-10">
          <span>SIBIMKON — Link Productive</span>
          <span>© 2026 Link Productive</span>
        </div>
      </div>

      {/* RIGHT COLUMN: WHITE FORM CONTAINER */}
      <div 
        className="col-span-1 lg:col-span-5 flex flex-col justify-center py-12 px-6 sm:px-12 md:px-20 bg-white"
        style={{
          '--background': '#ffffff',
          '--foreground': '#0f172a',
          '--text-primary': '#0f172a',
          '--text-secondary': '#475569',
          '--text-muted': '#94a3b8',
          '--border-base': '#e2e8f0',
          '--navy-900': '#f8fafc',
          background: '#ffffff',
          color: '#0f172a'
        } as any}
      >
        <div className="w-full max-w-md mx-auto">
          {/* Mobile logo header */}
          <div className="lg:hidden flex flex-col items-center mb-6">
            <img src="/sibimkonicon.png" alt="Logo" className="h-12 w-12 object-contain" />
            <h2 className="mt-2 text-center text-xl font-black text-[#0a1628]">
              Daftar SIBIMKON
            </h2>
            <p className="mt-1 text-center text-xs text-slate-500">
              Registrasi Akun Baru Klien Perusahaan
            </p>
          </div>

          {/* Desktop welcome header */}
          <div className="hidden lg:block mb-6">
            <h2 className="text-2xl font-black text-[#0f172a] tracking-tight">
              Registrasi Akun
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Silakan isi formulir secara lengkap untuk memulai.
            </p>
          </div>

          {/* Stepper Progress Bar (Right Column) */}
          <div className="mb-6 flex items-center justify-between relative px-2 py-1">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-[#0a1628] -translate-y-1/2 z-0 transition-all duration-300" 
              style={{ width: step === 1 ? '16%' : step === 2 ? '50%' : '84%' }}
            />
            
            {[1, 2, 3].map((s) => (
              <div key={s} className="relative z-10 flex flex-col items-center">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s 
                    ? 'bg-[#0a1628] text-white ring-4 ring-slate-100 scale-105' 
                    : step > s 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-white border-2 border-slate-200 text-slate-400'
                }`}>
                  {s}
                </div>
              </div>
            ))}
          </div>

          {/* Error / Success alerts */}
          {error && (
            <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 flex items-start gap-2.5 animate-fade-in">
              <span className="text-base leading-none">⚠️</span>
              <p className="font-semibold leading-relaxed">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-800 flex items-start gap-3.5 animate-fade-in">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Pendaftaran Berhasil!</p>
                <p className="mt-1 text-emerald-600 leading-normal">{success}</p>
                <p className="mt-2.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mengalihkan ke Halaman Login...</p>
              </div>
            </div>
          )}

          {!success && (
            <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
              
              {/* STEP 1: ACCOUNT DETAILS */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Full Name */}
                  <div>
                    <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Nama Lengkap
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nama lengkap Anda"
                        className="block w-full rounded-xl pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:bg-white transition-all outline-none"
                        style={{ backgroundColor: '#f8fafc', color: '#0f172a', borderColor: '#cbd5e1' }}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Alamat Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={email}
                        onBlur={() => setEmailDirty(true)}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@email.com"
                        className={`block w-full rounded-xl pl-10 pr-4 py-3 bg-slate-50 border text-slate-900 placeholder-slate-400 text-sm focus:bg-white transition-all outline-none ${
                          emailDirty && !isEmailValid ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200'
                        }`}
                        style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}
                      />
                    </div>
                    {emailDirty && !isEmailValid && (
                      <p className="mt-1.5 text-[10px] text-rose-500 font-bold uppercase tracking-wide">Format email tidak valid</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Kata Sandi (min. 6 karakter)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onBlur={() => setPasswordDirty(true)}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`block w-full rounded-xl pl-10 pr-10 py-3 bg-slate-50 border text-slate-900 placeholder-slate-400 text-sm focus:bg-white transition-all outline-none ${
                          passwordDirty && !isPasswordValid ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200'
                        }`}
                        style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordDirty && !isPasswordValid && (
                      <p className="mt-1.5 text-[10px] text-rose-500 font-bold uppercase tracking-wide">Sandi harus minimal 6 karakter</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Konfirmasi Kata Sandi
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onBlur={() => setConfirmPasswordDirty(true)}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`block w-full rounded-xl pl-10 pr-10 py-3 bg-slate-50 border text-slate-900 placeholder-slate-400 text-sm focus:bg-white transition-all outline-none ${
                          confirmPasswordDirty && !isConfirmPasswordValid ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200'
                        }`}
                        style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPasswordDirty && !isConfirmPasswordValid && (
                      <p className="mt-1.5 text-[10px] text-rose-500 font-bold uppercase tracking-wide">Konfirmasi sandi tidak cocok</p>
                    )}
                  </div>

                </div>
              )}

              {/* STEP 2: BUSINESS/ENTITY INFO */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  {/* Company Name */}
                  <div>
                    <label htmlFor="companyName" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Nama Perusahaan
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Building2 className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="companyName"
                        name="companyName"
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="PT Perusahaan Contoh"
                        className="block w-full rounded-xl pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:bg-white transition-all outline-none"
                        style={{ backgroundColor: '#f8fafc', color: '#0f172a', borderColor: '#cbd5e1' }}
                      />
                    </div>
                  </div>

                  {/* Business Field dropdown */}
                  <div>
                    <label htmlFor="businessField" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Bidang Usaha
                    </label>
                    <select
                      id="businessField"
                      name="businessField"
                      value={businessField}
                      onChange={(e) => setBusinessField(e.target.value)}
                      className="block w-full rounded-xl px-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white transition-all outline-none"
                      style={{ backgroundColor: '#f8fafc', color: '#0f172a', borderColor: '#cbd5e1' }}
                    >
                      <option value="Manufaktur">🏭 Manufaktur / Pabrik</option>
                      <option value="Jasa">💼 Jasa & Layanan</option>
                      <option value="Retail">🛒 Perdagangan & Retail</option>
                      <option value="Logistik">🚚 Logistik & Transportasi</option>
                      <option value="Konstruksi">🏗️ Konstruksi & Properti</option>
                      <option value="Lainnya">🧩 Bidang Usaha Lainnya</option>
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 3: PIC & WHATSAPP */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* WhatsApp/Phone number */}
                  <div>
                    <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Nomor Telepon / WhatsApp
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="phone"
                        name="phone"
                        type="text"
                        required
                        value={phone}
                        onBlur={() => setPhoneDirty(true)}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        className={`block w-full rounded-xl pl-10 pr-4 py-3 bg-slate-50 border text-slate-900 placeholder-slate-400 text-sm focus:bg-white transition-all outline-none ${
                          phoneDirty && !isPhoneValid ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200'
                        }`}
                        style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}
                      />
                    </div>
                    {phoneDirty && !isPhoneValid ? (
                      <p className="mt-1.5 text-[10px] text-rose-500 font-bold uppercase tracking-wide">Nomor telepon harus diawali 08, 62, atau +62 (10-15 angka)</p>
                    ) : (
                      <p className="mt-1 text-[10px] text-slate-400">Gunakan format Indonesia (cth: 0812... atau +62812...).</p>
                    )}
                  </div>

                  {/* PIC Position */}
                  <div>
                    <label htmlFor="picPosition" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Jabatan Anda (PIC / Pelaksana)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="picPosition"
                        name="picPosition"
                        type="text"
                        required
                        value={picPosition}
                        onChange={(e) => setPicPosition(e.target.value)}
                        placeholder="Contoh: Direktur, HRD Manager, Konsultan Pendamping"
                        className="block w-full rounded-xl pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:bg-white transition-all outline-none"
                        style={{ backgroundColor: '#f8fafc', color: '#0f172a', borderColor: '#cbd5e1' }}
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* ACTION NAVIGATION BUTTONS */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={loading}
                    className="flex-1 flex justify-center items-center gap-1.5 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Kembali
                  </button>
                )}
                
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
                    className="flex-1 flex justify-center items-center gap-1.5 py-3 rounded-xl text-white font-bold text-xs bg-[#0a1628] hover:bg-[#142642] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    style={{ backgroundColor: '#0a1628', color: '#ffffff' }}
                  >
                    Lanjutkan
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={loading || !isStep3Valid}
                    className="flex-1 flex justify-center items-center gap-1.5 py-3 rounded-xl text-white font-bold text-xs bg-[#0a1628] hover:bg-[#142642] border border-amber-500/10 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    style={{ backgroundColor: '#0a1628', color: '#ffffff' }}
                  >
                    {loading ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Mendaftarkan...</span>
                      </>
                    ) : (
                      <>
                        <span>Selesaikan & Kirim</span>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Login callout */}
          {!success && (
            <p className="mt-8 text-center text-xs text-slate-500">
              Sudah memiliki akun?{' '}
              <Link 
                href="/login" 
                className="font-bold text-[#0a1628] hover:text-amber-600 hover:underline transition-all"
              >
                Masuk di sini
              </Link>
            </p>
          )}
        </div>
      </div>

    </div>
  )
}
