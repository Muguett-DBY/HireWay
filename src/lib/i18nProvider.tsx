import type { ReactNode } from 'react'
import { TranslationStatus } from '../components/TranslationStatus'

// Keeps the i18next language in sync for the whole tree. Language changes
// go through useI18n's setLang, which calls i18next directly.
export function LanguageProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <TranslationStatus />
    </>
  )
}
