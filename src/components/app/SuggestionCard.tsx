import type { RoleSuggestion } from '../../lib/suggestionApi'
import type { TargetRole } from '../../lib/targetRoleApi'
import { occupationTitle } from '../../lib/occupationTitle'
import { factorPercents } from '../../lib/factorDisplay'
import { useI18n } from '../../lib/useI18n'
import { useLocalizedText } from '../../lib/useLocalizedText'
import { RecommendationReasons } from './RecommendationReasons'

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
  const { t, number } = useI18n()
  const title = useLocalizedText(occupationTitle(suggestion.title))
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
      aria-label={t('workspace.matchAria', { role: title })}
    >
      <div className="match-card-top">
        <span className="match-pill">
          {t('workspace.match', { n: suggestion.matchScore })}
        </span>
        {badge && <span className="flag-pill">{badge}</span>}
      </div>

      <h3>{title}</h3>

      <p className="why-title">{t('card.why')}</p>
      <RecommendationReasons suggestion={suggestion} limit={compact ? 2 : 3} />

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
            {t('workspace.growth', {
              n: `${suggestion.change5yPercent > 0 ? '+' : ''}${number(suggestion.change5yPercent, 1)}`,
            })}
          </span>
        )}
        {suggestion.medianWeeklyEarnings !== null && (
          <span className="match-earn">
            {t('workspace.weeklyPay', {
              n: number(suggestion.medianWeeklyEarnings),
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
