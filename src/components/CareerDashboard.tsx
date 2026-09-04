import type { Profile } from '../lib/profileApi'
import type { SaveSkillResult, Skill } from '../lib/skillsApi'
import type { RoleSuggestion } from '../lib/suggestionApi'
import type { TargetRole } from '../lib/targetRoleApi'
import { RoleRequirements } from './RoleRequirements'
import { CareerSuggestions } from './CareerSuggestions'

type CareerDashboardProps = {
  profile: Profile
  skills: Skill[]
  targetRole: TargetRole | null
  suggestionsRefresh: number
  onEditProfile: () => void
  onAddSkill: (name: string, skillCode: string) => Promise<SaveSkillResult>
  onChooseRole: (suggestion: RoleSuggestion) => void
}

// The dashboard brings the saved profile into one quick summary.
export function CareerDashboard({
  profile,
  skills,
  targetRole,
  suggestionsRefresh,
  onEditProfile,
  onAddSkill,
  onChooseRole,
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

      {/* Suggestions load either side of the chosen target role. */}
      <CareerSuggestions
        profileCode={profile.code}
        currentTargetRole={targetRole}
        refreshKey={suggestionsRefresh}
        onChooseRole={onChooseRole}
      />

      {/* Requirements load only after a catalogue occupation has been saved. */}
      {targetRole && (
        <RoleRequirements
          key={targetRole.code}
          profileCode={profile.code}
          targetRole={targetRole}
          savedSkills={skills}
          onAddSkill={onAddSkill}
        />
      )}

      {/* Editing stays in the existing profile flow instead of duplicating forms. */}
      <div className="dashboard-actions">
        <button type="button" className="secondary" onClick={onEditProfile}>
          Edit profile
        </button>
      </div>
    </section>
  )
}
