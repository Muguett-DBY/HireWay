import { LANGUAGES, type Lang } from '../lib/i18n'
import { useI18n } from '../lib/useI18n'

// Compact switcher in the site header. Labels stay in their own language
// (English / Español / 中文 / 日本語) so speakers can always find theirs.
export function LanguageSwitcher() {
  const { lang, setLang } = useI18n()
  return (
    <div
      className="lang-switcher"
      role="group"
      aria-label="Language / 语言 / Idioma"
    >
      {LANGUAGES.map((entry) => (
        <button
          key={entry.code}
          type="button"
          className={entry.code === lang ? 'lang-option active' : 'lang-option'}
          aria-pressed={entry.code === lang}
          onClick={() => setLang(entry.code as Lang)}
        >
          {entry.label}
        </button>
      ))}
    </div>
  )
}
