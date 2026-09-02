import type { Profile } from '../lib/profileApi'
import type { Skill } from '../lib/skillsApi'
import type { TargetRole } from '../lib/targetRoleApi'

type CareerDashboardProps = {
  profile: Profile
  skills: Skill[]
  careerGoal: string
  targetRole: TargetRole | null
  onEditProfile: () => void
}

// The dashboard brings the saved profile into one quick summary.
export function CareerDashboard({
  profile,
  skills,
  careerGoal,
  targetRole,
  onEditProfile,
}: CareerDashboardProps) {
  return (
    <section className="career-dashboard" aria-labelledby="dashboard-title">
      {/* The selected occupation is the first thing a returning user sees. */}
      <div className="dashboard-hero">
        <p className="eyebrow">Your career dashboard</p>
        <span className="dashboard-label">Target role</span>
        <h1 id="dashboard-title">
          {targetRole?.title ?? 'Choose your target role'}
        </h1>
        <p className="dashboard-summary">
          {targetRole?.description ||
            'Search the Australian occupation catalogue to choose a direction.'}
        </p>
        <button type="button" onClick={onEditProfile}>
          {targetRole ? 'Change target role' : 'Choose target role'}
        </button>
      </div>

      {/* These cards only show information the user has actually saved. */}
      <div className="dashboard-grid">
        <article className="dashboard-card">
          <span>Background</span>
          <h2>{profile.qualification}</h2>
          <p>{profile.educationLevel}</p>
          {profile.currentRole && (
            <small>Current role: {profile.currentRole}</small>
          )}
        </article>

        <article className="dashboard-card">
          <span>Career goal</span>
          <h2>{careerGoal || 'Not added yet'}</h2>
          <p>A personal aim can stay broader than one occupation.</p>
        </article>

        <article className="dashboard-card dashboard-skills-card">
          <span>Current skills</span>
          <h2>{skills.length} saved</h2>
          {skills.length > 0 ? (
            <ul>
              {skills.slice(0, 6).map((skill) => (
                <li key={skill.id}>{skill.name}</li>
              ))}
            </ul>
          ) : (
            <p>Add the skills and tools you already use.</p>
          )}
        </article>
      </div>

      {/* Editing stays in the existing profile flow instead of duplicating forms. */}
      <div className="dashboard-actions">
        <button type="button" className="secondary" onClick={onEditProfile}>
          Edit profile
        </button>
      </div>
    </section>
  )
}
