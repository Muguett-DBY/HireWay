import type {
  RoleRequirements as RequirementsData,
  RoleSkill,
} from '../../lib/roleRequirementsApi'
import type { Profile } from '../../lib/profileApi'
import type { RoleSuggestion } from '../../lib/suggestionApi'
import type { Skill } from '.././../lib/skillsApi'
import type { TargetRole } from '../../lib/targetRoleApi'

type AnalysisPageProps = {
  profile: Profile
  skills: Skill[]
  targetRole: TargetRole | null
  suggestions: RoleSuggestion[]
  requirements: RequirementsData | null
  busy: boolean
  onAddSkill: (skill: RoleSkill) => void
  onGoMatches: () => void
  onEditTargetRole: () => void
}

// Readiness per O*NET category: how many of the role's listed skills the
// profile already claims. Essentials count triple, tools count once - a
// simple coverage measure, not a hiring prediction.
function readiness(skills: Skill[], requirements: RequirementsData) {
  const savedCodes = new Set(
    skills.flatMap((skill) =>
      skill.skillCode ? [skill.skillCode] : [skill.name.toLowerCase()],
    ),
  )
  const has = (skill: RoleSkill) =>
    savedCodes.has(skill.code) || savedCodes.has(skill.name.toLowerCase())

  const groups = [
    { key: 'essential', title: 'Core skills', weight: 3 },
    { key: 'recommended', title: 'Transferable skills', weight: 2 },
    { key: 'bonus', title: 'Common tools', weight: 1 },
  ] as const

  let weightedHas = 0
  let weightedTotal = 0
  const rows = groups.map((group) => {
    const items = requirements.skills.filter(
      (skill) => skill.priority === group.key,
    )
    const owned = items.filter((skill) => has(skill)).length
    weightedHas += owned * group.weight
    weightedTotal += items.length * group.weight
    return {
      key: group.key,
      title: group.title,
      owned,
      total: items.length,
      percent: items.length ? Math.round((owned / items.length) * 100) : 100,
      missing: items.filter((skill) => !has(skill)),
    }
  })
  const overall = weightedTotal
    ? Math.round((weightedHas / weightedTotal) * 100)
    : 0
  return { rows, overall }
}

// The analysis page turns the saved profile against the target role's
// requirements into one honest readiness picture: an overall coverage score,
// per-category bars, and the missing skills worth adding next.
export function AnalysisPage({
  skills,
  targetRole,
  suggestions,
  requirements,
  busy,
  onAddSkill,
  onGoMatches,
  onEditTargetRole,
}: AnalysisPageProps) {
  if (!targetRole) {
    return (
      <section className="app-hero">
        <p className="eyebrow">Career analysis</p>
        <h1>Choose a target role first</h1>
        <p className="app-hero-sub">
          The analysis compares your profile against one occupation's
          requirements, so pick a direction to measure against.
        </p>
        <div className="hero-actions">
          <button type="button" className="btn" onClick={onEditTargetRole}>
            Choose target role
          </button>
        </div>
      </section>
    )
  }

  const targetSuggestion = suggestions.find(
    (item) => item.code === targetRole.code,
  )
  const analysis = requirements ? readiness(skills, requirements) : null
  const ring = analysis ? Math.round(analysis.overall * 2.51) : 0

  return (
    <>
      <section className="app-hero">
        <p className="eyebrow">Career analysis</p>
        <h1>How ready you are for {targetRole.title}</h1>
        <p className="app-hero-sub">
          Coverage of the skills and tools commonly listed for this role,
          weighted towards core skills.
        </p>
      </section>

      {!analysis ? (
        <p className="empty-note">
          No requirement data is available for this role yet.
        </p>
      ) : (
        <>
          <div className="analysis-grid">
            <article className="panel donut-panel">
              <p className="panel-title">Overall readiness</p>
              <svg
                className="donut"
                viewBox="0 0 120 120"
                role="img"
                aria-label={`Overall readiness ${analysis.overall} out of 100`}
              >
                <circle className="donut-track" cx="60" cy="60" r="50" />
                <circle
                  className="donut-value"
                  cx="60"
                  cy="60"
                  r="50"
                  strokeDasharray={`${ring} 251`}
                />
                <text x="60" y="58" textAnchor="middle">
                  {analysis.overall}
                </text>
                <text className="donut-sub" x="60" y="76" textAnchor="middle">
                  /100
                </text>
              </svg>
              <p className="panel-caption">
                {targetSuggestion
                  ? `Engine match score ${targetSuggestion.matchScore}%`
                  : 'Weighted skill coverage'}
              </p>
            </article>

            <article className="panel">
              <p className="panel-title">Readiness by category</p>
              {analysis.rows.map((row) => (
                <div className="cat-row" key={row.key}>
                  <span className="cat-name">{row.title}</span>
                  <span className="cat-bar">
                    <span style={{ width: `${row.percent}%` }} />
                  </span>
                  <small>
                    {row.owned}/{row.total}
                  </small>
                </div>
              ))}
              <p className="panel-caption">
                Green means the profile already lists the skill. Add the missing
                ones below as you pick them up.
              </p>
            </article>
          </div>

          {targetSuggestion && (
            <div className="factor-panel">
              <p className="panel-title">Why the engine ranks this role</p>
              <div className="factor-legend wide">
                <span>Skills {targetSuggestion.factors.skill}</span>
                <span>Growth {targetSuggestion.factors.growth}</span>
                <span>Education {targetSuggestion.factors.education}</span>
              </div>
              <ul className="why-list">
                {targetSuggestion.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <button type="button" className="link-btn" onClick={onGoMatches}>
                Compare with other matches →
              </button>
            </div>
          )}

          <section className="page-section">
            <div className="section-row">
              <h2>Skill gaps to close</h2>
              <span className="section-tag">
                {analysis.rows.reduce(
                  (total, row) => total + row.missing.length,
                  0,
                )}{' '}
                missing
              </span>
            </div>
            {analysis.rows.map((row) =>
              row.missing.length > 0 ? (
                <div className="gap-group" key={row.key}>
                  <p className="gap-title">{row.title}</p>
                  <div className="chip-row">
                    {row.missing.map((skill) => (
                      <button
                        type="button"
                        className="gap-chip"
                        key={skill.code}
                        disabled={busy}
                        onClick={() => onAddSkill(skill)}
                        aria-label={`Add ${skill.name} to your profile`}
                      >
                        + {skill.name}
                        <small>{skill.score}</small>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
            {analysis.rows.every((row) => row.missing.length === 0) && (
              <p className="empty-note">
                Your profile lists every skill in this role's catalogue entry.
              </p>
            )}
          </section>
        </>
      )}
    </>
  )
}
