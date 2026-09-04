import { useEffect, useState } from 'react'
import {
  loadRoleSuggestions,
  sendRoleFeedback,
  type RoleSuggestion,
  type RoleSuggestions,
} from '../lib/suggestionApi'
import type { TargetRole } from '../lib/targetRoleApi'

type CareerSuggestionsProps = {
  profileCode: string
  currentTargetRole: TargetRole | null
  refreshKey: number
  onChooseRole: (suggestion: RoleSuggestion) => void
}

type FeedbackChoice = 'not_for_me' | 'curious' | 'interested'

const feedbackActions: {
  reaction: FeedbackChoice
  label: string
  className: string
}[] = [
  { reaction: 'not_for_me', label: 'Not for me', className: 'secondary' },
  { reaction: 'curious', label: 'Curious', className: 'secondary' },
  { reaction: 'interested', label: 'Interested', className: 'deck-cta' },
]

// The suggestion list is the discovery engine's visible half: every card
// shows its score next to the reasons that produced it.
export function CareerSuggestions({
  profileCode,
  currentTargetRole,
  refreshKey,
  onChooseRole,
}: CareerSuggestionsProps) {
  const [data, setData] = useState<RoleSuggestions | null>(null)
  const [error, setError] = useState('')
  const [busyCode, setBusyCode] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    void loadRoleSuggestions(profileCode, controller.signal)
      .then((result) => {
        if (!result.ok) {
          setError(result.data.error ?? 'Could not load suggestions.')
          return
        }
        setData(result.data)
        setError('')
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError('Could not load suggestions.')
        }
      })

    return () => controller.abort()
  }, [profileCode, refreshKey])

  async function react(suggestion: RoleSuggestion, reaction: FeedbackChoice) {
    setBusyCode(suggestion.code)
    const result = await sendRoleFeedback(
      profileCode,
      suggestion.code,
      reaction,
    )
    if (!result.ok) {
      setError(result.error ?? 'Could not save your reaction.')
      setBusyCode('')
      return
    }
    // Reactions change the ranking, so the list reloads with the new order.
    const refreshed = await loadRoleSuggestions(profileCode)
    if (refreshed.ok) setData(refreshed.data)
    setBusyCode('')
  }

  if (error) {
    return (
      <p className="notice error" role="alert">
        {error}
      </p>
    )
  }

  if (!data) {
    return (
      <p className="requirements-status" role="status">
        Loading career suggestions...
      </p>
    )
  }

  if (data.suggestions.length === 0) {
    return (
      <p className="empty-suggestions">
        {data.hint ?? 'No suggestions are available yet.'}
      </p>
    )
  }

  return (
    <section className="career-suggestions" aria-labelledby="suggestions-title">
      <div className="suggestions-heading">
        <div>
          <p className="eyebrow">Discovery engine</p>
          <h2 id="suggestions-title">Careers suggested for you</h2>
          <p>
            Ranked from your skills, interests and Australian growth data. Every
            score shows its reasons.
          </p>
        </div>
      </div>

      <div className="suggestion-cards">
        {data.suggestions.map((suggestion) => (
          <article
            className={
              currentTargetRole?.code === suggestion.code
                ? 'suggestion-card current'
                : 'suggestion-card'
            }
            key={suggestion.code}
          >
            <div className="suggestion-card-heading">
              <div>
                <span className="match-score">
                  {suggestion.matchScore}% match
                </span>
                <h3>{suggestion.title}</h3>
              </div>
              {currentTargetRole?.code === suggestion.code && (
                <span className="current-flag">Current target</span>
              )}
            </div>

            <ul className="suggestion-reasons">
              {suggestion.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>

            {/* The stacked bar shows what the score is actually made of. */}
            <div
              className="factor-bar"
              role="img"
              aria-label={`Score made of skills ${suggestion.factors.skill}, growth ${suggestion.factors.growth}, education ${suggestion.factors.education} points`}
            >
              <span
                className="factor-skill"
                style={{ width: `${suggestion.factors.skill}%` }}
              />
              <span
                className="factor-growth"
                style={{ width: `${suggestion.factors.growth}%` }}
              />
              <span
                className="factor-education"
                style={{ width: `${suggestion.factors.education}%` }}
              />
            </div>
            <div className="factor-legend">
              <span>Skills {suggestion.factors.skill}</span>
              <span>Growth {suggestion.factors.growth}</span>
              <span>Education {suggestion.factors.education}</span>
            </div>

            <div className="suggestion-actions">
              <button
                type="button"
                disabled={busyCode === suggestion.code}
                onClick={() => onChooseRole(suggestion)}
              >
                {busyCode === suggestion.code ? 'Working...' : 'Plan this role'}
              </button>
              <div className="deck-buttons" aria-label="Rate this suggestion">
                {feedbackActions.map((action) => (
                  <button
                    type="button"
                    key={action.reaction}
                    className={
                      suggestion.reaction === action.reaction
                        ? `${action.className} active`
                        : action.className
                    }
                    disabled={busyCode === suggestion.code}
                    onClick={() => void react(suggestion, action.reaction)}
                    aria-label={`${action.label}: ${suggestion.title}`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
