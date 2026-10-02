import type { RoleRequirements as RequirementsData } from '../../lib/roleRequirementsApi'
import type { Skill } from '../../lib/skillsApi'
import type { TargetRole } from '../../lib/targetRoleApi'
import { occupationTitle } from '../../lib/occupationTitle'
import { useI18n } from '../../lib/useI18n'
import { useLocalizedText } from '../../lib/useLocalizedText'
import { LocalizedText } from '../LocalizedText'

type PathwaysPageProps = {
  targetRole: TargetRole | null
  requirements: RequirementsData | null
  skills: Skill[]
  onGoRole: () => void
}

// The roadmap page gathers the iteration 2 learning story in one place:
// priorities ordered by importance, the linked training routes, and a
// progress tracker that splits every saved skill into its bucket.
export function PathwaysPage({
  targetRole,
  requirements,
  skills,
  onGoRole,
}: PathwaysPageProps) {
  const { t } = useI18n()
  const roleTitle = useLocalizedText(occupationTitle(targetRole?.title ?? ''))
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

  return (
    <>
      <section className="app-hero">
        <p className="eyebrow">{t('pathways.eyebrow')}</p>
        <h1>
          {targetRole
            ? t('pathways.h1', { role: roleTitle })
            : t('pathways.h1Plain')}
        </h1>
        <p className="app-hero-sub">{t('workspace.pathwaysIntro')}</p>
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
              <p className="tracker-empty">{t('workspace.noCompleted')}</p>
            ) : (
              <ul>
                {completed.map((skill) => (
                  <li key={skill.id}>
                    {skill.skillCode ? (
                      <LocalizedText text={skill.name} />
                    ) : (
                      skill.name
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
          <article className="tracker-card">
            <p className="panel-title">{t('pathways.current')}</p>
            <span className="tracker-count">{current.length}</span>
            {current.length === 0 ? (
              <p className="tracker-empty">{t('workspace.noCurrent')}</p>
            ) : (
              <ul>
                {current.map((skill) => (
                  <li key={skill.id}>
                    {skill.skillCode ? (
                      <LocalizedText text={skill.name} />
                    ) : (
                      skill.name
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
          <article className="tracker-card">
            <p className="panel-title">{t('pathways.upcoming')}</p>
            <span className="tracker-count">{upcoming.length}</span>
            {upcoming.length === 0 ? (
              <p className="tracker-empty">{t('workspace.noUpcoming')}</p>
            ) : (
              <ul>
                {upcoming.map((skill) => (
                  <li key={skill.id}>
                    {skill.skillCode ? (
                      <LocalizedText text={skill.name} />
                    ) : (
                      skill.name
                    )}
                  </li>
                ))}
              </ul>
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
                <strong>
                  <LocalizedText text={skill.name} />
                </strong>
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
              ? t('workspace.noPriorities')
              : t('workspace.choosePriorities')}
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
                <strong>
                  <LocalizedText text={qualification.title} />
                </strong>
                <small>
                  {t('workspace.learningType')}{' '}
                  <LocalizedText text={qualification.qualificationLevel} /> ·{' '}
                  {t('workspace.topic')}{' '}
                  <LocalizedText text={qualification.relationship} />
                </small>
                {qualification.specialConditions && (
                  <p className="qual-note">
                    <LocalizedText text={qualification.specialConditions} />
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-note">
            {targetRole ? t('workspace.noTraining') : t('pathways.noTraining')}
          </p>
        )}
        {targetRole && (
          <button type="button" className="link-btn" onClick={onGoRole}>
            {t('pathways.reviewRole')}
          </button>
        )}
      </section>
    </>
  )
}
