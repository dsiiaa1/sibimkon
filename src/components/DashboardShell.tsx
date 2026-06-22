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
import { useLanguage } from '@/lib/i18n/LanguageContext'

function getRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Baru saja'
    if (diffMins < 60) return `${diffMins}m yang lalu`
    if (diffHours < 24) return `${diffHours}j yang lalu`
    if (diffDays < 7) return `${diffDays}h yang lalu`
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  } catch (e) {
    return dateStr
  }
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { locale, setLocale, t } = useLanguage()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load sidebar collapse preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sibimkon_sidebar_collapsed')
      if (saved === 'true') {
        setIsCollapsed(true)
      }
    }
  }, [])

  const toggleSidebarCollapse = () => {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    localStorage.setItem('sibimkon_sidebar_collapsed', String(nextState))
  }

  // Auth checking and load mock data
  useEffect(() => {
    async function checkAuth() {
      const localUser = localStorage.getItem('sibimkon_user')
      let currentUser = null

      if (localUser) {
        currentUser = JSON.parse(localUser)
      } else {
        // Fallback: Check if there's an active Supabase session
        try {
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          const { data: { user: sbUser } } = await supabase.auth.getUser()

          if (sbUser) {
            let fullName = sbUser.user_metadata?.full_name || 'User SIBIMKON'
            let userRole = sbUser.user_metadata?.role || 'konsultan'
            let org = sbUser.user_metadata?.company_name || 'SIBIMKON'

            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sbUser.id)
                .single()
              if (profile) {
                fullName = profile.full_name || fullName
                userRole = profile.role || userRole
                org = profile.organization || org
              }
            } catch (err) {
              console.warn('Could not fetch profiles table, using user metadata:', err)
            }

            currentUser = {
              id: sbUser.id,
              email: sbUser.email,
              full_name: fullName,
              role: userRole,
              organization: org,
            }
            localStorage.setItem('sibimkon_user', JSON.stringify(currentUser))
          }
        } catch (err) {
          console.error('Error verifying Supabase session in layout:', err)
        }
      }

      if (!currentUser) {
        router.push('/login')
      } else {
        setUser(currentUser)
        
        // Base notifications — generic, tidak menyebut data perusahaan tertentu
        const baseNotifications: any[] = []

        // Load local mock notifications
        const localMock = localStorage.getItem(`sibimkon_mock_notifications_${currentUser.id}`)
        const mockNotifs = localMock ? JSON.parse(localMock).map((n: any) => ({
          ...n,
          time: getRelativeTime(n.created_at),
          unread: !n.is_read
        })) : []

        const fetchNotifications = async () => {
          try {
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            const { data: sbNotifs } = await supabase
              .from('notifications')
              .select('*')
              .eq('user_id', currentUser.id)
              .order('created_at', { ascending: false })
              .limit(10)

            if (sbNotifs && sbNotifs.length > 0) {
              const mapped = sbNotifs.map((n: any) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                time: getRelativeTime(n.created_at),
                unread: !n.is_read,
                type: n.type || 'info'
              }))
              setNotifications([...mockNotifs, ...mapped])
            } else {
              setNotifications([...mockNotifs, ...baseNotifications])
            }
          } catch (err) {
            console.error('Failed to load notifications from Supabase:', err)
            setNotifications([...mockNotifs, ...baseNotifications])
          }
        }

        fetchNotifications()
      }
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Supabase signOut error (non-critical):', err)
    }
    localStorage.removeItem('sibimkon_user')
    router.push('/login')
  }

  const markAllRead = async () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })))
    if (!user) return

    // Update local mock notifications to read
    const localMockKey = `sibimkon_mock_notifications_${user.id}`
    const localMock = localStorage.getItem(localMockKey)
    if (localMock) {
      const parsed = JSON.parse(localMock)
      const updatedMock = parsed.map((n: any) => ({ ...n, is_read: true }))
      localStorage.setItem(localMockKey, JSON.stringify(updatedMock))
    }

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
    } catch (err) {
      console.error('Failed to update notifications read status in Supabase:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-white" style={{background: 'var(--navy-950)'}}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" style={{borderColor: 'var(--gold-400)', borderTopColor: 'transparent'}} />
          <span className="text-sm" style={{color: 'var(--text-muted)'}}>{t('common.loadingSibimkon')}</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.companies'), href: '/companies', icon: Building, roles: ['konsultan', 'admin_kemnaker', 'admin_disnaker'] },
    { name: t('nav.profile'), href: '/profile', icon: Building, roles: ['perusahaan'] },
    { name: t('nav.projects'), href: '/projects', icon: FolderKanban },
    { name: t('nav.admin'), href: '/admin', icon: Activity, roles: ['admin_kemnaker', 'admin_disnaker'] },
  ]

  const activeProjectMatch = pathname.match(/\/projects\/([^/]+)/)
  const activeProjectId = activeProjectMatch ? activeProjectMatch[1] : null

  // If a project is active, display the DMAIC stages in sidebar
  const dmaicStages = activeProjectId ? [
    { name: t('nav.define'), href: `/projects/${activeProjectId}/define`, icon: FileCheck },
    { name: t('nav.measure'), href: `/projects/${activeProjectId}/measure`, icon: TrendingUp },
    { name: t('nav.analyze'), href: `/projects/${activeProjectId}/analyze`, icon: Sparkles },
    { name: t('nav.improve'), href: `/projects/${activeProjectId}/improve`, icon: LineChart },
    { name: t('nav.control'), href: `/projects/${activeProjectId}/control`, icon: Activity },
    { name: t('nav.reports'), href: `/projects/${activeProjectId}/reports`, icon: FileText }
  ] : []

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <div className="flex min-h-screen" style={{background: 'var(--background)', color: 'var(--text-primary)'}}>
      {/* Sidebar for desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col backdrop-blur-xl transition-all duration-300 ease-in-out md:translate-x-0 ${isCollapsed ? 'md:w-20 w-72' : 'w-72'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{background: 'var(--navy-900)', borderRight: '1px solid var(--border-base)'}}>
        {/* Sidebar brand header */}
        <div className={`flex h-16 items-center transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-between px-6'}`} style={{borderBottom: '1px solid var(--border-base)', background: 'var(--navy-950)'}}>
          {!isCollapsed ? (
            <>
              <Link href="/dashboard" className="flex items-center gap-3 py-1 animate-fade-in">
                <img src="/sibimkonicon.png" alt="Logo" className="h-9 w-9 object-contain" />
                <div className="flex flex-col">
                  <span className="text-sm font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200 leading-tight">
                    SIBIMKON
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-slate-400 leading-none">
                    Link Productive
                  </span>
                </div>
              </Link>
              <button 
                onClick={toggleSidebarCollapse} 
                className="hidden md:block rounded-lg p-1 hover:bg-slate-800 transition-colors" 
                style={{color: 'var(--text-muted)'}}
                title="Sembunyikan Sidebar"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </>
          ) : (
            <div className="w-full flex flex-col items-center justify-center">
              <button 
                onClick={toggleSidebarCollapse} 
                className="rounded-lg p-1.5 hover:bg-slate-800 transition-colors flex items-center justify-center" 
                style={{color: 'var(--text-muted)'}} 
                title="Tampilkan Sidebar"
              >
                <img src="/sibimkonicon.png" alt="Logo" className="h-8 w-8 object-contain animate-fade-in" />
              </button>
            </div>
          )}
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 md:hidden absolute right-4 top-4" style={{color: 'var(--text-muted)'}}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User profile section */}
        <div className={`py-5 transition-all duration-300 ${isCollapsed ? 'px-2 flex justify-center' : 'px-6'}`} style={{borderBottom: '1px solid var(--border-base)', background: 'rgba(10,22,40,0.4)'}}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-bold shadow-md text-sm cursor-pointer" style={{background: 'linear-gradient(135deg, #b8860b, #f4c430)', color: 'var(--navy-950)'}} title={user.full_name}>
              {(user.full_name?.[0] || '?').toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-sm font-semibold truncate" style={{color: 'var(--text-primary)'}}>{user.full_name}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{background: 'rgba(212,160,23,0.12)', color: 'var(--gold-400)', border: '1px solid rgba(212,160,23,0.28)'}}>
                  {(user.role || 'user').replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
          {!isCollapsed && user.organization && (
            <p className="mt-2 text-xs flex items-center gap-1.5 truncate animate-fade-in" style={{color: 'var(--text-muted)'}}>
              <Building className="h-3 w-3 flex-shrink-0" />
              {user.organization}
            </p>
          )}
        </div>

        {/* Sidebar Nav */}
        <nav className={`flex-1 space-y-1 py-4 overflow-y-auto transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {navigation
            .filter(item => !item.roles || item.roles.includes(user.role))
            .map(item => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  style={active ? {
                    background: 'linear-gradient(135deg, rgba(212,160,23,0.18) 0%, rgba(244,196,48,0.08) 100%)',
                    color: 'var(--gold-400)',
                    border: '1px solid rgba(212,160,23,0.35)',
                  } : {
                    color: 'var(--text-muted)',
                    border: '1px solid transparent',
                  }}
                  className={`group relative flex items-center rounded-xl text-sm font-medium transition-all hover:border-gold-hover ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}`}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(212,160,23,0.06)'; } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLAnchorElement).style.background = ''; } }}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                  
                  {/* Tooltip for Collapsed Sidebar */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 border border-[var(--border-base)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl text-[var(--text-primary)]">
                      {item.name}
                    </div>
                  )}
                </Link>
              )
            })}

          {dmaicStages.length > 0 && (
            <div className="mt-6 pt-6" style={{borderTop: '1px solid var(--border-base)'}}>
              {!isCollapsed ? (
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider mb-3 animate-fade-in" style={{color: 'var(--text-muted)', letterSpacing: '0.1em'}}>
                  {t('nav.dmaicTitle')}
                </p>
              ) : (
                <div className="h-px bg-[var(--border-base)] mb-3 mx-2 animate-fade-in" />
              )}
              <div className="space-y-1">
                {dmaicStages.map(stage => {
                  const active = pathname === stage.href
                  return (
                    <Link
                      key={stage.name}
                      href={stage.href}
                      style={active ? {
                        background: 'rgba(212,160,23,0.12)',
                        color: 'var(--gold-400)',
                        border: '1px solid rgba(212,160,23,0.28)',
                      } : {
                        color: 'var(--text-muted)',
                        border: '1px solid transparent',
                      }}
                      className={`group relative flex items-center rounded-xl text-xs font-medium transition-all ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'}`}
                      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(212,160,23,0.06)'; } }}
                      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLAnchorElement).style.background = ''; } }}
                    >
                      <stage.icon className="h-3.5 w-3.5 flex-shrink-0" />
                      {!isCollapsed && <span>{stage.name}</span>}
                      
                      {/* Tooltip for Collapsed Sidebar */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 border border-[var(--border-base)] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl text-[var(--text-primary)]">
                          {stage.name}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer Logout */}
        <div className={`py-4 transition-all duration-300 ${isCollapsed ? 'px-2' : 'p-4'}`} style={{borderTop: '1px solid var(--border-base)', background: 'var(--navy-950)'}}>
          <button
            onClick={handleLogout}
            className={`group relative flex items-center rounded-xl text-sm font-medium transition-all cursor-pointer ${isCollapsed ? 'w-full justify-center p-2.5' : 'w-full gap-3 px-3 py-2.5'}`}
            style={{color: '#f87171'}}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>{t('nav.logout')}</span>}
            
            {/* Tooltip for Collapsed Sidebar */}
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-red-950 border border-red-500/30 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl text-red-400">
                {t('nav.logout')}
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isCollapsed ? 'md:pl-20' : 'md:pl-72'}`}>
        {/* Header bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between px-6 backdrop-blur-md" style={{borderBottom: '1px solid var(--border-base)', background: 'var(--navy-950)', boxShadow: '0 1px 20px rgba(0,0,0,0.30)'}}>
          {/* Menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 md:hidden transition-all"
            style={{color: 'var(--text-muted)'}}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page title context or breadcrumb placeholder */}
          <div className="hidden sm:block">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider" style={{color: 'var(--gold-400)', background: 'rgba(212,160,23,0.10)', border: '1px solid rgba(212,160,23,0.22)'}}>
              {(user.role || 'user').replace('_', ' ')}
            </span>
          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Language Toggle */}
            <div className="flex items-center gap-1 rounded-xl p-1" style={{ border: '1px solid var(--border-base)', background: 'rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setLocale('id')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${locale === 'id' ? 'bg-[rgba(255,255,255,0.12)] text-[var(--gold-400)]' : 'text-[var(--text-muted)] hover:text-white'}`}
              >
                🇮🇩 ID
              </button>
              <button
                onClick={() => setLocale('en')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${locale === 'en' ? 'bg-[rgba(255,255,255,0.12)] text-[var(--gold-400)]' : 'text-[var(--text-muted)] hover:text-white'}`}
              >
                🇬🇧 EN
              </button>
            </div>

            {/* Notification button with dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative rounded-xl p-2 transition-all"
                style={{border: '1px solid var(--border-base)', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)'}}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold-400)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-base)'; }}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{background: 'var(--gold-400)'}}></span>
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{background: 'var(--gold-400)'}}></span>
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl py-2 z-50 backdrop-blur-xl animate-fade-in" style={{border: '1px solid var(--border-base)', background: 'var(--navy-900)', boxShadow: '0 20px 60px rgba(0,0,0,0.50)'}}>
                  <div className="flex items-center justify-between px-4 py-2" style={{borderBottom: '1px solid var(--border-base)'}}>
                    <span className="text-xs font-bold" style={{color: 'var(--text-primary)'}}>{t('header.notifications')} ({unreadCount})</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[10px] font-semibold transition-colors" style={{color: 'var(--gold-400)'}}>
                        {t('header.markRead')}
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto px-2 py-1">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs" style={{color: 'var(--text-muted)'}}>{t('header.noNotifications')}</p>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className="p-3.5 my-1 rounded-xl text-xs transition-all" style={notif.unread ? {background: 'rgba(212,160,23,0.05)', border: '1px solid rgba(212,160,23,0.12)'} : {border: '1px solid transparent'}}>
                          <div className="flex justify-between items-start">
                            <span className="font-semibold" style={{color: 'var(--text-primary)'}}>{notif.title}</span>
                            <span className="text-[9px]" style={{color: 'var(--text-muted)'}}>{notif.time}</span>
                          </div>
                          <p className="mt-1 leading-normal" style={{color: 'var(--text-secondary)'}}>{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile widget */}
            <div className="flex items-center gap-2 pl-4" style={{borderLeft: '1px solid var(--border-base)'}}>
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--gold-400)'}}>
                <User className="h-4 w-4" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold leading-none" style={{color: 'var(--text-primary)'}}>{user.full_name}</p>
                <span className="text-[9px]" style={{color: 'var(--text-muted)'}}>{user.email}</span>
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
