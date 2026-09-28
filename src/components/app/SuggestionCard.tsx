import type { RoleSuggestion } from '../../lib/suggestionApi'
import type { TargetRole } from '../../lib/targetRoleApi'
import { occupationTitle } from '../../lib/occupationTitle'

const money = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 })

// Each factor is capped by its own weight (skill 60, growth 25, education 15),
// so bars and labels both show the percent of that ceiling for a fair compare.
const FACTOR_CEILINGS = { skill: 60, growth: 25, education: 15 } as const

function asPercent(value: number, ceiling: number): number {
  return Math.round((value / ceiling) * 100)
}

type SuggestionCardProps = {
  suggestion: RoleSuggestion
  index: number
  targetRole: TargetRole | null
  busy: boolean
  compact?: boolean
  onPlan: (suggestion: RoleSuggestion) => void
  onReact: (
    suggestion: RoleSuggestion,
    reaction: 'not_for_me' | 'curious' | 'interested',
  ) => void
}

// One match card, shared by the overview strip and the matches page. The
// compact variant trims the reasoning list to two lines for the four-across
// layout; both variants show the same score breakdown bars.
export function SuggestionCard({
  suggestion,
  index,
  targetRole,
  busy,
  compact = false,
  onPlan,
  onReact,
}: SuggestionCardProps) {
  const isTarget = targetRole?.code === suggestion.code
  const badge = isTarget
    ? 'Current target'
    : index === 0
      ? 'Best match'
      : suggestion.change5yPercent !== null && suggestion.change5yPercent >= 8
        ? 'High growth'
        : null

  const reactions = [
    { id: 'not_for_me', label: 'Not for me' },
    { id: 'curious', label: 'Curious' },
    { id: 'interested', label: 'Interested' },
  ] as const

  return (
    <article
      className={isTarget ? 'match-card current' : 'match-card'}
      aria-label={`${occupationTitle(suggestion.title)} match`}
    >
      <div className="match-card-top">
        <span className="match-pill">{suggestion.matchScore}% match</span>
        {badge && <span className="flag-pill">{badge}</span>}
      </div>

      <h3>{occupationTitle(suggestion.title)}</h3>

      <p className="why-title">Why this matches</p>
      <ul className="why-list">
        {(compact
          ? suggestion.reasons.slice(0, 2)
          : suggestion.reasons.slice(0, 3)
        ).map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      <div className="breakdown">
        <p>Match breakdown</p>
        <div className="breakdown-row">
          <span className="breakdown-bar">
            <span
              style={{
                width: `${asPercent(suggestion.factors.skill, FACTOR_CEILINGS.skill)}%`,
              }}
            />
          </span>
          <small>
            Skills {asPercent(suggestion.factors.skill, FACTOR_CEILINGS.skill)}%
          </small>
        </div>
        <div className="breakdown-row">
          <span className="breakdown-bar">
            <span
              className="mid"
              style={{
                width: `${asPercent(suggestion.factors.growth, FACTOR_CEILINGS.growth)}%`,
              }}
            />
          </span>
          <small>
            Growth{' '}
            {asPercent(suggestion.factors.growth, FACTOR_CEILINGS.growth)}%
          </small>
        </div>
        <div className="breakdown-row">
          <span className="breakdown-bar">
            <span
              className="mid"
              style={{
                width: `${asPercent(suggestion.factors.education, FACTOR_CEILINGS.education)}%`,
              }}
            />
          </span>
          <small>
            Education{' '}
            {asPercent(suggestion.factors.education, FACTOR_CEILINGS.education)}
            %
          </small>
        </div>
      </div>

      <div className="match-meta">
        {suggestion.change5yPercent !== null && (
          <span
            className={
              suggestion.change5yPercent >= 2 ? 'growth-pos' : 'growth-flat'
            }
          >
            {suggestion.change5yPercent > 0 ? '+' : ''}
            {Math.round(suggestion.change5yPercent * 10) / 10}% growth
          </span>
        )}
        {suggestion.medianWeeklyEarnings !== null && (
          <span className="match-earn">
            ${money.format(suggestion.medianWeeklyEarnings)}/wk
          </span>
        )}
      </div>

      <button
        type="button"
        className="btn block"
        disabled={busy || isTarget}
        onClick={() => onPlan(suggestion)}
      >
        {busy ? 'Working...' : isTarget ? 'Current target' : 'Plan this role'}
      </button>

      {!compact && (
        <div className="deck-buttons" aria-label="Rate this suggestion">
          {reactions.map((action) => (
            <button
              type="button"
              key={action.id}
              className={
                suggestion.reaction === action.id
                  ? 'deck-btn active'
                  : 'deck-btn'
              }
              disabled={busy}
              onClick={() => onReact(suggestion, action.id)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}
