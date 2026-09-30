import { useTranslation } from 'react-i18next'
import { changeLanguage, type Lang } from './i18n'

// Accessor for the translated strings: t('key', { var: value }) with the
// active language applied and English as the fallback.
export function useI18n() {
  const { t, i18n } = useTranslation()
  return {
    lang: (i18n.language?.split('-')[0] ?? 'en') as Lang,
    setLang: changeLanguage,
    t: t as (key: string, vars?: Record<string, string | number>) => string,
  }
}
