import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { verificationEmailTemplate } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

// Simple in-memory rate limiter: max 3 emails per email address per 10 menit
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(email: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const windowMs = 10 * 60_000 // 10 menit
  const maxReqs = 3

  const entry = rateLimitMap.get(email)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }
  if (entry.count >= maxReqs) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, name, verificationUrl } = body

    // Validasi input
    if (!email || !name || !verificationUrl) {
      return NextResponse.json(
        { error: 'Parameter email, name, dan verificationUrl wajib diisi.' },
        { status: 400 }
      )
    }

    // Validasi format email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format email tidak valid.' },
        { status: 400 }
      )
    }

    // Validasi verificationUrl harus dari domain yang dikenal
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const isValidUrl =
      verificationUrl.startsWith(appUrl) ||
      verificationUrl.startsWith(supabaseUrl) ||
      verificationUrl.startsWith('https://')

    if (!isValidUrl) {
      return NextResponse.json(
        { error: 'verificationUrl tidak valid.' },
        { status: 400 }
      )
    }

    // Rate limit check
    const rl = checkRateLimit(email.toLowerCase())
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Tunggu ${Math.ceil((rl.retryAfter ?? 600) / 60)} menit sebelum mencoba lagi.` },
        {
          status: 429,
          headers: { 'Retry-After': String(rl.retryAfter ?? 600) },
        }
      )
    }

    // Kirim email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'SIBIMKON <onboarding@resend.dev>',
      to: email,
      subject: 'Verifikasi Email Akun SIBIMKON Anda',
      html: verificationEmailTemplate({ name, verificationUrl }),
    })

    if (error) {
      console.error('[send-verification-email] Resend error:', error)
      return NextResponse.json(
        { error: 'Gagal mengirim email. Silakan coba lagi.' },
        { status: 500 }
      )
    }

    console.log('[send-verification-email] Email terkirim ke:', email, '| ID:', data?.id)

    return NextResponse.json({
      success: true,
      message: 'Email verifikasi berhasil dikirim.',
      id: data?.id,
    })
  } catch (err: any) {
    console.error('[send-verification-email] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    )
  }
}
