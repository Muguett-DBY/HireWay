import { useEffect, useState } from 'react'
import {
  loadRoleRequirements,
  type RoleRequirements as RoleRequirementsData,
} from '../lib/roleRequirementsApi'
import type { TargetRole } from '../lib/targetRoleApi'

type RoleRequirementsProps = {
  profileCode: string
  targetRole: TargetRole
}

// This section turns the saved occupation into practical role information.
export function RoleRequirements({
  profileCode,
  targetRole,
}: RoleRequirementsProps) {
  const [requirements, setRequirements] = useState<RoleRequirementsData | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
            <article className="requirement-panel">
              <span className="requirement-label">Common skills</span>
              {requirements.skills.length > 0 ? (
                <ul className="requirement-list skill-requirement-list">
                  {requirements.skills.map((skill) => (
                    <li key={skill.code}>{skill.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="requirements-unavailable">
                  No suitable skill data is available for this role yet.
                </p>
              )}
            </article>

            <article className="requirement-panel">
              <span className="requirement-label">Training pathways</span>
              {requirements.qualifications.length > 0 ? (
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
              ) : (
                <p className="requirements-unavailable">
                  No suitable qualification data is available for this role yet.
                </p>
              )}
            </article>
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
              Skills use US O*NET data and do not represent a guarantee of what
              every Australian employer will require. TOP content is ©
              Commonwealth of Australia.
            </p>
          </aside>
        </>
      )}
    </section>
  )
}
