import { type FormEvent } from 'react'
import { SpecularButton } from '../SpecularButton'
import { useI18n } from '../../lib/useI18n'
import { localizeMessage } from '../../lib/localizedErrors'

type MarketingLandingProps = {
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

// The single landing page: it sells the idea and carries the entry form, so
// new and returning users both start from one screen.
export function MarketingLanding({
  recoveryCode,
  busy,
  message,
  failed,
  hasProfile,
  onCodeChange,
  onContinue,
  onStart,
  onOpenProfile,
}: MarketingLandingProps) {
  const { t } = useI18n()
  return (
    <div className="marketing-landing">
      <section className="marketing-hero" aria-labelledby="hero-title">
        <div className="marketing-hero-copy">
          <p className="marketing-eyebrow">{t('landing.eyebrow')}</p>
          <h1 id="hero-title">{t('landing.title')}</h1>
          <p className="marketing-hero-summary">{t('landing.summary')}</p>

          <div className="marketing-hero-actions">
            <SpecularButton
              size="lg"
              radius={9}
              tint="#ffffff"
              tintOpacity={0}
              textColor="#ffffff"
              lineColor="#ffffff"
              baseColor="#167451"
              intensity={1.4}
              shineSize={16}
              shineFade={26}
              thickness={2.2}
              speed={0.3}
              proximity={280}
              onClick={onStart}
            >
              {t('landing.cta')}
            </SpecularButton>
            <a className="marketing-text-link" href="#how-it-works">
              {t('landing.how')}
            </a>
          </div>

          <ul
            className="marketing-hero-points"
            aria-label={t('profileUi.benefitsAria')}
          >
            <li>{t('landing.benefits.1')}</li>
            <li>{t('landing.benefits.2')}</li>
            <li>{t('landing.benefits.3')}</li>
          </ul>

          <form className="marketing-return" onSubmit={onContinue} noValidate>
            <span className="marketing-return-label" id="return-label">
              {t('entry.comingBack')}
            </span>
            <input
              className="code-input"
              value={recoveryCode}
              onChange={(event) => onCodeChange(event.target.value)}
              placeholder={t('entry.codePlaceholder')}
              aria-labelledby="return-label"
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
            />
            <button className="btn ghost" disabled={busy}>
              {busy ? t('entry.loading') : t('entry.continue')}
            </button>
            {hasProfile && (
              <button
                type="button"
                className="marketing-return-link"
                onClick={onOpenProfile}
              >
                {t('profileUi.openDashboard')}
              </button>
            )}
          </form>
          {message && (
            <p
              className={
                failed
                  ? 'notice error marketing-return-message'
                  : 'notice success marketing-return-message'
              }
              role={failed ? 'alert' : 'status'}
            >
              {localizeMessage(message, t)}
            </p>
          )}
        </div>

        <div
          className="marketing-pathway-preview"
          aria-label={t('profileUi.previewAria')}
        >
          <div className="marketing-preview-heading">
            <div>
              <span className="marketing-preview-kicker">
                {t('landing.preview.kicker')}
              </span>
              <strong>{t('landing.preview.role')}</strong>
            </div>
            <span className="marketing-preview-status">
              {t('landing.preview.status')}
            </span>
          </div>

          <div className="marketing-preview-progress" aria-hidden="true">
            <span />
          </div>

          <div className="marketing-preview-grid">
            <article>
              <span>{t('landing.preview.background')}</span>
              <strong>{t('landing.preview.backgroundValue')}</strong>
              <small>{t('landing.preview.saved')}</small>
            </article>
            <article>
              <span>{t('landing.preview.skills')}</span>
              <strong>{t('landing.preview.skillsValue')}</strong>
              <small>{t('landing.preview.ready')}</small>
            </article>
          </div>

          <div className="marketing-preview-skills">
            <span>Python</span>
            <span>SQL</span>
            <span>{t('profileUi.statistics')}</span>
            <span className="skill-gap">{t('landing.preview.gaps')}</span>
          </div>
        </div>
      </section>

      <section
        className="marketing-how-it-works"
        id="how-it-works"
        aria-labelledby="steps-title"
      >
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">{t('landing.how.eyebrow')}</p>
          <h2 id="steps-title">{t('landing.how.title')}</h2>
          <p>{t('landing.how.sub')}</p>
        </div>

        <div className="marketing-steps-grid">
          <article className="marketing-step-card">
            <span>01</span>
            <h3>{t('landing.how.s1.title')}</h3>
            <p>{t('landing.how.s1.text')}</p>
          </article>
          <article className="marketing-step-card">
            <span>02</span>
            <h3>{t('landing.how.s2.title')}</h3>
            <p>{t('landing.how.s2.text')}</p>
          </article>
          <article className="marketing-step-card">
            <span>03</span>
            <h3>{t('landing.how.s3.title')}</h3>
            <p>{t('landing.how.s3.text')}</p>
          </article>
        </div>
      </section>
    </div>
  )
}
