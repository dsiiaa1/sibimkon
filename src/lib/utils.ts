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
 * Sanitize an integer input: parse and clamp to a safe range.
 */
export function sanitizeInt(value: string | number, min = 0, max = 999_999_999): number {
  const n = typeof value === 'string' ? parseInt(value, 10) : Math.trunc(value)
  if (isNaN(n)) return min
  return Math.max(min, Math.min(max, n))
}

export const PQCDSM_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  productivity: { label: 'Productivity', color: '#6366f1', icon: '⚡' },
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
