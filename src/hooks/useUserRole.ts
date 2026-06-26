'use client'

import { useState, useEffect } from 'react'

export interface UserInfo {
  id: string
  email: string
  full_name: string
  role: string
  organization: string
}

interface UseUserRoleResult {
  userInfo: UserInfo | null
  /** true saat masih fetch dari server */
  loading: boolean
  /** true = role sudah diverifikasi dari server (bukan cuma localStorage) */
  verified: boolean
}

/**
 * useUserRole
 *
 * Mengambil role user dengan urutan keamanan:
 *   1. Fetch GET /api/auth/me  → role dari Supabase session (server-side JWT, tidak bisa dimanipulasi)
 *   2. Fallback ke localStorage['sibimkon_user'] → untuk demo/offline mode
 *
 * `verified` = true hanya jika sumber adalah server (/api/auth/me).
 * Komponen yang memerlukan keamanan tinggi harus mengecek `verified` sebelum
 * menampilkan aksi sensitif.
 */
export function useUserRole(): UseUserRoleResult {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    // Seed awal dari localStorage agar UI tidak kosong selama fetch
    const local = typeof window !== 'undefined'
      ? localStorage.getItem('sibimkon_user')
      : null

    if (local) {
      try {
        const parsed = JSON.parse(local)
        setUserInfo({
          id: parsed.id ?? '',
          email: parsed.email ?? '',
          full_name: parsed.full_name ?? '',
          role: parsed.role ?? 'perusahaan',
          organization: parsed.organization ?? '',
        })
      } catch {
        // localStorage korup, abaikan
      }
    }

    // Fetch dari server — ini yang tidak bisa dimanipulasi user
    const controller = new AbortController()

    fetch('/api/auth/me', { signal: controller.signal, credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) {
          // 401 = tidak login; 503 = demo mode (Supabase belum dikonfig)
          // Tetap pakai localStorage, jangan overwrite dengan null
          return
        }
        const data: UserInfo = await res.json()

        // Sync balik ke localStorage agar sesi berikutnya up-to-date
        if (typeof window !== 'undefined') {
          const existing = localStorage.getItem('sibimkon_user')
          const parsed = existing ? JSON.parse(existing) : {}
          localStorage.setItem(
            'sibimkon_user',
            JSON.stringify({ ...parsed, ...data })
          )
        }

        setUserInfo(data)
        setVerified(true)
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          console.warn('[useUserRole] /api/auth/me fetch failed, using localStorage:', err)
        }
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [])

  return { userInfo, loading, verified }
}
