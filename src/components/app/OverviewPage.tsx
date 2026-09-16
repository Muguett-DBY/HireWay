import type { RoleRequirements as RequirementsData } from '../../lib/roleRequirementsApi'
import type { Profile } from '../../lib/profileApi'
import type { RoleSuggestion } from '../../lib/suggestionApi'
import type { Skill } from '../../lib/skillsApi'
import type { TargetRole } from '../../lib/targetRoleApi'
import { SuggestionCard } from './SuggestionCard'

const numberFormat = new Intl.NumberFormat('en-AU', {
  maximumFractionDigits: 0,
})

type OverviewPageProps = {
  profile: Profile
  skills: Skill[]
  targetRole: TargetRole | null
  suggestions: RoleSuggestion[]
  requirements: RequirementsData | null
  busy: boolean
  onEditTargetRole: () => void
  onPlan: (suggestion: RoleSuggestion) => void
  onGoMatches: () => void
  onGoWizard: () => void
}

// The overview is the landing spot after login: one target-role hero, one
// stat strip fed by the market tables, the profile snapshot and the top
// career matches. Everything deeper lives on its own tab.
export function OverviewPage({
  profile,
  skills,
  targetRole,
  suggestions,
  requirements,
  busy,
  onEditTargetRole,
  onPlan,
  onGoMatches,
  onGoWizard,
}: OverviewPageProps) {
  const targetSuggestion = suggestions.find(
    (item) => item.code === targetRole?.code,
  )
  const market = requirements?.market ?? null
  const vacancyTotal = market
    ? market.vacancies.reduce((total, entry) => total + entry.vacancies, 0)
    : null

  const stats = [
    {
      label: 'Match score',
      value: targetSuggestion ? `${targetSuggestion.matchScore}%` : null,
    },
    {
      label: 'Projected growth (5 years)',
      value:
        market?.change5yPercent !== null &&
        market?.change5yPercent !== undefined
          ? `${market.change5yPercent > 0 ? '+' : ''}${Math.round(market.change5yPercent * 10) / 10}%`
          : null,
    },
    {
      label: 'Median weekly earnings',
      value:
        market?.medianWeeklyEarnings != null
          ? `$${numberFormat.format(market.medianWeeklyEarnings)}`
          : null,
    },
    {
      label: 'Current vacancies',
      value:
        vacancyTotal !== null && !Number.isNaN(vacancyTotal)
          ? numberFormat.format(Math.round(vacancyTotal))
          : null,
    },
  ]

  return (
    <>
      <section className="app-hero">
        <p className="eyebrow">Your target role</p>
        <h1>{targetRole?.title ?? 'Choose your target role'}</h1>
        <p className="app-hero-sub">
          {targetRole?.description ||
            'Search the Australian occupation catalogue to pick a direction.'}
        </p>
        <div className="hero-actions">
          <button type="button" className="btn" onClick={onEditTargetRole}>
            {targetRole ? 'Edit target role' : 'Choose target role'}
          </button>
          <button type="button" className="btn ghost" onClick={onGoMatches}>
            Explore matches →
          </button>
        </div>
      </section>

      <div className="stat-strip">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <strong>{stat.value ?? '—'}</strong>
            <span>{stat.label}</span>
          </article>
        ))}
      </div>

      <section className="page-section">
        <div className="section-row">
          <h2>Your profile snapshot</h2>
          <button type="button" className="link-btn" onClick={onGoWizard}>
            Edit profile
          </button>
        </div>
        <div className="snapshot-grid">
          <article className="snapshot-card">
            <span>Background</span>
            <strong>{profile.qualification}</strong>
            <small>{profile.educationLevel}</small>
            {profile.currentRole && (
              <small>Current role: {profile.currentRole}</small>
            )}
          </article>
          <article className="snapshot-card">
            <span>Current skills</span>
            <strong>
              {skills.length} saved{skills.length === 1 ? '' : ' skills'}
            </strong>
            {skills.length > 0 ? (
              <div className="chip-row">
                {skills.slice(0, 5).map((skill) => (
                  <span className="chip" key={skill.id}>
                    {skill.name}
                  </span>
                ))}
                {skills.length > 5 && (
                  <span className="chip more">+{skills.length - 5} more</span>
                )}
              </div>
            ) : (
              <small>Add the skills and tools you already use.</small>
            )}
          </article>
        </div>
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>Recommended careers</h2>
          <button type="button" className="link-btn" onClick={onGoMatches}>
            View all matches →
          </button>
        </div>
        <p className="section-sub">
          Based on your skills and Australian labour market data.
        </p>
        {suggestions.length > 0 ? (
          <div className="match-grid four">
            {suggestions.slice(0, 4).map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.code}
                suggestion={suggestion}
                index={index}
                targetRole={targetRole}
                busy={busy}
                compact
                onPlan={onPlan}
                onReact={() => undefined}
              />
            ))}
          </div>
        ) : (
          <p className="empty-note">
            Add a few skills to unlock career suggestions built from real
            occupation data.
          </p>
        )}
      </section>
    </>
  )
}
