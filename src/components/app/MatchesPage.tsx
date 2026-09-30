import type { RoleSuggestion } from '../../lib/suggestionApi'
import type { TargetRole } from '../../lib/targetRoleApi'
import { occupationTitle } from '../../lib/occupationTitle'
import { useI18n } from '../../lib/useI18n'
import { SuggestionCard } from './SuggestionCard'

type MatchesPageProps = {
  suggestions: RoleSuggestion[]
  targetRole: TargetRole | null
  hint: string | null
  skillsCount: number
  busy: boolean
  onPlan: (suggestion: RoleSuggestion) => void
}

// The matches page is the full discovery list. Cards rank by the engine, so
// the page never filters or sorts locally - it simply renders what the
// ranking produced.
export function MatchesPage({
  suggestions,
  targetRole,
  hint,
  skillsCount,
  busy,
  onPlan,
}: MatchesPageProps) {
  const { t } = useI18n()
  // With a thin profile the ranking leans on market data, so say so instead
  // of letting lookalike cards imply a precision the engine cannot have.
  const thinHint = skillsCount < 3 ? t('matches.hint.thin') : null
  return (
    <>
      <section className="app-hero">
        <p className="eyebrow">{t('matches.eyebrow')}</p>
        <h1>{t('matches.h1')}</h1>
        <p className="app-hero-sub">{t('matches.sub')}</p>
        {targetRole && (
          <p className="target-line">
            {t('matches.target')}{' '}
            <strong>{occupationTitle(targetRole.title)}</strong>
          </p>
        )}
      </section>

      {suggestions.length > 0 ? (
        <div className="matches-results">
          <p className="section-sub match-count">
            {t('matches.count', { n: suggestions.length })}
          </p>
          <div className="match-grid">
            {suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.code}
                suggestion={suggestion}
                index={index}
                targetRole={targetRole}
                busy={busy}
                onPlan={onPlan}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="empty-note">{hint ?? thinHint ?? t('matches.empty')}</p>
      )}
    </>
  )
}
