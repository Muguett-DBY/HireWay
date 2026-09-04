import { useEffect, useState } from 'react'
import {
  loadRoleRequirements,
  type RoleMarket,
  type RoleRequirements as RoleRequirementsData,
  type RoleSkill,
} from '../lib/roleRequirementsApi'
import type { SaveSkillResult, Skill } from '../lib/skillsApi'
import type { TargetRole } from '../lib/targetRoleApi'

type RoleRequirementsProps = {
  profileCode: string
  targetRole: TargetRole
  savedSkills: Skill[]
  onAddSkill: (name: string, skillCode: string) => Promise<SaveSkillResult>
}

const priorityGroups = [
  {
    key: 'essential',
    title: 'Core skills',
    description: 'Broad O*NET abilities commonly associated with this role.',
  },
  {
    key: 'recommended',
    title: 'Transferable skills',
    description: 'Abilities that can carry across jobs and industries.',
  },
  {
    key: 'bonus',
    title: 'Common tools',
    description: 'Named software and technologies found in the source data.',
  },
] as const

const numberFormat = new Intl.NumberFormat('en-AU', {
  maximumFractionDigits: 0,
})

function formatGrowth(value: number | null): string {
  if (value === null) return 'n/a'
  const rounded = Math.round(value * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

// This section turns the saved occupation into practical role information.
export function RoleRequirements({
  profileCode,
  targetRole,
  savedSkills,
  onAddSkill,
}: RoleRequirementsProps) {
  const [requirements, setRequirements] = useState<RoleRequirementsData | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addingSkillCode, setAddingSkillCode] = useState('')
  const [skillFeedback, setSkillFeedback] = useState('')
  const [skillFailed, setSkillFailed] = useState(false)

  const savedSkillCodes = new Set(
    savedSkills.flatMap((skill) =>
      skill.skillCode ? [skill.skillCode] : [skill.name.toLowerCase()],
    ),
  )

  function hasSkill(skill: RoleSkill) {
    return (
      savedSkillCodes.has(skill.code) ||
      savedSkillCodes.has(skill.name.toLowerCase())
    )
  }

  // Dashboard chips add to the same current-skills list as the profile form.
  async function addRoleSkill(skill: RoleSkill) {
    setAddingSkillCode(skill.code)
    setSkillFeedback('')
    setSkillFailed(false)

    const result = await onAddSkill(skill.name, skill.code)
    if (result.ok) {
      setSkillFeedback(`${skill.name} added to your current skills.`)
    } else {
      setSkillFeedback(result.error)
      setSkillFailed(true)
    }
    setAddingSkillCode('')
  }

  useEffect(() => {
    const controller = new AbortController()

    void loadRoleRequirements(profileCode, controller.signal)
      .then((result) => {
        if (result.ok) {
          setRequirements(result.data)
        } else {
          setRequirements(null)
          setError(result.data.error ?? 'Could not load role requirements.')
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRequirements(null)
          setError('Could not load role requirements.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [profileCode, targetRole.code])

  return (
    <section className="role-requirements" aria-labelledby="requirements-title">
      <div className="requirements-heading">
        <div>
          <p className="eyebrow">Role requirements</p>
          <h2 id="requirements-title">What {targetRole.title} roles involve</h2>
        </div>
        <p>
          Common skills and training pathways can help you plan what to explore
          next.
        </p>
      </div>

      <aside className="guidance-note" aria-label="Requirement guidance">
        <strong>Use these priorities as a guide.</strong>
        <p>
          They summarise related US O*NET occupations. Select an item only if it
          is a skill or tool you already use.
        </p>
      </aside>

      {loading && (
        <p className="requirements-status" role="status">
          Loading role information...
        </p>
      )}

      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      {requirements && !loading && (
        <>
          {/* The outlook panel answers whether the role has a future. */}
          <MarketOutlook market={requirements.market} />

          {/* Official OSCA task statements describe the day-to-day work. */}
          {requirements.tasks.length > 0 && (
            <section className="day-to-day" aria-labelledby="tasks-title">
              <span className="requirement-label">Day to day</span>
              <ul>
                {requirements.tasks.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Missing data stays visible instead of being replaced with guesses. */}
          <div className="requirements-grid">
            <article className="requirement-panel priority-panel">
              <span className="requirement-label">Skills and tools</span>
              {requirements.skills.length > 0 ? (
                <div className="priority-groups">
                  {/* Each O*NET category gets its own visible priority level. */}
                  {priorityGroups.map((group) => {
                    const skills = requirements.skills.filter(
                      (skill) => skill.priority === group.key,
                    )

                    return (
                      <section
                        className={`priority-group priority-${group.key}`}
                        key={group.key}
                        aria-labelledby={`priority-${group.key}-title`}
                      >
                        <div className="priority-heading">
                          <div>
                            <h3 id={`priority-${group.key}-title`}>
                              {group.title}
                            </h3>
                            <p>{group.description}</p>
                          </div>
                          <span>{skills.length}</span>
                        </div>

                        {skills.length > 0 ? (
                          <ul className="requirement-list skill-requirement-list">
                            {skills.map((skill) => (
                              <li key={skill.code}>
                                <button
                                  type="button"
                                  className={
                                    hasSkill(skill)
                                      ? 'requirement-skill saved'
                                      : 'requirement-skill'
                                  }
                                  disabled={
                                    hasSkill(skill) ||
                                    addingSkillCode === skill.code
                                  }
                                  onClick={() => addRoleSkill(skill)}
                                  aria-label={
                                    hasSkill(skill)
                                      ? `${skill.name} is already saved`
                                      : `Add ${skill.name} to current skills`
                                  }
                                >
                                  {/* The underline shows the O*NET importance. */}
                                  <span
                                    className="skill-score-bar"
                                    style={{ width: `${skill.score}%` }}
                                    aria-hidden="true"
                                  />
                                  {hasSkill(skill)
                                    ? `✓ ${skill.name}`
                                    : addingSkillCode === skill.code
                                      ? 'Adding...'
                                      : `+ ${skill.name}`}
                                  <small
                                    className="skill-score-value"
                                    title="Average importance score (0-100)"
                                  >
                                    {skill.score}
                                  </small>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="priority-empty">
                            No suitable items are available in this category.
                          </p>
                        )}
                      </section>
                    )
                  })}
                </div>
              ) : (
                <p className="requirements-unavailable">
                  No suitable skill data is available for this role yet.
                </p>
              )}

              {skillFeedback && (
                <p
                  className={skillFailed ? 'notice error' : 'notice success'}
                  role={skillFailed ? 'alert' : 'status'}
                >
                  {skillFeedback}
                </p>
              )}
            </article>

            <details className="requirement-panel training-pathways">
              <summary>
                <span>
                  <strong>Optional Australian VET pathways</strong>
                  <small>
                    These courses are linked to the occupation, not required by
                    every employer.
                  </small>
                </span>
                <span>{requirements.qualifications.length}</span>
              </summary>
              {requirements.qualifications.length > 0 ? (
                <>
                  <p className="training-explanation">
                    Diplomas appear here because Jobs and Skills Australia links
                    them as possible vocational training routes. They do not
                    replace or assess your selected course.
                  </p>
                  <ul className="requirement-list qualification-list">
                    {requirements.qualifications.map((qualification) => (
                      <li key={qualification.code}>
                        <div>
                          <strong>{qualification.title}</strong>
                          <small>{qualification.qualificationLevel}</small>
                        </div>
                        <span>{qualification.relationship}</span>
                        {qualification.specialConditions && (
                          <p>{qualification.specialConditions}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="requirements-unavailable">
                  No suitable qualification data is available for this role yet.
                </p>
              )}
            </details>
          </div>

          {/* Source links make the boundary between Australian and US data clear. */}
          <aside
            className="requirements-sources"
            aria-labelledby="sources-title"
          >
            <h3 id="sources-title">Data sources</h3>
            <ul>
              {requirements.sources.map((source) => (
                <li key={source.name}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.name === 'Australian training pathways'
                      ? 'Training Occupation Pathways (TOP)'
                      : source.name}
                  </a>
                  <span>
                    {source.publisher} · {source.licence}
                  </span>
                </li>
              ))}
            </ul>
            <p>
              Skill groups use O*NET categories and do not guarantee what an
              Australian employer will require. TOP pathways are optional and
              are © Commonwealth of Australia.
            </p>
          </aside>
        </>
      )}
    </section>
  )
}

// Every projected figure comes from Australian Government sources, so the
// panel keeps the outlook story next to its numbers instead of hiding it.
function MarketOutlook({ market }: { market: RoleMarket | null }) {
  if (!market) {
    return (
      <section className="market-outlook" aria-labelledby="market-title">
        <div className="market-heading">
          <div>
            <p className="eyebrow">Australian outlook</p>
            <h3 id="market-title">No market data for this role yet</h3>
          </div>
        </div>
      </section>
    )
  }

  // All state bars share one scale so relative demand stays readable.
  const topVacancy = Math.max(
    1,
    ...market.vacancies.map((entry) => entry.vacancies),
  )

  return (
    <section className="market-outlook" aria-labelledby="market-title">
      <div className="market-heading">
        <div>
          <p className="eyebrow">Australian outlook</p>
          <h3 id="market-title">
            Demand for this role is{' '}
            <span
              className={
                market.change5yPercent !== null && market.change5yPercent >= 2
                  ? 'market-growth positive'
                  : 'market-growth'
              }
            >
              {market.outlook.toLowerCase()}
            </span>
          </h3>
          <p>
            National employment is projected to move{' '}
            {formatGrowth(market.change5yPercent)} over five years and{' '}
            {formatGrowth(market.change10yPercent)} over ten years.
          </p>
        </div>
        {market.medianWeeklyEarnings !== null && (
          <div className="market-earnings">
            <span>Median weekly earnings</span>
            <strong>${numberFormat.format(market.medianWeeklyEarnings)}</strong>
          </div>
        )}
      </div>

      <div className="market-facts">
        {/* The three JSA projection points draw one small trajectory chart. */}
        <EmploymentTrajectory
          points={[
            { year: '2025', value: market.employedMay2025 },
            { year: '2030', value: market.employedMay2030 },
            { year: '2035', value: market.employedMay2035 },
          ].filter(
            (point): point is { year: string; value: number } =>
              point.value !== null,
          )}
        />
        {market.vacancies.length > 0 && (
          <article>
            <span>Hiring demand</span>
            <strong>
              {numberFormat.format(
                market.vacancies.reduce(
                  (total, entry) => total + entry.vacancies,
                  0,
                ),
              )}{' '}
              vacancies
            </strong>
            <small>
              Posted across{' '}
              {market.vacancies
                .slice(0, 3)
                .map((entry) => entry.state)
                .join(', ')}
              {market.vacancies.length > 3 ? ' and more' : ''}
            </small>
          </article>
        )}
      </div>

      {/* Vacancies per state share one scale so the bars compare directly. */}
      {market.vacancies.length > 0 && (
        <ul className="market-state-chart" aria-label="Vacancies by state">
          {market.vacancies.map((entry) => {
            const share = Math.round((entry.vacancies / topVacancy) * 100)
            return (
              <li key={entry.state}>
                <span className="state-name">{entry.state}</span>
                <span
                  className="state-bar"
                  role="img"
                  aria-label={`${entry.state}: ${Math.round(entry.vacancies)} vacancies`}
                >
                  <span style={{ width: `${Math.max(share, 2)}%` }} />
                </span>
                <strong>
                  {entry.vacancies % 1 === 0
                    ? numberFormat.format(entry.vacancies)
                    : `~${Math.round(entry.vacancies)}`}
                </strong>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// Three government projection points are enough for an honest mini chart:
// a flat line means "no growth", a climb shows the projected path.
function EmploymentTrajectory({
  points,
}: {
  points: { year: string; value: number }[]
}) {
  if (points.length < 2) return null

  const width = 260
  const height = 96
  const padX = 8
  const padY = 18
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  // Keep a flat trajectory visible instead of dividing by zero.
  const span = max - min || max || 1

  const coords = points.map((point, index) => ({
    x: padX + (index / (points.length - 1)) * (width - padX * 2),
    y: padY + (1 - (point.value - min) / span) * (height - padY * 2),
    ...point,
  }))
  const line = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const area = `${padX},${height - 14} ${line} ${width - padX},${height - 14}`

  return (
    <article>
      <span>Employment trajectory</span>
      <svg
        className="trajectory-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Employment from ${points[0].value && numberFormat.format(points[0].value)} in ${points[0].year} to ${numberFormat.format(points[points.length - 1].value)} in ${points[points.length - 1].year}`}
      >
        <polygon className="trajectory-area" points={area} />
        <polyline className="trajectory-line" points={line} />
        {coords.map((c) => (
          <g key={c.year}>
            <circle className="trajectory-dot" cx={c.x} cy={c.y} r="3.5" />
            <text
              className="trajectory-year"
              x={c.x}
              y={height - 2}
              textAnchor="middle"
            >
              {c.year}
            </text>
            <text
              className="trajectory-value"
              x={c.x}
              y={c.y - 8}
              textAnchor="middle"
            >
              {numberFormat.format(Math.round(c.value))}
            </text>
          </g>
        ))}
      </svg>
      <small>People employed (projected)</small>
    </article>
  )
}
