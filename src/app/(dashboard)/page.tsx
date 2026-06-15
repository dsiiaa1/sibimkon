'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.push('/dashboard')
  }, [router])

  return (
    <div className="flex h-64 items-center justify-center text-slate-400">
      <span>Mengalihkan...</span>
    </div>
  )
}
