
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Lang } from '@/lib/i18n'
import { translations } from '@/lib/i18n'

type AppContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  t: (key: string) => string
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('ar')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const value = useMemo<AppContextValue>(
    () => ({
      lang,
      setLang,
      theme,
      setTheme,
      t: (key: string) => translations[lang][key] ?? key,
    }),
    [lang, theme],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProviders')
  return ctx
}
