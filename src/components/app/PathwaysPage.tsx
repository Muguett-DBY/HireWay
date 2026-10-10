import { useEffect, useState } from 'react'
import type { RoleRequirements as RequirementsData } from '../../lib/roleRequirementsApi'
import type { Skill, SkillStatus } from '../../lib/skillsApi'
import type { TargetRole } from '../../lib/targetRoleApi'
import { occupationTitle } from '../../lib/occupationTitle'
import { useI18n } from '../../lib/useI18n'
import { videosForSkill } from '../../lib/learningVideos'
import {
  loadProgress,
  saveProgress,
  type SkillWithProgress,
} from '../../lib/progressApi'
import { LearningPlayer } from './LearningPlayer'

type PathwaysPageProps = {
  targetRole: TargetRole | null
  requirements: RequirementsData | null
  skills: Skill[]
  profileCode: string
  busy: boolean
  onGoRole: () => void
  onSkillStatus: (skill: Skill, status: SkillStatus) => void
}

// The roadmap page gathers the iteration 2 learning story in one place:
// priorities ordered by importance, the linked training routes, and a
// progress tracker that splits every saved skill into its bucket.
export function PathwaysPage({
  targetRole,
  requirements,
  skills,
  profileCode,
  busy,
  onGoRole,
  onSkillStatus,
}: PathwaysPageProps) {
  const { t } = useI18n()
  // Learning progress per skill code, loaded once and patched per session.
  const [progress, setProgress] = useState<Map<string, SkillWithProgress>>(
    () => new Map(),
  )
  const [activeSkillId, setActiveSkillId] = useState<number | null>(null)
  // Keep the open player's status in sync after a successful completion.
  const activeSkill = skills.find((skill) => skill.id === activeSkillId) ?? null
  const [sessionBusy, setSessionBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void loadProgress(profileCode)
      .then((result) => {
        if (controller.signal.aborted) return
        const next = new Map<string, SkillWithProgress>()
        if (result.ok) {
          for (const row of result.data.skills) {
            if (row.skillCode) next.set(row.skillCode, row)
          }
        }
        setProgress(next)
      })
      .catch(() => {
        // The page still works without progress figures.
      })
    return () => controller.abort()
  }, [profileCode])

  // Learning priorities: the role's missing skills, most important first.
  const savedCodes = new Set(
    skills.flatMap((skill) =>
      skill.skillCode ? [skill.skillCode] : [skill.name.toLowerCase()],
    ),
  )
  const priorities = (requirements?.skills ?? [])
    .filter((skill) => !savedCodes.has(skill.code))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)

  const completed = skills.filter((skill) => skill.status === 'completed')
  const current = skills.filter((skill) => skill.status === 'current')
  const upcoming = skills.filter((skill) => skill.status === 'upcoming')
  const tracked = skills.length
  const readiness =
    tracked > 0
      ? Math.round(((completed.length + current.length) / tracked) * 100)
      : 0

  function progressFor(skill: Skill): SkillWithProgress | null {
    return skill.skillCode ? (progress.get(skill.skillCode) ?? null) : null
  }

  // One watched session: send the seconds, then fold the saved record in.
  async function recordSession(
    skillCode: string,
    seconds: number,
    candidatePct: number,
  ) {
    setSessionBusy(true)
    try {
      const result = await saveProgress(
        profileCode,
        skillCode,
        seconds,
        candidatePct,
      )
      if (result.ok) {
        setProgress((map) => {
          const existing = map.get(skillCode)
          const next = new Map(map)
          next.set(skillCode, {
            id: existing?.id ?? 0,
            name: existing?.name ?? '',
            skillCode,
            status: existing?.status ?? 'current',
            learningMinutes: existing?.learningMinutes ?? 0,
            progressPct: result.data.progressPct,
            secondsTotal: result.data.secondsTotal,
            sessions: result.data.sessions,
            lastSessionAt: result.data.lastSessionAt,
          })
          return next
        })
      }
    } catch {
      // The session keeps playing; the next report retries the save.
    } finally {
      setSessionBusy(false)
    }
  }

  // One tracker row: name, percent watched and the player trigger.
  function trackerRow(skill: Skill) {
    const record = progressFor(skill)
    const pct = record?.progressPct ?? 0
    const hasVideos = videosForSkill(skill.name).length > 0

    return (
      <li className="learning-row" key={skill.id}>
        <strong>{skill.name}</strong>
        {pct > 0 && (
          <span className="learning-row-progress">
            {t('learning.progress', { n: pct })}
          </span>
        )}
        {hasVideos && skill.skillCode && (
          <button
            type="button"
            className="learning-row-btn"
            disabled={busy}
            aria-label={
              pct > 0
                ? t('learning.viewAria', { name: skill.name })
                : t('learning.startAria', { name: skill.name })
            }
            onClick={() => setActiveSkillId(skill.id)}
          >
            {pct > 0 ? t('learning.view') : t('learning.start')}
          </button>
        )}
      </li>
    )
  }

  const activeRecord = activeSkill ? progressFor(activeSkill) : null

  return (
    <>
      <section className="app-hero">
        <p className="eyebrow">{t('pathways.eyebrow')}</p>
        <h1>
          {targetRole
            ? t('pathways.h1', { role: occupationTitle(targetRole.title) })
            : t('pathways.h1Plain')}
        </h1>
        <p className="app-hero-sub">
          Priorities from the gap analysis, training routes linked in official
          data, and your progress in one view. Everything here refreshes as your
          profile changes.
        </p>
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>{t('pathways.progress')}</h2>
          <span className="section-tag">
            {t('pathways.progress.tag', { n: readiness })}
          </span>
        </div>
        <div className="tracker-grid">
          <article className="tracker-card">
            <p className="panel-title">{t('pathways.completed')}</p>
            <span className="tracker-count">{completed.length}</span>
            {completed.length === 0 ? (
              <p className="tracker-empty">
                Nothing completed yet - mark a skill as completed when you have
                it nailed.
              </p>
            ) : (
              <ul>{completed.map((skill) => trackerRow(skill))}</ul>
            )}
          </article>
          <article className="tracker-card">
            <p className="panel-title">{t('pathways.current')}</p>
            <span className="tracker-count">{current.length}</span>
            {current.length === 0 ? (
              <p className="tracker-empty">
                No current skills tracked. Add the strengths you already use.
              </p>
            ) : (
              <ul>{current.map((skill) => trackerRow(skill))}</ul>
            )}
          </article>
          <article className="tracker-card">
            <p className="panel-title">{t('pathways.upcoming')}</p>
            <span className="tracker-count">{upcoming.length}</span>
            {upcoming.length === 0 ? (
              <p className="tracker-empty">
                Nothing planned yet. Add a missing skill from the analysis page
                to start a plan.
              </p>
            ) : (
              <ul>{upcoming.map((skill) => trackerRow(skill))}</ul>
            )}
          </article>
        </div>
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>{t('pathways.priorities')}</h2>
          <span className="section-tag">{t('pathways.priorities.tag')}</span>
        </div>
        {priorities.length > 0 ? (
          <ol className="priority-list">
            {priorities.map((skill, index) => (
              <li className="priority-row" key={skill.code}>
                <span className="priority-rank">{index + 1}</span>
                <strong>{skill.name}</strong>
                <span className="priority-kind">
                  {skill.priority === 'essential'
                    ? t('pathways.kind.core')
                    : skill.priority === 'recommended'
                      ? t('pathways.kind.recommended')
                      : t('pathways.kind.bonus')}
                </span>
                <small>{t('pathways.importance', { n: skill.score })}</small>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-note">
            {targetRole
              ? 'No outstanding priorities - your profile covers the listed skills.'
              : 'Choose a target role to see your learning priorities.'}
          </p>
        )}
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>{t('pathways.training')}</h2>
        </div>
        {requirements && requirements.qualifications.length > 0 ? (
          <div className="qual-grid wide">
            {requirements.qualifications.map((qualification) => (
              <article className="qual-card" key={qualification.code}>
                <strong>{qualification.title}</strong>
                <small>
                  Learning type: {qualification.qualificationLevel} · Topic:{' '}
                  {qualification.relationship}
                </small>
                {qualification.specialConditions && (
                  <p className="qual-note">{qualification.specialConditions}</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-note">
            {targetRole
              ? t('pathways.noTrainingRole')
              : t('pathways.noTraining')}
          </p>
        )}
        {targetRole && (
          <button type="button" className="link-btn" onClick={onGoRole}>
            {t('pathways.reviewRole')}
          </button>
        )}
      </section>

      <LearningPlayer
        skill={activeSkill}
        videos={activeSkill ? videosForSkill(activeSkill.name) : []}
        progressPct={activeRecord?.progressPct ?? 0}
        secondsTotal={activeRecord?.secondsTotal ?? 0}
        sessions={activeRecord?.sessions ?? 0}
        busy={sessionBusy || busy}
        onMarkCompleted={(skill) => onSkillStatus(skill, 'completed')}
        onSession={(skillCode, seconds, candidatePct) => {
          void recordSession(skillCode, seconds, candidatePct)
        }}
        onClose={() => setActiveSkillId(null)}
      />
    </>
  )
}
