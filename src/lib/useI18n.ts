import { useTranslation } from 'react-i18next'
import { useSyncExternalStore } from 'react'
import {
  changeLanguage,
  localeByLanguage,
  type Lang,
  type TranslationKey,
} from './i18n'
import {
  catalogueText,
  catalogueVersion,
  subscribeCatalogue,
} from './catalogueTranslation'

// Accessor for the translated strings: t('key', { var: value }) with the
// active language applied and English as the fallback.
export function useI18n() {
  const { t, i18n } = useTranslation()
  useSyncExternalStore(subscribeCatalogue, catalogueVersion, () => 0)
  const lang = (i18n.language?.split('-')[0] ?? 'en') as Lang
  const locale = localeByLanguage[lang] ?? 'en-AU'
  return {
    lang,
    locale,
    name: (text: string) => catalogueText(text, lang),
    number: (value: number, maximumFractionDigits = 0) =>
      new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value),
    setLang: changeLanguage,
    t: t as (
      key: TranslationKey,
      vars?: Record<string, string | number>,
    ) => string,
  }
}
