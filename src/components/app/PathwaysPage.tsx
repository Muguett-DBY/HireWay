import type { RoleRequirements as RequirementsData } from '../../lib/roleRequirementsApi'
import type { Skill } from '../../lib/skillsApi'
import type { TargetRole } from '../../lib/targetRoleApi'

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
        <p className="eyebrow">Pathways &amp; progress</p>
        <h1>
          {targetRole
            ? `Learning roadmap towards ${targetRole.title}`
            : 'Learning roadmap'}
        </h1>
        <p className="app-hero-sub">
          Priorities from the gap analysis, training routes linked in official
          data, and your progress in one view. Everything here refreshes as your
          profile changes.
        </p>
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>Skill progress</h2>
          <span className="section-tag">
            {readiness}% of your tracked skills are in place
          </span>
        </div>
        <div className="tracker-grid">
          <article className="tracker-card">
            <p className="panel-title">Completed</p>
            <span className="tracker-count">{completed.length}</span>
            {completed.length === 0 ? (
              <p className="tracker-empty">
                Nothing completed yet - mark a skill as completed when you have
                it nailed.
              </p>
            ) : (
              <ul>
                {completed.map((skill) => (
                  <li key={skill.id}>{skill.name}</li>
                ))}
              </ul>
            )}
          </article>
          <article className="tracker-card">
            <p className="panel-title">Current</p>
            <span className="tracker-count">{current.length}</span>
            {current.length === 0 ? (
              <p className="tracker-empty">
                No current skills tracked. Add the strengths you already use.
              </p>
            ) : (
              <ul>
                {current.map((skill) => (
                  <li key={skill.id}>{skill.name}</li>
                ))}
              </ul>
            )}
          </article>
          <article className="tracker-card">
            <p className="panel-title">Upcoming</p>
            <span className="tracker-count">{upcoming.length}</span>
            {upcoming.length === 0 ? (
              <p className="tracker-empty">
                Nothing planned yet. Add a missing skill from the analysis page
                to start a plan.
              </p>
            ) : (
              <ul>
                {upcoming.map((skill) => (
                  <li key={skill.id}>{skill.name}</li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>Learning priorities</h2>
          <span className="section-tag">Ordered by importance score</span>
        </div>
        {priorities.length > 0 ? (
          <ol className="priority-list">
            {priorities.map((skill, index) => (
              <li className="priority-row" key={skill.code}>
                <span className="priority-rank">{index + 1}</span>
                <strong>{skill.name}</strong>
                <span className="priority-kind">
                  {skill.priority === 'essential'
                    ? 'Core skill'
                    : skill.priority === 'recommended'
                      ? 'Transferable skill'
                      : 'Common tool'}
                </span>
                <small>Importance {skill.score}</small>
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
          <h2>Training options</h2>
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
              ? 'No training pathways are linked to this role yet - only routes published in the official data appear here.'
              : 'Choose a target role to see its linked training routes.'}
          </p>
        )}
        {targetRole && (
          <button type="button" className="link-btn" onClick={onGoRole}>
            Review role requirements →
          </button>
        )}
      </section>
    </>
  )
}
