import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide'
import { MorphIcon } from 'morphicons/react'
import type {
  RoleRequirements as RequirementsData,
  RoleSkill,
} from '../../lib/roleRequirementsApi'
import type { SaveSkillResult, Skill, SkillStatus } from '../../lib/skillsApi'
import type { RoleSuggestion } from '../../lib/suggestionApi'
import type { TargetRole } from '../../lib/targetRoleApi'

type AnalysisPageProps = {
  skills: Skill[]
  targetRole: TargetRole | null
  suggestions: RoleSuggestion[]
  requirements: RequirementsData | null
  busy: boolean
  onAddUpcomingSkill: (skill: RoleSkill) => void
  onSkillStatus: (skill: Skill, status: SkillStatus) => void
  onRemoveSkill: (skill: Skill) => Promise<SaveSkillResult>
  onGoMatches: () => void
  onEditTargetRole: () => void
}

const statusOrder: SkillStatus[] = ['upcoming', 'current', 'completed']
const statusLabels: Record<SkillStatus, string> = {
  upcoming: 'Upcoming',
  current: 'Current',
  completed: 'Completed',
}

// Requirement categories mirror the O*NET groups the role page already uses.
const groups = [
  { key: 'essential', title: 'Core skills', weight: 3 },
  { key: 'recommended', title: 'Transferable skills', weight: 2 },
  { key: 'bonus', title: 'Common tools', weight: 1 },
] as const

// Knowledge entries share an O*NET family prefix (2.C.1.a -> 2.C.1), so a
// saved sibling counts as "improve" rather than a full match. Tools carry
// opaque codes and only ever match exactly.
function sameFamily(requiredCode: string, savedCode: string): boolean {
  const family = (code: string) => code.split('.').slice(0, 3).join('.')
  return family(requiredCode) === family(savedCode)
}

// Readiness per category with every requirement sorted into matched,
// improve or missing. Only current and completed skills count as owned -
// upcoming items are plans, not strengths yet.
function readiness(skills: Skill[], requirements: RequirementsData) {
  const owned = skills.filter((skill) => skill.status !== 'upcoming')
  const byCode = new Map(
    owned.flatMap((skill) =>
      skill.skillCode
        ? [[skill.skillCode, skill] as const]
        : [[skill.name.toLowerCase(), skill] as const],
    ),
  )

  let weightedHas = 0
  let weightedTotal = 0
  const rows = groups.map((group) => {
    const items = requirements.skills.filter(
      (skill) => skill.priority === group.key,
    )
    let matched = 0
    let improve = 0
    const missing: RoleSkill[] = []
    for (const item of items) {
      if (byCode.has(item.code) || byCode.has(item.name.toLowerCase())) {
        matched += 1
      } else if (
        [...byCode.keys()].some((saved) => sameFamily(item.code, saved))
      ) {
        improve += 1
      } else {
        missing.push(item)
      }
    }
    weightedHas += (matched + improve) * group.weight
    weightedTotal += items.length * group.weight
    return {
      key: group.key,
      title: group.title,
      total: items.length,
      matched,
      improve,
      missing,
      covered: matched + improve,
      percent: items.length
        ? Math.round(((matched + improve) / items.length) * 100)
        : 100,
    }
  })

  const overall = weightedTotal
    ? Math.round((weightedHas / weightedTotal) * 100)
    : 0
  return { rows, overall }
}

// The analysis page compares the profile with the target role's catalogue
// requirements: an overall readiness ring, per-category coverage, the skill
// gaps worth learning next, and progress controls for the saved skills.
export function AnalysisPage({
  skills,
  targetRole,
  suggestions,
  requirements,
  busy,
  onAddUpcomingSkill,
  onSkillStatus,
  onRemoveSkill,
  onGoMatches,
  onEditTargetRole,
}: AnalysisPageProps) {
  const [pendingRemoval, setPendingRemoval] = useState<Skill | null>(null)
  const [removingSkillId, setRemovingSkillId] = useState<number | null>(null)
  const [removeError, setRemoveError] = useState('')
  const removeDialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = removeDialogRef.current
    if (!dialog) return

    if (pendingRemoval && !dialog.open) {
      dialog.showModal()
    } else if (!pendingRemoval && dialog.open) {
      dialog.close()
    }
  }, [pendingRemoval])

  async function confirmRemoval() {
    if (!pendingRemoval) return

    const skill = pendingRemoval
    setRemoveError('')
    setPendingRemoval(null)
    setRemovingSkillId(skill.id)

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (!reduceMotion) {
      await new Promise((resolve) => window.setTimeout(resolve, 420))
    }

    const result = await onRemoveSkill(skill)
    setRemovingSkillId(null)
    if (!result.ok) {
      setRemoveError(result.error)
      setPendingRemoval(skill)
    }
  }

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
  const hasNoSkills = skills.length === 0

  return (
    <>
      <section className="app-hero">
        <p className="eyebrow">Career analysis</p>
        <h1>How ready you are for {targetRole.title}</h1>
        <p className="app-hero-sub">
          Coverage of the skills and tools commonly listed for this role,
          weighted towards core skills. A related skill counts half towards
          coverage.
        </p>
      </section>

      {/* Remind the user when the profile is too thin to analyse. */}
      {hasNoSkills && (
        <p className="prompt-banner" role="status">
          Your profile has no skills yet - add a few below or from the matches
          page so the readiness score has something to measure.
        </p>
      )}

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
                  pathLength="100"
                  strokeDasharray={`${analysis.overall} 100`}
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
                    {row.matched + row.improve}/{row.total}
                  </small>
                </div>
              ))}
              <p className="panel-caption">
                A skill counts as covered when your profile lists it, or a skill
                from the same O*NET family.
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

          {/* Skill gaps sorted into matched, improve and missing buckets. */}
          <section className="page-section">
            <div className="section-row">
              <h2>Skill gaps to close</h2>
              <span className="section-tag">
                Evidence: US O*NET 31.0 ratings via the ABS OSCA bridge
              </span>
            </div>
            {analysis.rows.map((row) => {
              if (row.total === 0) return null

              return (
                <div className="gap-group" key={row.key}>
                  <p className="gap-title">
                    {row.title}
                    <span className="gap-count">
                      {row.covered}/{row.total} covered
                      {row.missing.length > 0
                        ? ` · ${row.missing.length} missing`
                        : ''}
                    </span>
                  </p>
                  {row.missing.length > 0 && (
                    <div className="chip-row">
                      {row.missing.map((skill) => (
                        <button
                          type="button"
                          className="gap-chip"
                          key={skill.code}
                          disabled={busy}
                          onClick={() => onAddUpcomingSkill(skill)}
                          title="From US O*NET 31.0 importance ratings via the ABS OSCA bridge"
                          aria-label={`Plan ${skill.name} as an upcoming skill`}
                        >
                          + {skill.name}
                          <small>{skill.score}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {analysis.rows.every((row) => row.missing.length === 0) && (
              <p className="empty-note">
                Nothing missing - your profile covers this role's whole
                catalogue entry.
              </p>
            )}
          </section>

          {/* Saved skills with their progress state, ready to adjust. */}
          <section className="page-section">
            <div className="section-row">
              <h2>My skills</h2>
              <span className="section-tag">
                Tap a status to move a skill along
              </span>
            </div>
            {skills.length === 0 ? (
              <p className="empty-note">
                Nothing tracked yet. Planned skills land here as Upcoming.
              </p>
            ) : (
              <div className="progress-list">
                {skills.map((skill) => {
                  const removing = removingSkillId === skill.id

                  return (
                    <article
                      className={`progress-row${removing ? ' removing' : ''}`}
                      key={skill.id}
                      aria-busy={removing || undefined}
                    >
                      <span className="progress-name">{skill.name}</span>
                      <div className="progress-actions">
                        <div
                          className="status-cycle"
                          role="group"
                          aria-label={`${skill.name} progress status`}
                        >
                          {statusOrder.map((status) => (
                            <button
                              type="button"
                              key={status}
                              className={
                                skill.status === status
                                  ? 'status-pill active'
                                  : 'status-pill'
                              }
                              disabled={busy || removing}
                              onClick={() => onSkillStatus(skill, status)}
                              aria-pressed={skill.status === status}
                            >
                              {statusLabels[status]}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="remove-skill-button"
                          disabled={busy || removing}
                          aria-label={`Remove ${skill.name}`}
                          title={`Remove ${skill.name}`}
                          onClick={() => {
                            setRemoveError('')
                            setPendingRemoval(skill)
                          }}
                        >
                          <MorphIcon
                            icon={Trash2}
                            size={18}
                            strokeWidth={2}
                            spring="snappy"
                            reducedMotion="user"
                          />
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}

      <dialog
        ref={removeDialogRef}
        className="confirm-dialog"
        aria-labelledby="remove-skill-confirm-title"
        aria-describedby="remove-skill-confirm-description"
        onCancel={(event) => {
          event.preventDefault()
          if (!busy) setPendingRemoval(null)
        }}
        onClose={() => {
          setPendingRemoval(null)
          setRemoveError('')
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !busy) {
            setPendingRemoval(null)
          }
        }}
      >
        {pendingRemoval && (
          <div className="confirm-dialog-card">
            <p className="eyebrow">My skills</p>
            <h2 id="remove-skill-confirm-title">Remove this skill?</h2>
            <p id="remove-skill-confirm-description">
              It will be removed from your profile and career calculations.
            </p>

            <div className="remove-skill-summary">
              <small>Skill to remove</small>
              <strong>{pendingRemoval.name}</strong>
            </div>

            {removeError && (
              <p className="field-error" role="alert">
                {removeError}
              </p>
            )}

            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                autoFocus
                onClick={() => setPendingRemoval(null)}
              >
                Keep skill
              </button>
              <button
                type="button"
                className="btn danger"
                disabled={busy}
                onClick={() => void confirmRemoval()}
              >
                {busy ? 'Removing...' : 'Remove skill'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
