import { SpecularButton } from '../SpecularButton'

type MarketingLandingProps = {
  onEnterProfile: () => void
}

// The public landing page explains HireWay; profile access remains on the
// separate entry screen so first-time visitors are not presented with forms.
export function MarketingLanding({ onEnterProfile }: MarketingLandingProps) {
  return (
    <div className="marketing-landing">
      <section className="marketing-hero" aria-labelledby="hero-title">
        <div className="marketing-hero-copy">
          <p className="marketing-eyebrow">Career planning, made clearer</p>
          <h1 id="hero-title">
            Turn what you know into a career path you can act on.
          </h1>
          <p className="marketing-hero-summary">
            HireWay brings your education and current skills together, then
            shows the Australian outlook behind the careers that suit you.
          </p>

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
              Build my profile
            </SpecularButton>
            <a className="marketing-text-link" href="#how-it-works">
              See how it works
            </a>
          </div>

          <ul className="marketing-hero-points" aria-label="HireWay benefits">
            <li>No account required</li>
            <li>Private recovery code</li>
            <li>Data-informed direction</li>
          </ul>
        </div>

        <div
          className="marketing-pathway-preview"
          aria-label="Career pathway preview"
        >
          <div className="marketing-preview-heading">
            <div>
              <span className="marketing-preview-kicker">Your pathway</span>
              <strong>Data Analyst</strong>
            </div>
            <span className="marketing-preview-status">Building</span>
          </div>

          <div className="marketing-preview-progress" aria-hidden="true">
            <span />
          </div>

          <div className="marketing-preview-grid">
            <article>
              <span>Background</span>
              <strong>Data Science</strong>
              <small>Profile saved</small>
            </article>
            <article>
              <span>Current skills</span>
              <strong>4 added</strong>
              <small>Ready to compare</small>
            </article>
          </div>

          <div className="marketing-preview-skills">
            <span>Python</span>
            <span>SQL</span>
            <span>Statistics</span>
            <span className="skill-gap">+ Skill gaps</span>
          </div>
        </div>
      </section>

      <section
        className="marketing-how-it-works"
        id="how-it-works"
        aria-labelledby="steps-title"
      >
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">How it works</p>
          <h2 id="steps-title">A clearer direction in three steps</h2>
          <p>
            Start with what you already know. HireWay keeps the process simple
            and gives each detail a purpose.
          </p>
        </div>

        <div className="marketing-steps-grid">
          <article className="marketing-step-card">
            <span>01</span>
            <h3>Share your background</h3>
            <p>Add your education and current role to set a starting point.</p>
          </article>
          <article className="marketing-step-card">
            <span>02</span>
            <h3>Map your skills</h3>
            <p>Record the tools and strengths you can already bring to work.</p>
          </article>
          <article className="marketing-step-card">
            <span>03</span>
            <h3>Choose a direction</h3>
            <p>Pick a target role and see the demand behind it.</p>
          </article>
        </div>
      </section>
    </div>
  )
}
