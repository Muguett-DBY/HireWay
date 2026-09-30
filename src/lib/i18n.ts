import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from '../locales/en'
import { es } from '../locales/es'
import { zh } from '../locales/zh'
import { ja } from '../locales/ja'

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
  en: { translation: en },
  es: { translation: es },
  zh: { translation: zh },
  ja: { translation: ja },
}

void i18next.use(initReactI18next).init({
  resources,
  lng: savedLanguage(),
  fallbackLng: 'en',
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
