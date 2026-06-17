'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import id from './translations/id'
import en from './translations/en'

type Locale = 'id' | 'en'

const translations = {
  id,
  en,
}

interface LanguageContextProps {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined)

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('id')

  useEffect(() => {
    const savedLang = localStorage.getItem('sibimkon_lang') as Locale
    if (savedLang === 'id' || savedLang === 'en') {
      setLocaleState(savedLang)
      document.documentElement.lang = savedLang
    } else {
      document.documentElement.lang = 'id'
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('sibimkon_lang', newLocale)
    document.documentElement.lang = newLocale
  }

  // Helper to translate dot-notated string paths (e.g. 'nav.dashboard')
  const t = (path: string): string => {
    const keys = path.split('.')
    let current: any = translations[locale]

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        // Fallback to Indonesian if translation doesn't exist in current locale
        let fallback: any = id
        for (const fKey of keys) {
          if (fallback && typeof fallback === 'object' && fKey in fallback) {
            fallback = fallback[fKey]
          } else {
            fallback = null
            break
          }
        }
        return typeof fallback === 'string' ? fallback : path
      }
    }

    return typeof current === 'string' ? current : path
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
