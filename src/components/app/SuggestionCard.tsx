import type { RoleSuggestion } from '../../lib/suggestionApi'
import type { TargetRole } from '../../lib/targetRoleApi'
import { occupationTitle } from '../../lib/occupationTitle'
import { factorPercents } from '../../lib/factorDisplay'
import { useI18n } from '../../lib/useI18n'
import { formatAud } from '../../lib/currency'

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
  const { t, lang } = useI18n()
  const percents = factorPercents(suggestion.factors)
  const isTarget = targetRole?.code === suggestion.code
  const badge = isTarget
    ? t('card.currentTarget')
    : index === 0
      ? t('card.badge.best')
      : suggestion.change5yPercent !== null && suggestion.change5yPercent >= 8
        ? t('card.badge.highGrowth')
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

      <p className="why-title">{t('card.why')}</p>
      <ul className="why-list">
        {(compact
          ? suggestion.reasons.slice(0, 2)
          : suggestion.reasons.slice(0, 3)
        ).map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      <div className="breakdown">
        <p>{t('card.breakdown')}</p>
        <div className="breakdown-row">
          <span className="breakdown-bar">
            <span style={{ width: `${percents.skill}%` }} />
          </span>
          <small>
            {t('card.skills')} {percents.skill}%
          </small>
        </div>
        <div className="breakdown-row">
          <span className="breakdown-bar">
            <span className="mid" style={{ width: `${percents.growth}%` }} />
          </span>
          <small>
            {t('card.growth')} {percents.growth}%
          </small>
        </div>
        <div className="breakdown-row">
          <span className="breakdown-bar">
            <span className="mid" style={{ width: `${percents.education}%` }} />
          </span>
          <small>
            {t('card.education')} {percents.education}%
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
            {t('money.perWeek', {
              amount: formatAud(suggestion.medianWeeklyEarnings, lang),
            })}
          </span>
        )}
      </div>

      <button
        type="button"
        className="btn block"
        disabled={busy || isTarget}
        onClick={() => onPlan(suggestion)}
      >
        {busy
          ? t('card.working')
          : isTarget
            ? t('card.currentTarget')
            : t('card.plan')}
      </button>
    </article>
  )
}
