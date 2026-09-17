import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type {
  RoleRequirements as RequirementsData,
  RoleSkill,
} from '../../lib/roleRequirementsApi'
import type { SaveSkillResult, Skill } from '../../lib/skillsApi'
import type { TargetRole } from '../../lib/targetRoleApi'

const numberFormat = new Intl.NumberFormat('en-AU', {
  maximumFractionDigits: 0,
})

type RoleDetailsPageProps = {
  targetRole: TargetRole | null
  skills: Skill[]
  requirements: RequirementsData | null
  busy: boolean
  onAddSkill: (name: string, skillCode: string) => Promise<SaveSkillResult>
  onGoPathways: () => void
}

const groups = [
  {
    key: 'essential',
    title: 'Core skills',
    note: 'Broad O*NET abilities commonly associated with this role.',
  },
  {
    key: 'recommended',
    title: 'Transferable skills',
    note: 'Abilities that can carry across jobs and industries.',
  },
  {
    key: 'bonus',
    title: 'Common tools',
    note: 'Named software and technologies found in the source data.',
  },
] as const

// The role details page holds everything about the chosen occupation:
// what the work involves, the Australian outlook, the day-to-day tasks and
// the skills worth picking up - each section fed by its own dataset.
export function RoleDetailsPage({
  targetRole,
  skills,
  requirements,
  busy,
  onAddSkill,
  onGoPathways,
}: RoleDetailsPageProps) {
  if (!targetRole) {
    return (
      <section className="app-hero">
        <p className="eyebrow">Role details</p>
        <h1>Choose a target role first</h1>
        <p className="app-hero-sub">
          Role details describe one occupation - pick a direction and this page
          fills in.
        </p>
      </section>
    )
  }

  const savedCodes = new Set(
    skills.flatMap((skill) =>
      skill.skillCode ? [skill.skillCode] : [skill.name.toLowerCase()],
    ),
  )
  const has = (skill: RoleSkill) =>
    savedCodes.has(skill.code) || savedCodes.has(skill.name.toLowerCase())
  const market = requirements?.market ?? null
  const vacancyTotal = market
    ? market.vacancies.reduce((total, entry) => total + entry.vacancies, 0)
    : null
  const maxVacancy = market
    ? Math.max(1, ...market.vacancies.map((entry) => entry.vacancies))
    : 1

  return (
    <>
      <section className="app-hero">
        <p className="eyebrow">Role details</p>
        <h1>{targetRole.title}</h1>
        <p className="app-hero-sub">{targetRole.description}</p>
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>Australian outlook</h2>
        </div>
        {!market ? (
          <p className="empty-note">
            No market data is available for this role yet.
          </p>
        ) : (
          <div className="outlook-panel">
            <div className="stat-strip tight">
              <article className="stat-card">
                <strong
                  className={
                    market.change5yPercent !== null &&
                    market.change5yPercent >= 2
                      ? 'growth-pos'
                      : undefined
                  }
                >
                  {market.outlook}
                </strong>
                <span>Demand for this role</span>
              </article>
              <article className="stat-card">
                <strong>
                  {market.change5yPercent !== null
                    ? `${market.change5yPercent > 0 ? '+' : ''}${Math.round(market.change5yPercent * 10) / 10}%`
                    : '—'}
                </strong>
                <span>Five-year employment change</span>
              </article>
              <article className="stat-card">
                <strong>
                  {market.medianWeeklyEarnings != null
                    ? `$${numberFormat.format(market.medianWeeklyEarnings)}`
                    : '—'}
                </strong>
                <span>Median weekly earnings</span>
              </article>
              <article className="stat-card">
                <strong>
                  {vacancyTotal !== null && !Number.isNaN(vacancyTotal)
                    ? numberFormat.format(Math.round(vacancyTotal))
                    : '—'}
                </strong>
                <span>Current vacancies</span>
              </article>
            </div>

            <div className="outlook-charts">
              <div>
                <p className="panel-title">Employment trajectory</p>
                <TrajectoryChart market={market} />
              </div>
              <div>
                <p className="panel-title">Hiring demand by state</p>
                <StateDemandChart
                  vacancies={market.vacancies}
                  maxVacancy={maxVacancy}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>Day to day</h2>
        </div>
        {requirements && requirements.tasks.length > 0 ? (
          <ol className="task-grid">
            {requirements.tasks.map((task, index) => (
              <li className="task-card" key={task}>
                <span className="task-num">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p>{task}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-note">
            No task statements are catalogued for this role yet.
          </p>
        )}
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>Skills &amp; tools</h2>
          <span className="section-tag">
            Guidance from US O*NET data, not employer requirements
          </span>
        </div>
        {requirements && requirements.skills.length > 0 ? (
          <div className="skill-panels">
            {groups.map((group) => {
              const items = requirements.skills.filter(
                (skill) => skill.priority === group.key,
              )
              return (
                <article className="skill-panel" key={group.key}>
                  <p className="panel-title">{group.title}</p>
                  <p className="panel-note">{group.note}</p>
                  {items.length === 0 && (
                    <p className="panel-caption">
                      Nothing listed in this category yet.
                    </p>
                  )}
                  {items.map((skill) => (
                    <button
                      type="button"
                      className={has(skill) ? 'skill-row saved' : 'skill-row'}
                      key={skill.code}
                      disabled={has(skill) || busy}
                      onClick={() => onAddSkill(skill.name, skill.code)}
                      aria-label={
                        has(skill)
                          ? `${skill.name} is already saved`
                          : `Add ${skill.name} to your profile`
                      }
                    >
                      <span className="skill-row-head">
                        <span>
                          {has(skill) ? '✓ ' : '+ '}
                          {skill.name}
                        </span>
                        <small>{skill.score}</small>
                      </span>
                      <span className="skill-bar">
                        <span style={{ width: `${skill.score}%` }} />
                      </span>
                    </button>
                  ))}
                </article>
              )
            })}
          </div>
        ) : (
          <p className="empty-note">
            No skill data is available for this role yet.
          </p>
        )}
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>Education &amp; pathways</h2>
          <button type="button" className="link-btn" onClick={onGoPathways}>
            Open pathways →
          </button>
        </div>
        {requirements && requirements.qualifications.length > 0 ? (
          <div className="qual-grid">
            {requirements.qualifications.slice(0, 3).map((qualification) => (
              <article className="qual-card" key={qualification.code}>
                <strong>{qualification.title}</strong>
                <small>{qualification.qualificationLevel}</small>
                <span>{qualification.relationship}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-note">
            No training pathways are linked to this role yet.
          </p>
        )}
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>Data sources</h2>
        </div>
        <ul className="source-list">
          {(requirements?.sources ?? []).map((source) => (
            <li key={source.name}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.name}
              </a>
              <span>
                {source.publisher} · {source.licence}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

// Market visuals reveal once when scrolled into view. Browsers without
// IntersectionObserver render the final state immediately.
function useRevealOnView<T extends HTMLElement>(threshold = 0.35) {
  const elementRef = useRef<T>(null)
  const [isVisible, setIsVisible] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    const element = elementRef.current
    if (!element || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setIsVisible(true)
        observer.disconnect()
      },
      { threshold },
    )
    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold])

  return { elementRef, isVisible }
}

function StateDemandChart({
  vacancies,
  maxVacancy,
}: {
  vacancies: NonNullable<RequirementsData['market']>['vacancies']
  maxVacancy: number
}) {
  const { elementRef, isVisible } = useRevealOnView<HTMLUListElement>()

  return (
    <ul
      ref={elementRef}
      className={`state-chart${isVisible ? ' is-visible' : ''}`}
    >
      {vacancies.map((entry, index) => (
        <li key={entry.state}>
          <span className="state-name">{entry.state}</span>
          <span className="state-bar">
            <span
              style={
                {
                  width: `${Math.max(2, Math.round((entry.vacancies / maxVacancy) * 100))}%`,
                  '--state-delay': `${120 + index * 45}ms`,
                } as CSSProperties
              }
            />
          </span>
          <small>{numberFormat.format(Math.round(entry.vacancies))}</small>
        </li>
      ))}
    </ul>
  )
}

// Three JSA projection points draw one small line chart - honest scale,
// real values, no extrapolation beyond the published years.
function TrajectoryChart({
  market,
}: {
  market: NonNullable<RequirementsData['market']>
}) {
  const { elementRef, isVisible } = useRevealOnView<HTMLDivElement>()
  const points = [
    { year: '2025', value: market.employedMay2025 },
    { year: '2030', value: market.employedMay2030 },
    { year: '2035', value: market.employedMay2035 },
  ].filter(
    (point): point is { year: string; value: number } => point.value !== null,
  )

  if (points.length < 2) {
    return <p className="panel-caption">No projection data available.</p>
  }

  const width = 320
  const height = 132
  // Value labels are wider than their points. Keep the first and last points
  // inside the plot so five-digit values cannot be clipped by the SVG edge.
  const padX = 34
  const padTop = 30
  const baselineY = 106
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || max || 1
  const coords = points.map((point, index) => ({
    x: padX + (index / (points.length - 1)) * (width - padX * 2),
    y: padTop + (1 - (point.value - min) / span) * (baselineY - padTop),
    ...point,
  }))
  const line = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const area = `${padX},${baselineY} ${line} ${width - padX},${baselineY}`

  return (
    <div
      ref={elementRef}
      className={`trajectory-visual${isVisible ? ' is-visible' : ''}`}
    >
      <svg
        className="trajectory-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Employment from ${numberFormat.format(points[0].value)} in ${points[0].year} to ${numberFormat.format(points[points.length - 1].value)} in ${points[points.length - 1].year}`}
      >
        <polygon className="trajectory-area" points={area} />
        <polyline className="trajectory-line" points={line} pathLength="1" />
        {coords.map((c, index) => (
          <g
            className="trajectory-point"
            key={c.year}
            style={
              {
                '--trajectory-delay': `${360 + index * 120}ms`,
              } as CSSProperties
            }
          >
            <circle className="trajectory-dot" cx={c.x} cy={c.y} r="3.5" />
            <text
              className="trajectory-year"
              x={c.x}
              y={height - 4}
              textAnchor="middle"
            >
              {c.year}
            </text>
            <text
              className="trajectory-value"
              x={c.x}
              y={c.y - 9}
              textAnchor="middle"
            >
              {numberFormat.format(Math.round(c.value))}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
