import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide'
import { MorphIcon } from 'morphicons/react'
import { LANGUAGES, type Lang } from '../lib/i18n'
import { useI18n } from '../lib/useI18n'

// Compact dropdown in the site header. Labels stay in their own language
// (English / Español / 中文 / 日本語) so speakers can always find theirs.
export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', closeOnOutsidePointer)
    return () =>
      window.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [])

  const current = LANGUAGES.find((entry) => entry.code === lang)

  return (
    <div className="lang-switcher" ref={wrapRef}>
      <button
        type="button"
        className="lang-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((open) => !open)}
      >
        {current?.label ?? t('profileUi.language')}
        <MorphIcon
          icon={ChevronDown}
          size={14}
          strokeWidth={2}
          spring="snappy"
          reducedMotion="user"
          style={{
            transform: open ? 'rotate(180deg)' : undefined,
            transition: 'transform 150ms ease',
          }}
        />
      </button>
      {open && (
        <ul
          className="lang-menu"
          role="listbox"
          aria-label={t('profileUi.language')}
        >
          {LANGUAGES.map((entry) => (
            <li key={entry.code} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={entry.code === lang}
                className={
                  entry.code === lang ? 'lang-option active' : 'lang-option'
                }
                onClick={() => {
                  setLang(entry.code as Lang)
                  setOpen(false)
                }}
              >
                {entry.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
