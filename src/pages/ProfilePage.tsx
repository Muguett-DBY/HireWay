import { useState, type FormEvent } from 'react'
import {
  requestProfile,
  type Profile,
  type ProfileDetails,
  type ProfileErrors,
} from '../lib/profileApi'
import { addSkill, loadSkills, removeSkill, type Skill } from '../lib/skillsApi'
// Use the helper that talks to the career goal endpoint.
import { requestGoal } from '../lib/goalApi'
// A new form starts with no background details.
const emptyDetails: ProfileDetails = {
  qualification: '',
  educationLevel: '',
  currentRole: '',
}

export function ProfilePage() {
  // Keep the saved record separate from the fields being edited.
  const [screen, setScreen] = useState<'home' | 'profile'>('home')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [details, setDetails] = useState<ProfileDetails>(emptyDetails)
  const [recoveryCode, setRecoveryCode] = useState('')
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  const [skillName, setSkillName] = useState('')
  const [skillError, setSkillError] = useState('')
  const [skillsBusy, setSkillsBusy] = useState(false)
  // Keep the goal draft and its feedback separate from the other forms.
  const [careerGoal, setCareerGoal] = useState('')
  const [goalError, setGoalError] = useState('')
  const [goalMessage, setGoalMessage] = useState('')
  const [goalBusy, setGoalBusy] = useState(false)

  // Fill the form with the values that actually came back from D1.
  function showProfile(saved: Profile) {
    setProfile(saved)
    setDetails({
      qualification: saved.qualification,
      educationLevel: saved.educationLevel,
      currentRole: saved.currentRole,
    })
    setRecoveryCode(saved.code)
    setErrors({})
    setScreen('profile')
  }

  // Typing changes the draft, not the database.
  function updateField(field: keyof ProfileDetails, value: string) {
    setDetails((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setMessage('')
  }

  // Starting again clears the form without deleting a saved profile.
  function startProfile() {
    setProfile(null)
    setDetails(emptyDetails)
    setErrors({})
    setMessage('')
    setFailed(false)
    setSkills([])
    setSkillName('')
    setSkillError('')
    // Do not carry a previous profile's goal into a new profile.
    setCareerGoal('')
    setGoalError('')
    setGoalMessage('')
    setScreen('profile')
  }

  // Use a recovery code to load an existing record.
  async function loadProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setFailed(false)

    if (!recoveryCode.trim()) {
      setMessage('Enter your recovery code.')
      setFailed(true)
      return
    }

    setBusy(true)
    try {
      const result = await requestProfile('GET', recoveryCode.trim())
      if (!result.ok) {
        setMessage(result.data.error ?? 'Could not load your profile.')
        setFailed(true)
        return
      }

      // Fetch skills and the goal together before showing the profile.
      const [skillResult, goalResult] = await Promise.all([
        loadSkills(result.data.code),
        requestGoal('GET', result.data.code),
      ])

      if (!skillResult.ok) {
        setMessage(skillResult.data.error ?? 'Could not load your skills.')
        setFailed(true)
        return
      }

      if (!goalResult.ok) {
        setMessage(goalResult.data.error ?? 'Could not load your career goal.')
        setFailed(true)
        return
      }

      // Display the values returned by the three API requests.
      showProfile(result.data)
      setSkills(skillResult.data.skills)
      setSkillName('')
      setSkillError('')
      setCareerGoal(goalResult.data.careerGoal)
      setGoalError('')
      setGoalMessage('')
      setMessage('Profile loaded.')
    } catch {
      setMessage('Could not connect. Please try again.')
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  // Check the required fields before sending the form.
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setFailed(false)
    const nextErrors: ProfileErrors = {}

    if (!details.qualification.trim()) {
      nextErrors.qualification = 'Enter your qualification.'
    }
    if (!details.educationLevel) {
      nextErrors.educationLevel = 'Select your education level.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    // A saved profile uses PUT; a new profile uses POST.
    const creating = !profile
    setBusy(true)
    try {
      const result = await requestProfile(
        profile ? 'PUT' : 'POST',
        profile?.code ?? '',
        details,
      )
      if (!result.ok) {
        setErrors(result.data.errors ?? {})
        setMessage(result.data.error ?? 'Check the highlighted fields.')
        setFailed(true)
        return
      }

      showProfile(result.data)

      // New profiles start empty; education edits keep the skills and goal.
      if (creating) {
        setSkills([])
        setCareerGoal('')
        setGoalError('')
        setGoalMessage('')
      }

      setMessage('Profile saved.')
    } catch {
      setMessage('Could not save. Please try again.')
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  // Save one current goal after the main profile exists.
  async function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGoalError('')
    setGoalMessage('')

    if (!profile) {
      setGoalError('Save your profile before choosing a career goal.')
      return
    }

    const goal = careerGoal.trim()
    if (!goal) {
      setGoalError('Enter a career goal.')
      return
    }

    setGoalBusy(true)

    try {
      const result = await requestGoal('PUT', profile.code, goal)

      if (!result.ok) {
        setGoalError(result.data.error ?? 'Could not save your career goal.')
        return
      }

      // Use the saved value so the field matches the database.
      setCareerGoal(result.data.careerGoal)
      setGoalMessage('Career goal saved.')
    } catch {
      setGoalError('Could not connect. Please try again.')
    } finally {
      setGoalBusy(false)
    }
  }
  // Save one new skill after the main profile exists.
  async function submitSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSkillError('')

    if (!profile) {
      setSkillError('Save your profile before adding skills.')
      return
    }

    const name = skillName.trim()
    if (!name) {
      setSkillError('Enter a skill name.')
      return
    }

    setSkillsBusy(true)
    try {
      const result = await addSkill(profile.code, name)
      if (!result.ok) {
        setSkillError(result.data.error ?? 'Could not add this skill.')
        return
      }

      setSkills((current) => [...current, result.data])
      setSkillName('')
    } catch {
      setSkillError('Could not connect. Please try again.')
    } finally {
      setSkillsBusy(false)
    }
  }

  // Remove only the selected skill from this profile.
  async function deleteSkill(id: number) {
    if (!profile) return

    setSkillError('')
    setSkillsBusy(true)

    try {
      const result = await removeSkill(profile.code, id)
      if (!result.ok) {
        setSkillError(result.data.error ?? 'Could not remove this skill.')
        return
      }

      setSkills((current) => current.filter((skill) => skill.id !== id))
    } catch {
      setSkillError('Could not connect. Please try again.')
    } finally {
      setSkillsBusy(false)
    }
  }

  return (
    <>
      {/* Keep navigation available without leaving the app. */}
      <header className="site-header">
        <span className="brand">HireWay</span>
        {screen === 'profile' && (
          <button
            type="button"
            className="secondary"
            disabled={busy || skillsBusy || goalBusy}
            onClick={() => {
              setScreen('home')
              setMessage('')
              setErrors({})
              setSkillName('')
              setSkillError('')
              setGoalError('')
              setGoalMessage('')
            }}
          >
            Back to home
          </button>
        )}
      </header>

      <main>
        <h1>
          {screen === 'home' ? 'Start your career journey' : 'Your background'}
        </h1>
        <p className="intro">
          {screen === 'home'
            ? 'Create a profile or continue with your recovery code.'
            : 'Tell us about your education and current role.'}
        </p>

        {/* Announce the result without replacing the user's input. */}
        {message && (
          <p
            className={failed ? 'notice error' : 'notice success'}
            role={failed ? 'alert' : 'status'}
          >
            {message}
          </p>
        )}

        {screen === 'home' ? (
          <div className="home-grid">
            {/* Returning visitors can restore their saved details. */}
            <form className="card" onSubmit={loadProfile} noValidate>
              <h2>Continue your profile</h2>
              <label htmlFor="recovery-code">Recovery code</label>
              <input
                id="recovery-code"
                value={recoveryCode}
                onChange={(event) => {
                  setRecoveryCode(event.target.value)
                  setMessage('')
                }}
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
              />
              <button type="submit" disabled={busy}>
                {busy ? 'Loading...' : 'Load profile'}
              </button>
            </form>

            {/* This only opens a blank form; it does not create a database row. */}
            <section className="card">
              <h2>Create a personal profile</h2>
              <p>
                No account is needed. Save your code after saving your details.
              </p>
              <button
                type="button"
                className="secondary"
                onClick={startProfile}
                disabled={busy}
              >
                Create profile
              </button>
            </section>
          </div>
        ) : (
          <div className="profile-stack">
            <form
              className="card profile-card"
              onSubmit={saveProfile}
              noValidate
            >
              {/* Disable the fields while a save is running. */}
              <fieldset disabled={busy}>
                <legend>Background details</legend>
                <p>Fields marked * are required.</p>

                <label htmlFor="qualification">Degree / Major *</label>
                <input
                  id="qualification"
                  value={details.qualification}
                  onChange={(event) =>
                    updateField('qualification', event.target.value)
                  }
                  maxLength={200}
                  required
                  aria-invalid={Boolean(errors.qualification)}
                  aria-describedby={
                    errors.qualification ? 'qualification-error' : undefined
                  }
                />
                {errors.qualification && (
                  <p
                    id="qualification-error"
                    className="field-error"
                    role="alert"
                  >
                    {errors.qualification}
                  </p>
                )}

                <label htmlFor="education-level">Education level *</label>
                <select
                  id="education-level"
                  value={details.educationLevel}
                  onChange={(event) =>
                    updateField('educationLevel', event.target.value)
                  }
                  required
                  aria-invalid={Boolean(errors.educationLevel)}
                  aria-describedby={
                    errors.educationLevel ? 'education-error' : undefined
                  }
                >
                  <option value="">Select your education level</option>
                  <option value="High School">High School</option>
                  <option value="Diploma / Certificate">
                    Diploma / Certificate
                  </option>
                  <option value="Bachelor">Bachelor's degree</option>
                  <option value="Master">Master's degree</option>
                  <option value="Doctorate">Doctorate (PhD)</option>
                  <option value="Other">Other</option>
                </select>
                {errors.educationLevel && (
                  <p id="education-error" className="field-error" role="alert">
                    {errors.educationLevel}
                  </p>
                )}

                <label htmlFor="current-role">Current role (optional)</label>
                <input
                  id="current-role"
                  value={details.currentRole}
                  onChange={(event) =>
                    updateField('currentRole', event.target.value)
                  }
                  maxLength={120}
                  aria-invalid={Boolean(errors.currentRole)}
                  aria-describedby={
                    errors.currentRole ? 'role-error' : undefined
                  }
                />
                {errors.currentRole && (
                  <p id="role-error" className="field-error" role="alert">
                    {errors.currentRole}
                  </p>
                )}

                <button type="submit">
                  {busy
                    ? 'Saving...'
                    : profile
                      ? 'Save changes'
                      : 'Save profile'}
                </button>
              </fieldset>

              {/* Keep the code visible so the user can copy it. */}
              {profile && (
                <section className="recovery-note">
                  <label htmlFor="saved-code">Your recovery code</label>
                  <input
                    id="saved-code"
                    value={profile.code}
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                    aria-describedby="code-help"
                  />
                  <p id="code-help">
                    Keep this code private. Anyone with it can view and edit
                    your profile. Use it to return after closing or refreshing
                    the page.
                  </p>
                </section>
              )}
            </form>

            {/* Skills are linked to the profile created by the first form. */}
            {profile && (
              <section className="card profile-card skills-card">
                <h2>Current skills</h2>
                <p>Add the skills and tools you already use.</p>

                <form onSubmit={submitSkill} noValidate>
                  <label htmlFor="skill-name">Skill or tool</label>
                  <div className="skill-entry">
                    <input
                      id="skill-name"
                      value={skillName}
                      onChange={(event) => {
                        setSkillName(event.target.value)
                        setSkillError('')
                      }}
                      maxLength={80}
                      disabled={skillsBusy}
                      aria-invalid={Boolean(skillError)}
                      aria-describedby={skillError ? 'skill-error' : undefined}
                    />
                    <button type="submit" disabled={skillsBusy}>
                      {skillsBusy ? 'Working...' : 'Add skill'}
                    </button>
                  </div>

                  {skillError && (
                    <p id="skill-error" className="field-error" role="alert">
                      {skillError}
                    </p>
                  )}
                </form>

                {/* Keep an empty message until the first skill is added. */}
                {skills.length === 0 ? (
                  <p className="empty-skills">No skills added yet.</p>
                ) : (
                  <ul className="skills-list">
                    {skills.map((skill) => (
                      <li key={skill.id}>
                        <span>{skill.name}</span>
                        <button
                          type="button"
                          className="secondary"
                          disabled={skillsBusy}
                          onClick={() => deleteSkill(skill.id)}
                          aria-label={`Remove ${skill.name}`}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
            {/* A career goal is saved separately from education and skills. */}
            {profile && (
              <form
                className="card profile-card"
                onSubmit={submitGoal}
                noValidate
              >
                <fieldset disabled={busy || goalBusy}>
                  <legend>Career goal</legend>
                  <p>Choose one role you would like to work towards.</p>

                  <label htmlFor="career-goal">Target role *</label>
                  <input
                    id="career-goal"
                    value={careerGoal}
                    onChange={(event) => {
                      setCareerGoal(event.target.value)
                      setGoalError('')
                      setGoalMessage('')
                    }}
                    maxLength={120}
                    required
                    aria-invalid={Boolean(goalError)}
                    aria-describedby={
                      goalError ? 'goal-help goal-error' : 'goal-help'
                    }
                  />

                  <p id="goal-help">
                    Saving a new goal replaces your previous goal.
                  </p>

                  {goalError && (
                    <p id="goal-error" className="field-error" role="alert">
                      {goalError}
                    </p>
                  )}

                  <button type="submit">
                    {goalBusy ? 'Saving...' : 'Save goal'}
                  </button>
                </fieldset>

                {goalMessage && (
                  <p className="notice success" role="status">
                    {goalMessage}
                  </p>
                )}
              </form>
            )}
          </div>
        )}
      </main>
    </>
  )
}
