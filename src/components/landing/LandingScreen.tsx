import { type FormEvent } from 'react'

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

// The landing screen fits one viewport: returning users enter their code,
// new users start the wizard, nothing else competes for attention.
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
  return (
    <div className="landing">
      <section className="landing-hero">
        <h1>Start Your Career Journey</h1>
        <p>
          HireWay helps you continue your journey or create a new profile to
          explore opportunities and grow your career.
        </p>
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
          <h2>Enter Previous Code</h2>
          <p className="entry-text">
            Continue from where you left off using your previous code.
          </p>

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
            placeholder="Enter your code"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            aria-label="Recovery code"
          />
          <button className="btn block" disabled={busy}>
            {busy ? 'Loading...' : 'Continue'}
          </button>
        </form>

        <div className="entry-card">
          <span className="entry-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
          </span>
          <h2>Create Personal Profile</h2>
          <p className="entry-text">
            Create a new profile to get personalized insights and grow your
            career.
          </p>
          {hasProfile && (
            <button className="btn ghost block" onClick={onOpenProfile}>
              Open my dashboard
            </button>
          )}
          <button className="btn ghost block" onClick={onStart}>
            Get Started
          </button>
        </div>
      </div>

      <p className="landing-note">
        Your data is secure and private. We're here to support your growth.
      </p>
    </div>
  )
}
