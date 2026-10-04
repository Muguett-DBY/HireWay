import { SpecularButton } from '../SpecularButton'
import { useI18n } from '../../lib/useI18n'

type MarketingLandingProps = {
  onEnterProfile: () => void
}

// The public landing page explains HireWay; profile access stays on the
// separate entry screen so first-time visitors are not shown forms.
export function MarketingLanding({ onEnterProfile }: MarketingLandingProps) {
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
              onClick={onEnterProfile}
            >
              {t('landing.cta')}
            </SpecularButton>
            <a className="marketing-text-link" href="#how-it-works">
              {t('landing.how')}
            </a>
          </div>

          <ul className="marketing-hero-points" aria-label="HireWay benefits">
            <li>{t('landing.benefits.1')}</li>
            <li>{t('landing.benefits.2')}</li>
            <li>{t('landing.benefits.3')}</li>
          </ul>
        </div>

        <div
          className="marketing-pathway-preview"
          aria-label="Career pathway preview"
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
            <span>Statistics</span>
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
