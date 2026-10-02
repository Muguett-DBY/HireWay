import { useLocalizedText } from '../lib/useLocalizedText'
import { useI18n } from '../lib/useI18n'
import { catalogueIsTranslated } from '../lib/catalogueTranslation'

export function LocalizedText({ text }: { text: string | null | undefined }) {
  const source = text ?? ''
  const translated = useLocalizedText(source)
  const { lang } = useI18n()
  return (
    <span lang={catalogueIsTranslated(source, lang) ? undefined : 'en'}>
      {translated}
    </span>
  )
}
