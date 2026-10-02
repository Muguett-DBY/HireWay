import { useEffect } from 'react'
import { useI18n } from './useI18n'
import { observeCatalogueText } from './catalogueTranslation'

// Only call for public catalogue fields, never recovery codes or free-form input.
export function useLocalizedText(text: string): string {
  const { lang, name } = useI18n()
  useEffect(() => observeCatalogueText(text, lang), [text, lang])
  return name(text)
}
