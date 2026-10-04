import { type FormEvent } from 'react'
import { useI18n } from '../../lib/useI18n'

type LandingScreenProps = {
  recoveryCode: string
  busy: boolean
  message: string
  failed: boolean
  hasProfile: boolean
  onCodeChange: (value: string) => void
  onContinue: (event: FormEvent<HTMLFormElement>) => void
  onStart: () => void
  onOpenProfile: () => void
}

// Entry screen with two cards: returning users enter their recovery code,
// new users start the wizard.
export function LandingScreen({
  recoveryCode,
  busy,
  message,
  failed,
  hasProfile,
  onCodeChange,
  onContinue,
  onStart,
  onOpenProfile,
}: LandingScreenProps) {
  const { t } = useI18n()
  return (
    <div className="landing">
      <section className="landing-hero">
        <h1>{t('entry.title')}</h1>
        <p>{t('entry.sub')}</p>
      </section>

      <div className="entry-grid">
        <form className="entry-card" onSubmit={onContinue} noValidate>
          <span className="entry-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <path d="m10 17 5-5-5-5" />
              <path d="M15 12H3" />
            </svg>
          </span>
          <h2>{t('entry.codeTitle')}</h2>
          <p className="entry-text">{t('entry.codeText')}</p>

          {message && (
            <p
              className={failed ? 'notice error' : 'notice success'}
              role={failed ? 'alert' : 'status'}
            >
              {message}
            </p>
          )}

          <input
            className="code-input"
            value={recoveryCode}
            onChange={(event) => onCodeChange(event.target.value)}
            placeholder={t('entry.codePlaceholder')}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            aria-label={t('entry.codeLabel')}
          />
          <button className="btn block" disabled={busy}>
            {busy ? t('entry.loading') : t('entry.continue')}
          </button>
        </form>

        <div className="entry-card">
          <span className="entry-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
          </span>
          <h2>{t('entry.createTitle')}</h2>
          <p className="entry-text">{t('entry.createText')}</p>
          {hasProfile && (
            <button className="btn ghost block" onClick={onOpenProfile}>
              {t('entry.dashboard')}
            </button>
          )}
          <button className="btn ghost block" onClick={onStart}>
            {t('entry.start')}
          </button>
        </div>
      </div>

      <p className="landing-note">{t('entry.note')}</p>
    </div>
  )
}
