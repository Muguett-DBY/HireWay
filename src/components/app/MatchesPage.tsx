import type { RoleSuggestion } from '../../lib/suggestionApi'
import type { TargetRole } from '../../lib/targetRoleApi'
import { SuggestionCard } from './SuggestionCard'

type MatchesPageProps = {
  suggestions: RoleSuggestion[]
  targetRole: TargetRole | null
  hint: string | null
  busy: boolean
  onPlan: (suggestion: RoleSuggestion) => void
  onReact: (
    suggestion: RoleSuggestion,
    reaction: 'not_for_me' | 'curious' | 'interested',
  ) => void
}

// The matches page is the full discovery list. Cards rank by the engine and
// every reaction reshuffles the next load, so the page never filters or
// sorts locally - it simply renders what the ranking produced.
export function MatchesPage({
  suggestions,
  targetRole,
  hint,
  busy,
  onPlan,
  onReact,
}: MatchesPageProps) {
  return (
    <>
      <section className="app-hero">
        <p className="eyebrow">Career discovery</p>
        <h1>Career matches for you</h1>
        <p className="app-hero-sub">
          Roles ranked by your skills and Australian labour market data. Every
          score shows why the role may fit you.
        </p>
        {targetRole && (
          <p className="target-line">
            Current target: <strong>{targetRole.title}</strong>
          </p>
        )}
      </section>

      {suggestions.length > 0 ? (
        <>
          <p className="section-sub match-count">
            {suggestions.length} careers matched, based on your current profile
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
                onReact={onReact}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="empty-note">
          {hint ?? 'No suggestions are available yet.'}
        </p>
      )}
    </>
  )
}
