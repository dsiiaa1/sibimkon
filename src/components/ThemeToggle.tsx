"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div 
        className="flex h-8 w-8 items-center justify-center rounded-xl"
        style={{ border: '1px solid var(--border-base)', background: 'rgba(255,255,255,0.06)' }}
      />
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="flex h-8 w-8 items-center justify-center rounded-xl transition-all"
      style={{ 
        border: '1px solid var(--border-base)', 
        background: 'rgba(255,255,255,0.06)', 
        color: 'var(--text-muted)' 
      }}
      title="Toggle Theme"
      onMouseEnter={e => { 
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold-400)'; 
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)'; 
      }}
      onMouseLeave={e => { 
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; 
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-base)'; 
      }}
    >
      {theme === "light" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
