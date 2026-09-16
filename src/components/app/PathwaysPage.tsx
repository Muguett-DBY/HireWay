import type { RoleRequirements as RequirementsData } from '../../lib/roleRequirementsApi'
import type { TargetRole } from '../../lib/targetRoleApi'

type PathwaysPageProps = {
  targetRole: TargetRole | null
  requirements: RequirementsData | null
  missingSkills: string[]
  onGoRole: () => void
}

// The pathways page collects the training routes and the practical next
// steps in one place, so the analysis turns into an actionable plan.
export function PathwaysPage({
  targetRole,
  requirements,
  missingSkills,
  onGoRole,
}: PathwaysPageProps) {
  const nextSteps = [
    ...missingSkills.slice(0, 3).map((skill) => `Add ${skill} to your profile`),
    targetRole
      ? 'Review your matches as your profile grows'
      : 'Choose a target role to unlock matching',
  ]

  return (
    <>
      <section className="app-hero">
        <p className="eyebrow">Pathways &amp; next steps</p>
        <h1>
          {targetRole
            ? `Training routes towards ${targetRole.title}`
            : 'Training routes'}
        </h1>
        <p className="app-hero-sub">
          These courses are linked to the occupation in official data. They are
          optional routes, not requirements set by employers.
        </p>
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>Australian VET pathways</h2>
        </div>
        {requirements && requirements.qualifications.length > 0 ? (
          <div className="qual-grid wide">
            {requirements.qualifications.map((qualification) => (
              <article className="qual-card" key={qualification.code}>
                <strong>{qualification.title}</strong>
                <small>{qualification.qualificationLevel}</small>
                <span>{qualification.relationship}</span>
                {qualification.specialConditions && (
                  <p className="qual-note">{qualification.specialConditions}</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-note">
            {targetRole
              ? 'No training pathways are linked to this role yet.'
              : 'Choose a target role to see its linked training routes.'}
          </p>
        )}
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>Recommended next steps</h2>
        </div>
        <div className="steps-panel">
          <ol className="next-steps">
            {nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {targetRole && (
            <button type="button" className="btn" onClick={onGoRole}>
              Review role requirements
            </button>
          )}
        </div>
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
        <p className="section-sub">
          Pathway links are © Commonwealth of Australia (Jobs and Skills
          Australia), CC BY 4.0.
        </p>
      </section>
    </>
  )
}
