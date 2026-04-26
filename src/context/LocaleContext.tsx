"use client"

import * as React from "react"
import { Locale, TRANSLATIONS, TranslationModule } from "@/lib/translations"

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslationModule
  isRtl: boolean
}

const LocaleContext = React.createContext<LocaleContextType | undefined>(undefined)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = React.useState<Locale>('fr')

  const value = React.useMemo(() => ({
    locale,
    setLocale,
    t: TRANSLATIONS[locale],
    isRtl: locale === 'ar'
  }), [locale])

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = React.useContext(LocaleContext)
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}
