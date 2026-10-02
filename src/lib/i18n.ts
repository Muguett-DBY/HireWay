import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from '../locales/en'
import { es } from '../locales/es'
import { zh } from '../locales/zh'
import { ja } from '../locales/ja'
import { profileMessages } from '../locales/profileMessages'
import { workspaceMessages } from '../locales/workspaceMessages'
import { catalogueMessages } from '../locales/catalogueMessages'

export type Lang = 'en' | 'es' | 'zh' | 'ja'

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
]

const LANG_KEY = 'hireway.lang'

function savedLanguage(): Lang {
  try {
    const saved = window.localStorage.getItem(LANG_KEY) as Lang | null
    if (saved && ['en', 'es', 'zh', 'ja'].includes(saved)) return saved
  } catch {
    // private mode: keep the default
  }
  return 'en'
}

// Flat dot keys ("nav.overview") feed i18next's resource format as-is.
export const resources = {
  en: {
    translation: {
      ...en,
      ...profileMessages.en,
      ...workspaceMessages.en,
      ...catalogueMessages.en,
    },
  },
  es: {
    translation: {
      ...es,
      ...profileMessages.es,
      ...workspaceMessages.es,
      ...catalogueMessages.es,
    },
  },
  zh: {
    translation: {
      ...zh,
      ...profileMessages.zh,
      ...workspaceMessages.zh,
      ...catalogueMessages.zh,
    },
  },
  ja: {
    translation: {
      ...ja,
      ...profileMessages.ja,
      ...workspaceMessages.ja,
      ...catalogueMessages.ja,
    },
  },
}

export type TranslationKey = keyof typeof resources.en.translation
export function isTranslationKey(value: string): value is TranslationKey {
  return Object.hasOwn(resources.en.translation, value)
}
export const localeByLanguage = {
  en: 'en-AU',
  zh: 'zh-CN',
  es: 'es-ES',
  ja: 'ja-JP',
} as const

function updateDocumentLanguage(language: string) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = language === 'zh' ? 'zh-Hans' : language
}
i18next.on('languageChanged', updateDocumentLanguage)

void i18next.use(initReactI18next).init({
  resources,
  lng: savedLanguage(),
  fallbackLng: 'en',
  keySeparator: false,
  // React already escapes text; interpolation stays raw. Suspension stays
  // off: the tree has no Suspense boundary, and resources are bundled, so
  // there is nothing to wait for anyway.
  interpolation: { escapeValue: false, prefix: '{', suffix: '}' },
  react: { useSuspense: false },
})

export function changeLanguage(lang: Lang) {
  try {
    window.localStorage.setItem(LANG_KEY, lang)
  } catch {
    // private mode: language stays for this session only
  }
  void i18next.changeLanguage(lang)
}
