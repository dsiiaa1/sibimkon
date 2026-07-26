import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Sanitize a plain text string: trim whitespace and collapse internal
 * multiple spaces. Use before saving any user-supplied text field.
 */
export function sanitizeText(value: string): string {
  return value.trim().replace(/\s{2,}/g, ' ')
}

/**
 * Validates a business process stage duration.
 */
export function validateDuration(value: number): boolean {
  return value > 0 && value < 1000000 // reasonable bounds
}

/**
 * Evaluates whether an action plan is delayed based on its end_date and status.
 */
export function isActionPlanDelayed(endDate: string, status: string): boolean {
  if (status === 'selesai') return false
  const end = new Date(endDate).getTime()
  const now = new Date().getTime()
  return now > end
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export type CompanyTier = 'simple' | 'menengah' | 'besar'

const TIER_RANK: Record<CompanyTier, number> = { simple: 0, menengah: 1, besar: 2 }

function tierFromEmployees(jumlahTenagaKerja: number | undefined | null): CompanyTier {
  if (!jumlahTenagaKerja || jumlahTenagaKerja < 30) return 'simple'
  if (jumlahTenagaKerja <= 100) return 'menengah'
  return 'besar'
}

function tierFromRevenue(annualRevenueIdr: number | undefined | null): CompanyTier {
  if (!annualRevenueIdr || annualRevenueIdr <= 15_000_000_000) return 'simple'
  if (annualRevenueIdr <= 50_000_000_000) return 'menengah'
  return 'besar'
}

/**
 * Menentukan tier perusahaan berdasarkan kombinasi jumlah tenaga kerja
 * dan omzet tahunan. Mengikuti prinsip PP No. 7/2021: jika kedua kriteria
 * menunjukkan kategori berbeda, kategori yang LEBIH TINGGI yang berlaku.
 */
export function determineTier(
  jumlahTenagaKerja: number | undefined | null,
  annualRevenueIdr?: number | undefined | null
): CompanyTier {
  const byEmployees = tierFromEmployees(jumlahTenagaKerja)
  const byRevenue = tierFromRevenue(annualRevenueIdr)
  return TIER_RANK[byEmployees] >= TIER_RANK[byRevenue] ? byEmployees : byRevenue
}

/**
 * Sanitize an integer input: parse and clamp to a safe range.
 */
export function sanitizeInt(value: string | number, min = 0, max = 999_999_999): number {
  const n = typeof value === 'string' ? parseInt(value, 10) : Math.trunc(value)
  if (isNaN(n)) return min
  return Math.max(min, Math.min(max, n))
}

export const PQCDSM_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  productivity: { label: 'Production', color: '#6366f1', icon: '⚡' },
  quality: { label: 'Quality', color: '#8b5cf6', icon: '✨' },
  cost: { label: 'Cost', color: '#ec4899', icon: '💰' },
  delivery: { label: 'Delivery', color: '#f59e0b', icon: '🚚' },
  safety: { label: 'Safety', color: '#10b981', icon: '🛡️' },
  morale: { label: 'Morale', color: '#06b6d4', icon: '👥' },
}

export const PROJECT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-500' },
  define: { label: 'Define', color: 'bg-blue-500' },
  measure: { label: 'Measure', color: 'bg-purple-500' },
  analyze: { label: 'Analyze', color: 'bg-orange-500' },
  improve: { label: 'Improve', color: 'bg-green-500' },
  control: { label: 'Control', color: 'bg-teal-500' },
  completed: { label: 'Selesai', color: 'bg-emerald-600' },
  archived: { label: 'Arsip', color: 'bg-gray-400' },
}

export const ACTION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  belum_mulai: { label: 'Belum Mulai', color: 'bg-gray-500' },
  sedang_berjalan: { label: 'Sedang Berjalan', color: 'bg-blue-500' },
  selesai: { label: 'Selesai', color: 'bg-green-500' },
  tertunda: { label: 'Tertunda', color: 'bg-red-500' },
}

/**
 * Mencoba menebak dimensi PQCDSM dari judul dan deskripsi jika tidak tersedia
 */
export function inferPQCDSMDimension(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase()
  
  if (/(produktivitas|output|cycle time|downtime|efisiensi|throughput|yield|produksi|optimasi)/.test(text)) return 'productivity'
  if (/(kualitas|cacat|defect|reject|rework|keluhan|garansi|akurasi|error|mutu)/.test(text)) return 'quality'
  if (/(biaya|cost|pengeluaran|inventory|stok|material|waste|energi|budget)/.test(text)) return 'cost'
  if (/(waktu|keterlambatan|delay|lead time|pengiriman|jadwal|antrean|delivery)/.test(text)) return 'delivery'
  if (/(k3|kecelakaan|safety|aman|bahaya|risiko|insiden|ergonomi|cedera|keselamatan)/.test(text)) return 'safety'
  if (/(motivasi|absensi|turnover|disiplin|kepuasan kerja|pelatihan|morale|karyawan)/.test(text)) return 'morale'
  
  return 'lainnya'
}
