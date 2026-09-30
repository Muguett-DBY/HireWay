import type { RoleRequirements as RequirementsData } from '../../lib/roleRequirementsApi'
import type { Profile } from '../../lib/profileApi'
import type { RoleSuggestion } from '../../lib/suggestionApi'
import type { Skill } from '../../lib/skillsApi'
import type { TargetRole } from '../../lib/targetRoleApi'
import { occupationTitle } from '../../lib/occupationTitle'
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
  onGoPage: (page: 'analysis' | 'role' | 'pathways') => void
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
  onGoPage,
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
        <h1>
          {targetRole
            ? occupationTitle(targetRole.title)
            : 'Choose your target role'}
        </h1>
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

      {/* The tabs read in this order once a direction is chosen, so point
          first-time users at the workspace instead of leaving them here. */}
      {targetRole && (
        <section className="guide-strip" aria-label="Suggested next steps">
          <button
            type="button"
            className="guide-card"
            onClick={() => onGoPage('analysis')}
          >
            <span className="guide-number" aria-hidden="true">
              1
            </span>
            <span>
              <strong>Check your readiness</strong>
              <small>Compare your skills with the role's requirements.</small>
            </span>
          </button>
          <button
            type="button"
            className="guide-card"
            onClick={() => onGoPage('role')}
          >
            <span className="guide-number" aria-hidden="true">
              2
            </span>
            <span>
              <strong>See the role in detail</strong>
              <small>Tasks, skill groups and the study routes in.</small>
            </span>
          </button>
          <button
            type="button"
            className="guide-card"
            onClick={() => onGoPage('pathways')}
          >
            <span className="guide-number" aria-hidden="true">
              3
            </span>
            <span>
              <strong>Plan your pathway</strong>
              <small>A learning roadmap built from your gaps.</small>
            </span>
          </button>
        </section>
      )}

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
