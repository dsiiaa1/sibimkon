'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  FolderKanban, 
  TrendingUp, 
  Activity, 
  Sparkles, 
  LineChart, 
  FileCheck, 
  Bell, 
  LogOut, 
  User, 
  Building,
  Menu,
  X,
  FileText
} from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [loading, setLoading] = useState(true)

  // Auth checking and load mock data
  useEffect(() => {
    const localUser = localStorage.getItem('sibimkon_user')
    if (!localUser) {
      router.push('/login')
    } else {
      const parsedUser = JSON.parse(localUser)
      setUser(parsedUser)
      
      // Load initial notifications
      const baseNotifications = [
        {
          id: '1',
          title: 'Assessment Selesai',
          message: 'PT Sinar Maju Tekstil telah melengkapi assessment Morale.',
          time: '5m yang lalu',
          unread: true,
          type: 'info'
        },
        {
          id: '2',
          title: '⚠️ Target KPI Kurang',
          message: 'KPI "Downtime bottleneck" berada di level warning.',
          time: '1j yang lalu',
          unread: true,
          type: 'warning'
        }
      ]
      setNotifications(baseNotifications)
    }
    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('sibimkon_user')
    document.cookie = "sibimkon_demo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC"
    router.push('/login')
  }

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })))
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span className="text-sm text-slate-400">Memuat SIBIMKON...</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Proyek BIMKON', href: '/projects', icon: FolderKanban },
    { name: 'Nasional / Admin', href: '/admin', icon: Activity, roles: ['admin_kemnaker', 'admin_disnaker'] },
  ]

  const activeProjectMatch = pathname.match(/\/projects\/([^/]+)/)
  const activeProjectId = activeProjectMatch ? activeProjectMatch[1] : null

  // If a project is active, display the DMAIC stages in sidebar
  const dmaicStages = activeProjectId ? [
    { name: '1. Define (Profil & Charter)', href: `/projects/${activeProjectId}/define`, icon: FileCheck },
    { name: '2. Measure (PQCDSM)', href: `/projects/${activeProjectId}/measure`, icon: TrendingUp },
    { name: '3. Analyze (RCA & AI)', href: `/projects/${activeProjectId}/analyze`, icon: Sparkles },
    { name: '4. Improve (Action Plan)', href: `/projects/${activeProjectId}/improve`, icon: LineChart },
    { name: '5. Control (KPI & PSI)', href: `/projects/${activeProjectId}/control`, icon: Activity },
    { name: '6. Laporan Akhir', href: `/projects/${activeProjectId}/reports`, icon: FileText }
  ] : []

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      {/* Sidebar for desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950/80 border-r border-slate-800/80 backdrop-blur-xl transition-transform duration-350 ease-in-out md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Sidebar brand header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-cyan-200">
              SIBIMKON
            </span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="rounded p-1 hover:bg-slate-800 md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User profile section */}
        <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 font-bold text-white shadow-md">
              {user.full_name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-200">{user.full_name}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>
          {user.organization && (
            <p className="mt-2 text-xs text-slate-500 flex items-center gap-1.5 truncate">
              <Building className="h-3 w-3 flex-shrink-0" />
              {user.organization}
            </p>
          )}
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
          {navigation
            .filter(item => !item.roles || item.roles.includes(user.role))
            .map(item => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' 
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}

          {dmaicStages.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-800/80">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                Tahapan DMAIC
              </p>
              <div className="space-y-1">
                {dmaicStages.map(stage => {
                  const active = pathname === stage.href
                  return (
                    <Link
                      key={stage.name}
                      href={stage.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        active 
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/35' 
                          : 'text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent'
                      }`}
                    >
                      <stage.icon className="h-3.5 w-3.5" />
                      {stage.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Keluar Aplikasi
          </button>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 md:pl-72 flex flex-col min-h-screen">
        {/* Header bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 shadow-sm">
          {/* Menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded p-2 text-slate-400 hover:bg-slate-800 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page title context or breadcrumb placeholder */}
          <div className="hidden sm:block">
            <span className="text-xs text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Demo Mode Aktif ⚡
            </span>
          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Notification button with dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-slate-400 hover:text-white transition-all hover:border-slate-700"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-800 bg-slate-950/95 shadow-xl shadow-black/40 py-2 z-50 backdrop-blur-lg animate-fade-in">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80">
                    <span className="text-xs font-bold text-slate-200">Notifikasi ({unreadCount})</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300">
                        Tandai dibaca
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto px-2 py-1">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-500">Tidak ada notifikasi baru.</p>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className={`p-3.5 my-1 rounded-xl text-xs transition-all ${notif.unread ? 'bg-indigo-500/5 border border-indigo-500/10' : 'hover:bg-slate-900 text-slate-400'}`}>
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-slate-200">{notif.title}</span>
                            <span className="text-[9px] text-slate-500">{notif.time}</span>
                          </div>
                          <p className="mt-1 text-slate-300 leading-normal">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile widget */}
            <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
              <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-200">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-medium text-slate-300 leading-none">{user.full_name}</p>
                <span className="text-[9px] text-slate-500">{user.email}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page body section */}
        <main className="flex-1 p-6 md:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
