import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Trash2 } from 'lucide'
import { MorphIcon } from 'morphicons/react'
import type {
  RoleRequirements as RequirementsData,
  RoleSkill,
} from '../../lib/roleRequirementsApi'
import { occupationTitle } from '../../lib/occupationTitle'
import { factorPercents } from '../../lib/factorDisplay'
import { useI18n } from '../../lib/useI18n'
import { useLocalizedText } from '../../lib/useLocalizedText'
import { localizeMessage } from '../../lib/localizedErrors'
import { LocalizedText } from '../LocalizedText'
import { RecommendationReasons } from './RecommendationReasons'
import type { SaveSkillResult, Skill, SkillStatus } from '../../lib/skillsApi'
import type { RoleSuggestion } from '../../lib/suggestionApi'
import type { TargetRole } from '../../lib/targetRoleApi'

type AnalysisPageProps = {
  skills: Skill[]
  targetRole: TargetRole | null
  suggestions: RoleSuggestion[]
  requirements: RequirementsData | null
  busy: boolean
  onAddSkill: (skill: RoleSkill) => void
  onSkillStatus: (skill: Skill, status: SkillStatus) => void
  onRemoveSkill: (skill: Skill) => Promise<SaveSkillResult>
  onGoMatches: () => void
  onEditTargetRole: () => void
}

const statusOrder: SkillStatus[] = ['upcoming', 'current', 'completed']
const statusKeys = {
  upcoming: 'analysis.status.upcoming',
  current: 'analysis.status.current',
  completed: 'analysis.status.completed',
} as const satisfies Record<SkillStatus, string>

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
const GROUP_TITLES = {
  essential: 'analysis.group.core',
  recommended: 'analysis.group.transferable',
  bonus: 'analysis.group.tools',
} as const

export function AnalysisPage({
  skills,
  targetRole,
  suggestions,
  requirements,
  busy,
  onAddSkill,
  onSkillStatus,
  onRemoveSkill,
  onGoMatches,
  onEditTargetRole,
}: AnalysisPageProps) {
  const { t, name } = useI18n()
  const roleTitle = useLocalizedText(occupationTitle(targetRole?.title ?? ''))
  const [pendingRemoval, setPendingRemoval] = useState<Skill | null>(null)
  const [removingSkillId, setRemovingSkillId] = useState<number | null>(null)
  const [removeError, setRemoveError] = useState('')
  const removeDialogRef = useRef<HTMLDialogElement>(null)
  const skillListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dialog = removeDialogRef.current
    if (!dialog) return

    if (pendingRemoval && !dialog.open) {
      dialog.showModal()
    } else if (!pendingRemoval && dialog.open) {
      dialog.close()
    }
  }, [pendingRemoval])

  useEffect(() => {
    const list = skillListRef.current
    if (!list) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const context = gsap.context(() => {
      gsap.fromTo(
        list.querySelectorAll('.progress-row'),
        { autoAlpha: 0, y: 6 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.24,
          stagger: 0.025,
          ease: 'power2.out',
          clearProps: 'transform,opacity,visibility',
        },
      )
    }, list)

    return () => context.revert()
  }, [skills.length])

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
        <p className="eyebrow">{t('analysis.eyebrow')}</p>
        <h1>{t('analysis.chooseFirst')}</h1>
        <p className="app-hero-sub">{t('analysis.chooseFirst.sub')}</p>
        <div className="hero-actions">
          <button type="button" className="btn" onClick={onEditTargetRole}>
            {t('overview.chooseCta')}
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
        <p className="eyebrow">{t('analysis.eyebrow')}</p>
        <h1>{t('analysis.h1', { role: roleTitle })}</h1>
        <p className="app-hero-sub">{t('analysis.sub')}</p>
      </section>

      {/* Remind the user when the profile is too thin to analyse. */}
      {hasNoSkills && (
        <p className="prompt-banner" role="status">
          {t('analysis.noSkills')}
        </p>
      )}

      {!analysis ? (
        <p className="empty-note">{t('analysis.noRequirements')}</p>
      ) : (
        <>
          <div className="page-section analysis-grid">
            <article className="panel donut-panel">
              <p className="panel-title">{t('analysis.readiness')}</p>
              <svg
                className="donut"
                viewBox="0 0 120 120"
                role="img"
                aria-label={t('analysis.readinessAria', {
                  n: analysis.overall,
                })}
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
                  ? t('analysis.engineScore', {
                      n: targetSuggestion.matchScore,
                    })
                  : t('analysis.weightedCoverage')}
              </p>
            </article>

            <article className="panel category-panel">
              <p className="panel-title">{t('analysis.byCategory')}</p>
              <div className="category-rows">
                {analysis.rows.map((row) => (
                  <div className="cat-row" key={row.key}>
                    <span className="cat-name">
                      {t(GROUP_TITLES[row.key as keyof typeof GROUP_TITLES])}
                    </span>
                    <span className="cat-bar">
                      <span style={{ width: `${row.percent}%` }} />
                    </span>
                    <small>
                      {row.matched + row.improve}/{row.total}
                    </small>
                  </div>
                ))}
              </div>
              <p className="panel-caption">{t('analysis.categoryCaption')}</p>
            </article>

            {targetSuggestion && (
              <article className="factor-panel">
                <p className="panel-title">{t('analysis.whyRank')}</p>
                <div className="factor-legend wide">
                  <span>
                    {t('card.skills')}{' '}
                    {factorPercents(targetSuggestion.factors).skill}%
                  </span>
                  <span>
                    {t('card.growth')}{' '}
                    {factorPercents(targetSuggestion.factors).growth}%
                  </span>
                  <span>
                    {t('card.education')}{' '}
                    {factorPercents(targetSuggestion.factors).education}%
                  </span>
                </div>
                <RecommendationReasons suggestion={targetSuggestion} />
                <button
                  type="button"
                  className="link-btn"
                  onClick={onGoMatches}
                >
                  {t('workspace.compare')}
                </button>
              </article>
            )}
          </div>

          {/* Skill gaps sorted into matched, improve and missing buckets. */}
          <section className="page-section">
            <div className="section-row">
              <h2>{t('analysis.gaps')}</h2>
              <span className="section-tag">{t('analysis.gaps.evidence')}</span>
            </div>
            {analysis.rows.map((row) => {
              if (row.total === 0) return null

              return (
                <div className="gap-group" key={row.key}>
                  <p className="gap-title">
                    {t(GROUP_TITLES[row.key as keyof typeof GROUP_TITLES])}
                    <span className="gap-count">
                      {t('analysis.covered', {
                        covered: row.covered,
                        total: row.total,
                      })}
                      {row.missing.length > 0
                        ? ` · ${t('analysis.missing', { n: row.missing.length })}`
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
                          onClick={() => onAddSkill(skill)}
                          title={t('workspace.skillEvidence')}
                          aria-label={t('analysis.addSkill', {
                            name: name(skill.name),
                          })}
                        >
                          + <LocalizedText text={skill.name} />
                          <small>{skill.score}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {analysis.rows.every((row) => row.missing.length === 0) && (
              <p className="empty-note">{t('analysis.allCovered')}</p>
            )}
          </section>

          {/* Saved skills with their progress state, ready to adjust. */}
          <section className="page-section">
            <div className="section-row">
              <h2>{t('analysis.mySkills')}</h2>
              <span className="section-tag">
                {skills.length > 4
                  ? t('analysis.mySkills.showing', {
                      n: skills.length,
                      m: skills.length - 4,
                    })
                  : t('analysis.mySkills.tap')}
              </span>
            </div>
            {skills.length === 0 ? (
              <p className="empty-note">{t('analysis.mySkills.empty')}</p>
            ) : (
              <div
                className={`skill-scroll-shell${
                  skills.length > 4 ? ' scrollable' : ''
                }`}
              >
                <div
                  ref={skillListRef}
                  className="progress-list"
                  role={skills.length > 4 ? 'region' : undefined}
                  aria-label={
                    skills.length > 4
                      ? t('analysis.listAria', { n: skills.length })
                      : undefined
                  }
                  tabIndex={skills.length > 4 ? 0 : undefined}
                >
                  {skills.map((skill) => {
                    const removing = removingSkillId === skill.id

                    return (
                      <article
                        className={`progress-row${removing ? ' removing' : ''}`}
                        key={skill.id}
                        aria-busy={removing || undefined}
                      >
                        <span className="progress-name">
                          {skill.skillCode ? (
                            <LocalizedText text={skill.name} />
                          ) : (
                            skill.name
                          )}
                        </span>
                        <div className="progress-actions">
                          <div
                            className="status-cycle"
                            role="group"
                            aria-label={t('workspace.progressStatus', {
                              name: name(skill.name),
                            })}
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
                                {t(statusKeys[status])}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="remove-skill-button"
                            disabled={busy || removing}
                            aria-label={t('analysis.removeAria', {
                              name: name(skill.name),
                            })}
                            title={t('analysis.removeAria', {
                              name: name(skill.name),
                            })}
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
            <p className="eyebrow">{t('analysis.mySkills')}</p>
            <h2 id="remove-skill-confirm-title">
              {t('analysis.remove.title')}
            </h2>
            <p id="remove-skill-confirm-description">
              {t('analysis.remove.sub')}
            </p>

            <div className="remove-skill-summary">
              <small>{t('analysis.remove.skill')}</small>
              <strong>
                {pendingRemoval.skillCode ? (
                  <LocalizedText text={pendingRemoval.name} />
                ) : (
                  pendingRemoval.name
                )}
              </strong>
            </div>

            {removeError && (
              <p className="field-error" role="alert">
                {localizeMessage(removeError, t)}
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
                {t('analysis.remove.cancel')}
              </button>
              <button
                type="button"
                className="btn danger"
                disabled={busy}
                onClick={() => void confirmRemoval()}
              >
                {busy ? t('analysis.removing') : t('analysis.remove.confirm')}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
