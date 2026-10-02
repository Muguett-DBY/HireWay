import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type {
  RoleRequirements as RequirementsData,
  RoleSkill,
} from '../../lib/roleRequirementsApi'
import type { SaveSkillResult, Skill } from '../../lib/skillsApi'
import type { TargetRole } from '../../lib/targetRoleApi'
import { occupationTitle } from '../../lib/occupationTitle'
import { useI18n } from '../../lib/useI18n'
import { LocalizedText } from '../LocalizedText'

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
    title: 'role.group.core',
    note: 'workspace.coreNote',
  },
  {
    key: 'recommended',
    title: 'role.group.recommended',
    note: 'workspace.transferableNote',
  },
  {
    key: 'bonus',
    title: 'role.group.bonus',
    note: 'workspace.toolsNote',
  },
] as const

const outlookKeys = {
  unknown: 'workspace.outlook.unknown',
  strong: 'workspace.outlook.strong',
  growing: 'workspace.outlook.growing',
  stable: 'workspace.outlook.stable',
  declining: 'workspace.outlook.declining',
} as const

// Keep older API responses readable while new responses carry outlookCode.
const legacyOutlookCodes: Record<string, keyof typeof outlookKeys> = {
  'Outlook unknown': 'unknown',
  'Growing strongly': 'strong',
  Growing: 'growing',
  Stable: 'stable',
  Declining: 'declining',
}

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
  const { t, number, name } = useI18n()
  if (!targetRole) {
    return (
      <section className="app-hero">
        <p className="eyebrow">{t('role.eyebrow')}</p>
        <h1>{t('analysis.chooseFirst')}</h1>
        <p className="app-hero-sub">{t('workspace.chooseRoleDetails')}</p>
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
  const outlookCode =
    market?.outlookCode ??
    legacyOutlookCodes[market?.outlook ?? ''] ??
    'unknown'
  const vacancyTotal = market
    ? market.vacancies.reduce((total, entry) => total + entry.vacancies, 0)
    : null
  const maxVacancy = market
    ? Math.max(1, ...market.vacancies.map((entry) => entry.vacancies))
    : 1

  return (
    <>
      <section className="app-hero">
        <p className="eyebrow">{t('role.eyebrow')}</p>
        <h1>
          <LocalizedText text={occupationTitle(targetRole.title)} />
        </h1>
        <p className="app-hero-sub">
          <LocalizedText text={targetRole.description} />
        </p>
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>{t('role.outlook')}</h2>
        </div>
        {!market ? (
          <p className="empty-note">{t('role.noMarket')}</p>
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
                  {t(outlookKeys[outlookCode])}
                </strong>
                <span>{t('role.demand')}</span>
              </article>
              <article className="stat-card">
                <strong>
                  {market.change5yPercent !== null
                    ? `${market.change5yPercent > 0 ? '+' : ''}${number(market.change5yPercent, 1)}%`
                    : '—'}
                </strong>
                <span>{t('role.change5y')}</span>
              </article>
              <article className="stat-card">
                <strong>
                  {market.medianWeeklyEarnings != null
                    ? `A$${number(market.medianWeeklyEarnings)}`
                    : '—'}
                </strong>
                <span>{t('role.earnings')}</span>
              </article>
              <article className="stat-card">
                <strong>
                  {vacancyTotal !== null && !Number.isNaN(vacancyTotal)
                    ? number(Math.round(vacancyTotal))
                    : '—'}
                </strong>
                <span>{t('role.vacancies')}</span>
              </article>
            </div>

            <div className="outlook-charts">
              <div>
                <p className="panel-title">{t('role.trajectory')}</p>
                <TrajectoryChart market={market} />
              </div>
              <div>
                <p className="panel-title">{t('role.stateDemand')}</p>
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
          <h2>{t('role.dayToDay')}</h2>
        </div>
        {requirements && requirements.tasks.length > 0 ? (
          <ol className="task-grid">
            {requirements.tasks.map((task, index) => (
              <li className="task-card" key={task}>
                <span className="task-num">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p>
                  <LocalizedText text={task} />
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-note">{t('role.noTasks')}</p>
        )}
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>{t('role.skillsTools')}</h2>
          <span className="section-tag">{t('role.skillsNote')}</span>
        </div>
        {requirements && requirements.skills.length > 0 ? (
          <div className="skill-panels">
            {groups.map((group) => {
              const items = requirements.skills.filter(
                (skill) => skill.priority === group.key,
              )
              return (
                <article className="skill-panel" key={group.key}>
                  <p className="panel-title">{t(group.title)}</p>
                  <p className="panel-note">{t(group.note)}</p>
                  {items.length === 0 && (
                    <p className="panel-caption">
                      {t('role.nothingInCategory')}
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
                          ? t('role.savedAria', { name: name(skill.name) })
                          : t('role.addAria', { name: name(skill.name) })
                      }
                    >
                      <span className="skill-row-head">
                        <span>
                          {has(skill) ? '✓ ' : '+ '}
                          <LocalizedText text={skill.name} />
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
          <p className="empty-note">{t('role.noSkillData')}</p>
        )}
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>{t('role.education')}</h2>
          <button type="button" className="link-btn" onClick={onGoPathways}>
            {t('role.openPathways')}
          </button>
        </div>
        {requirements && requirements.qualifications.length > 0 ? (
          <div className="qual-grid">
            {requirements.qualifications.slice(0, 3).map((qualification) => (
              <article className="qual-card" key={qualification.code}>
                <strong>
                  <LocalizedText text={qualification.title} />
                </strong>
                <small>
                  <LocalizedText text={qualification.qualificationLevel} />
                </small>
                <span>
                  <LocalizedText text={qualification.relationship} />
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-note">{t('role.noQualifications')}</p>
        )}
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>{t('role.sources')}</h2>
        </div>
        <ul className="source-list">
          {(requirements?.sources ?? []).map((source) => (
            <li key={source.name}>
              <a href={source.url} target="_blank" rel="noreferrer">
                <LocalizedText text={source.name} />
              </a>
              <span>
                <LocalizedText text={source.publisher} /> · {source.licence}
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
  const { number } = useI18n()
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
          <small>{number(Math.round(entry.vacancies))}</small>
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
  const { t, number } = useI18n()
  const { elementRef, isVisible } = useRevealOnView<HTMLDivElement>()
  const points = [
    { year: '2025', value: market.employedMay2025 },
    { year: '2030', value: market.employedMay2030 },
    { year: '2035', value: market.employedMay2035 },
  ].filter(
    (point): point is { year: string; value: number } => point.value !== null,
  )

  if (points.length < 2) {
    return <p className="panel-caption">{t('role.noProjection')}</p>
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
        aria-label={t('workspace.trajectoryAria', {
          start: number(points[0].value),
          startYear: points[0].year,
          end: number(points[points.length - 1].value),
          endYear: points[points.length - 1].year,
        })}
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
              {number(Math.round(c.value))}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
