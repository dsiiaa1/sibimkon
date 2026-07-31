/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  rate-limiter.ts — Sliding Window Rate Limiter untuk Next.js API Routes  │
 * │                                                                          │
 * │  Algoritma: Sliding Window Counter                                       │
 * │  Storage: In-memory Map (per-serverless-instance)                        │
 * │                                                                          │
 * │  Catatan Vercel/Serverless:                                              │
 * │  Rate limiter ini berjalan per-instance. Artinya pada traffic sangat     │
 * │  tinggi, sebuah IP bisa "lolos" jika request-nya mengenai instance       │
 * │  berbeda. Namun ini sudah cukup untuk mencegah abuse oleh bot tunggal    │
 * │  dan single-tab spam. Untuk produksi skala enterprise, gunakan Upstash   │
 * │  Redis (@upstash/ratelimit) sebagai persistent store.                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

interface WindowEntry {
  count: number
  windowStart: number
}

// Store global — persisten selama lifetime proses serverless
const store = new Map<string, WindowEntry>()

// Bersihkan entry lama setiap 5 menit untuk mencegah memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > 15 * 60 * 1000) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  /** Maksimal request dalam satu window */
  limit: number
  /** Durasi window dalam detik */
  windowSeconds: number
}

export interface RateLimitResult {
  /** true jika request diizinkan, false jika perlu di-block */
  allowed: boolean
  /** Jumlah request tersisa dalam window ini */
  remaining: number
  /** Waktu (detik) sampai window reset */
  resetIn: number
  /** Informasi untuk HTTP headers (X-RateLimit-*) */
  headers: Record<string, string>
}

/**
 * Preset aturan rate limiting berdasarkan kategori endpoint.
 */
export const RATE_LIMIT_PRESETS = {
  /** Endpoint AI yang mahal dan lambat */
  ai: { limit: 15, windowSeconds: 60 },
  /** Endpoint data umum (save, read, upload) */
  general: { limit: 60, windowSeconds: 60 },
  /** Endpoint autentikasi — brute-force protection */
  auth: { limit: 10, windowSeconds: 15 * 60 },
} satisfies Record<string, RateLimitConfig>

/**
 * Mendapatkan IP klien dari header Vercel/Cloudflare/standard.
 */
export function getClientIp(request: Request): string {
  // Vercel mengirim IP asli melalui header ini
  const vercelIp = (request.headers as any).get?.('x-vercel-forwarded-for')
    || (request.headers as any).get?.('x-real-ip')
    || (request.headers as any).get?.('x-forwarded-for')?.split(',')[0]?.trim()
  return vercelIp || 'unknown'
}

/**
 * Periksa rate limit untuk suatu IP + namespace.
 * 
 * @param ip - IP address klien
 * @param namespace - Identifikasi endpoint (mis: 'ai-charter', 'auth-login')
 * @param config - Aturan rate limiting
 */
export function checkRateLimit(
  ip: string,
  namespace: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${namespace}:${ip}`
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000

  const existing = store.get(key)

  // Jika belum ada atau window sudah expired, buat window baru
  if (!existing || now - existing.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now })
    const remaining = config.limit - 1
    const resetIn = config.windowSeconds
    return {
      allowed: true,
      remaining,
      resetIn,
      headers: buildHeaders(config.limit, remaining, Math.floor(Date.now() / 1000) + resetIn),
    }
  }

  // Window masih aktif — tambah counter
  existing.count++
  store.set(key, existing)

  const remaining = Math.max(0, config.limit - existing.count)
  const resetIn = Math.ceil((existing.windowStart + windowMs - now) / 1000)
  const allowed = existing.count <= config.limit

  return {
    allowed,
    remaining,
    resetIn,
    headers: buildHeaders(config.limit, remaining, Math.floor(Date.now() / 1000) + resetIn),
  }
}

function buildHeaders(limit: number, remaining: number, resetAt: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'X-RateLimit-Reset': String(resetAt),
  }
}
