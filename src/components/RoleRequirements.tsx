import { useEffect, useState } from 'react'
import {
  loadRoleRequirements,
  type RoleSkill,
  type RoleRequirements as RoleRequirementsData,
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
                                  {hasSkill(skill)
                                    ? `✓ ${skill.name}`
                                    : addingSkillCode === skill.code
                                      ? 'Adding...'
                                      : `+ ${skill.name}`}
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
