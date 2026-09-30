import type { RoleSuggestion } from '../../lib/suggestionApi'
import type { TargetRole } from '../../lib/targetRoleApi'
import { occupationTitle } from '../../lib/occupationTitle'
import { factorPercents } from '../../lib/factorDisplay'

const money = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 })

type SuggestionCardProps = {
  suggestion: RoleSuggestion
  index: number
  targetRole: TargetRole | null
  busy: boolean
  compact?: boolean
  onPlan: (suggestion: RoleSuggestion) => void
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
}: SuggestionCardProps) {
  const percents = factorPercents(suggestion.factors)
  const isTarget = targetRole?.code === suggestion.code
  const badge = isTarget
    ? 'Current target'
    : index === 0
      ? 'Best match'
      : suggestion.change5yPercent !== null && suggestion.change5yPercent >= 8
        ? 'High growth'
        : null

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
            <span style={{ width: `${percents.skill}%` }} />
          </span>
          <small>Skills {percents.skill}%</small>
        </div>
        <div className="breakdown-row">
          <span className="breakdown-bar">
            <span className="mid" style={{ width: `${percents.growth}%` }} />
          </span>
          <small>Growth {percents.growth}%</small>
        </div>
        <div className="breakdown-row">
          <span className="breakdown-bar">
            <span className="mid" style={{ width: `${percents.education}%` }} />
          </span>
          <small>Education {percents.education}%</small>
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
    </article>
  )
}
