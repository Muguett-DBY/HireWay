import { useI18n } from '../lib/useI18n'
import { catalogueStatus, retryCatalogue } from '../lib/catalogueTranslation'

export function TranslationStatus() {
  const { lang, t } = useI18n()
  const status = catalogueStatus(lang)
  if (
    lang === 'en' ||
    (!status.pending && !status.failed && !status.untranslated)
  )
    return null
  return (
    <aside className="translation-notice" aria-live="polite" role="status">
      <span>
        {t(
          status.pending
            ? 'catalogue.translating'
            : status.failed
              ? 'catalogue.failed'
              : 'catalogue.notice',
        )}
      </span>
      {!status.pending && status.failed > 0 && (
        <button
          type="button"
          className="link-btn"
          onClick={() => retryCatalogue(lang)}
        >
          {t('catalogue.retry')}
        </button>
      )}
    </aside>
  )
}
