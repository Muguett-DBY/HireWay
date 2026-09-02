import { useEffect, useState, type FormEvent } from 'react'
import {
  requestProfile,
  type Profile,
  type ProfileDetails,
  type ProfileErrors,
} from '../lib/profileApi'
import { addSkill, loadSkills, removeSkill, type Skill } from '../lib/skillsApi'
// Use the helper that talks to the career goal endpoint.
import { requestGoal } from '../lib/goalApi'
import { requestTargetRole, type TargetRole } from '../lib/targetRoleApi'
import {
  loadSkillRecommendations,
  searchOptions,
  type CatalogueOption,
  type SkillRecommendation,
} from '../lib/optionsApi'
// A new form starts with no background details.
const emptyDetails: ProfileDetails = {
  qualification: '',
  qualificationCode: null,
  educationLevel: '',
  currentRole: '',
}

export function ProfilePage() {
  // Keep the saved record separate from the fields being edited.
  const [screen, setScreen] = useState<'home' | 'profile'>('home')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [details, setDetails] = useState<ProfileDetails>(emptyDetails)
  const [recoveryCode, setRecoveryCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  const [skillName, setSkillName] = useState('')
  const [skillError, setSkillError] = useState('')
  const [skillsBusy, setSkillsBusy] = useState(false)
  const [majorOptions, setMajorOptions] = useState<CatalogueOption[]>([])
  const [skillOptions, setSkillOptions] = useState<CatalogueOption[]>([])
  const [skillCode, setSkillCode] = useState<string | null>(null)
  // Keep the goal draft and its feedback separate from the other forms.
  const [careerGoal, setCareerGoal] = useState('')
  const [goalError, setGoalError] = useState('')
  const [goalMessage, setGoalMessage] = useState('')
  const [goalBusy, setGoalBusy] = useState(false)
  // Keep a typed occupation separate from the role already saved in D1.
  const [targetRole, setTargetRole] = useState<TargetRole | null>(null)
  const [targetRoleQuery, setTargetRoleQuery] = useState('')
  const [targetRoleCode, setTargetRoleCode] = useState<string | null>(null)
  const [targetRoleOptions, setTargetRoleOptions] = useState<CatalogueOption[]>(
    [],
  )
  const [targetRoleError, setTargetRoleError] = useState('')
  const [targetRoleMessage, setTargetRoleMessage] = useState('')
  const [targetRoleBusy, setTargetRoleBusy] = useState(false)
  const [recommendations, setRecommendations] = useState<SkillRecommendation[]>(
    [],
  )
  const [recommendationsBusy, setRecommendationsBusy] = useState(false)

  // Do not suggest a skill the profile has already saved.
  const suggestedSkills = recommendations.filter(
    (suggestion) =>
      !skills.some(
        (skill) =>
          skill.skillCode === suggestion.code ||
          skill.name.toLowerCase() === suggestion.label.toLowerCase(),
      ),
  )

  // Wait briefly before searching so quick typing does not send every keystroke.
  useEffect(() => {
    if (details.qualificationCode || details.qualification.trim().length < 2) {
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void searchOptions(
        'education',
        details.qualification.trim(),
        controller.signal,
      )
        .then(setMajorOptions)
        .catch(() => {
          if (!controller.signal.aborted) setMajorOptions([])
        })
    }, 180)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [details.qualification, details.qualificationCode])

  // Target roles come from Australian occupation titles and aliases.
  useEffect(() => {
    if (targetRoleCode || targetRoleQuery.trim().length < 2) {
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void searchOptions(
        'occupations',
        targetRoleQuery.trim(),
        controller.signal,
      )
        .then(setTargetRoleOptions)
        .catch(() => {
          if (!controller.signal.aborted) setTargetRoleOptions([])
        })
    }, 180)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [targetRoleCode, targetRoleQuery])

  // Skills and named tools use the same O*NET-backed search box.
  useEffect(() => {
    if (skillCode || skillName.trim().length < 2) {
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void searchOptions('skills', skillName.trim(), controller.signal)
        .then(setSkillOptions)
        .catch(() => {
          if (!controller.signal.aborted) setSkillOptions([])
        })
    }, 180)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [skillCode, skillName])

  // Refresh recommendations whenever a recognised major or target role changes.
  useEffect(() => {
    if (!details.qualificationCode && !targetRole) {
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setRecommendationsBusy(true)
      void loadSkillRecommendations(
        details.qualificationCode,
        targetRole?.code ?? null,
        controller.signal,
      )
        .then(setRecommendations)
        .catch(() => {
          if (!controller.signal.aborted) setRecommendations([])
        })
        .finally(() => {
          if (!controller.signal.aborted) setRecommendationsBusy(false)
        })
    }, 0)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [details.qualificationCode, targetRole])

  // Fill the form with the values that actually came back from D1.
  function showProfile(saved: Profile) {
    setProfile(saved)
    setDetails({
      qualification: saved.qualification,
      qualificationCode: saved.qualificationCode,
      educationLevel: saved.educationLevel,
      currentRole: saved.currentRole,
    })
    setRecoveryCode(saved.code)
    setErrors({})
    setMajorOptions([])
    setScreen('profile')
  }

  // Typing changes the draft, not the database.
  function updateField(field: 'educationLevel' | 'currentRole', value: string) {
    setDetails((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setMessage('')
  }

  // Editing the text clears an earlier catalogue choice until it is selected again.
  function updateQualification(value: string) {
    setDetails((current) => ({
      ...current,
      qualification: value,
      qualificationCode: null,
    }))
    setMajorOptions([])
    if (!targetRole) {
      setRecommendations([])
      setRecommendationsBusy(false)
    }
    setErrors((current) => ({ ...current, qualification: undefined }))
    setMessage('')
  }

  // Keep the official title and code together after a menu choice.
  function selectMajor(option: CatalogueOption) {
    setDetails((current) => ({
      ...current,
      qualification: option.label,
      qualificationCode: option.code,
    }))
    setMajorOptions([])
    setErrors((current) => ({ ...current, qualification: undefined }))
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
    setSkillCode(null)
    setSkillOptions([])
    setSkillError('')
    // Do not carry a previous profile's goal into a new profile.
    setCareerGoal('')
    setGoalError('')
    setGoalMessage('')
    setTargetRole(null)
    setTargetRoleQuery('')
    setTargetRoleCode(null)
    setTargetRoleOptions([])
    setTargetRoleError('')
    setTargetRoleMessage('')
    setRecommendations([])
    setRecommendationsBusy(false)
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

      // Fetch the other saved sections before showing the complete profile.
      const [skillResult, goalResult, targetRoleResult] = await Promise.all([
        loadSkills(result.data.code),
        requestGoal('GET', result.data.code),
        requestTargetRole('GET', result.data.code),
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

      if (!targetRoleResult.ok) {
        setMessage(
          targetRoleResult.data.error ?? 'Could not load your target role.',
        )
        setFailed(true)
        return
      }

      // Display the values returned by all four API requests.
      setRecommendations([])
      setRecommendationsBusy(false)
      showProfile(result.data)
      setSkills(skillResult.data.skills)
      setSkillName('')
      setSkillCode(null)
      setSkillOptions([])
      setSkillError('')
      setCareerGoal(goalResult.data.careerGoal)
      setGoalError('')
      setGoalMessage('')
      setTargetRole(targetRoleResult.data.targetRole)
      setTargetRoleQuery(targetRoleResult.data.targetRole?.title ?? '')
      setTargetRoleCode(targetRoleResult.data.targetRole?.code ?? null)
      setTargetRoleOptions([])
      setTargetRoleError('')
      setTargetRoleMessage('')
      setMessage('Profile loaded.')
    } catch {
      setMessage('Could not connect. Please try again.')
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  async function copyRecoveryCode() {
    if (!profile) return

    try {
      await navigator.clipboard.writeText(profile.code)
      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 1800)
    } catch {
      setMessage(
        'Could not copy the recovery code. Please select and copy it manually.',
      )
      setFailed(true)
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
        setTargetRole(null)
        setTargetRoleQuery('')
        setTargetRoleCode(null)
        setTargetRoleOptions([])
        setTargetRoleError('')
        setTargetRoleMessage('')
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

  // Save a catalogue occupation as the profile's current target role.
  async function submitTargetRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTargetRoleError('')
    setTargetRoleMessage('')

    if (!profile) {
      setTargetRoleError('Save your profile before choosing a target role.')
      return
    }

    if (!targetRoleCode) {
      setTargetRoleError('Choose a target role from the suggestions.')
      return
    }

    setTargetRoleBusy(true)
    try {
      const result = await requestTargetRole(
        'PUT',
        profile.code,
        targetRoleCode,
      )

      if (!result.ok || !result.data.targetRole) {
        setTargetRoleError(
          result.ok
            ? 'Could not save your target role.'
            : (result.data.error ?? 'Could not save your target role.'),
        )
        return
      }

      // The official title returned by D1 replaces the search draft.
      setTargetRole(result.data.targetRole)
      setTargetRoleQuery(result.data.targetRole.title)
      setTargetRoleCode(result.data.targetRole.code)
      setTargetRoleOptions([])
      setTargetRoleMessage('Target role saved.')
    } catch {
      setTargetRoleError('Could not connect. Please try again.')
    } finally {
      setTargetRoleBusy(false)
    }
  }
  // Both typed and suggested skills use the same API request.
  async function saveSkill(name: string, selectedCode: string | null = null) {
    if (!profile) {
      setSkillError('Save your profile before adding skills.')
      return
    }

    setSkillsBusy(true)
    try {
      const result = await addSkill(profile.code, name, selectedCode)
      if (!result.ok) {
        setSkillError(result.data.error ?? 'Could not add this skill.')
        return
      }

      setSkills((current) => [...current, result.data])
      setSkillName('')
      setSkillCode(null)
      setSkillOptions([])
    } catch {
      setSkillError('Could not connect. Please try again.')
    } finally {
      setSkillsBusy(false)
    }
  }

  // Save a skill typed into the form.
  async function submitSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSkillError('')

    const name = skillName.trim()
    if (!name) {
      setSkillError('Enter a skill name.')
      return
    }

    await saveSkill(name, skillCode)
  }

  // A suggestion is still optional and only saves after the user clicks it.
  async function addSuggestedSkill(suggestion: SkillRecommendation) {
    setSkillError('')
    await saveSkill(suggestion.label, suggestion.code)
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
      <header className="site-header" id="top">
        <button
          type="button"
          className="brand"
          onClick={() => {
            setScreen('home')
            setMessage('')
            setFailed(false)
          }}
          aria-label="HireWay home"
        >
          <span className="brand-mark" aria-hidden="true">
            H
          </span>
          HireWay
        </button>

        {screen === 'home' ? (
          <nav className="site-nav" aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#continue-profile">Continue profile</a>
            <button type="button" onClick={startProfile} disabled={busy}>
              Get started
            </button>
          </nav>
        ) : (
          <button
            type="button"
            className="secondary"
            disabled={busy || skillsBusy || goalBusy || targetRoleBusy}
            onClick={() => {
              setScreen('home')
              setMessage('')
              setErrors({})
              setSkillName('')
              setSkillError('')
              setGoalError('')
              setGoalMessage('')
              setTargetRoleError('')
              setTargetRoleMessage('')
            }}
          >
            Back to home
          </button>
        )}
      </header>

      <main className={screen === 'home' ? 'landing-page' : 'profile-page'}>
        {screen === 'home' ? (
          <>
            {/* The first screen explains the product before asking for details. */}
            <section className="hero" aria-labelledby="hero-title">
              <div className="hero-copy">
                <p className="eyebrow">Career planning, made clearer</p>
                <h1 id="hero-title">
                  Turn what you know into a career path you can act on.
                </h1>
                <p className="hero-summary">
                  HireWay brings your education, current skills and career goal
                  together, then helps you understand the next steps towards
                  work that suits you.
                </p>

                <div className="hero-actions">
                  <button type="button" onClick={startProfile} disabled={busy}>
                    Build my profile
                  </button>
                  <a className="text-link" href="#how-it-works">
                    See how it works
                  </a>
                </div>

                <ul className="hero-points" aria-label="HireWay benefits">
                  <li>No account required</li>
                  <li>Private recovery code</li>
                  <li>Data-informed direction</li>
                </ul>
              </div>

              {/* This preview makes the pathway idea clear without fake results. */}
              <div
                className="pathway-preview"
                aria-label="Career pathway preview"
              >
                <div className="preview-heading">
                  <div>
                    <span className="preview-kicker">Your pathway</span>
                    <strong>Data Analyst</strong>
                  </div>
                  <span className="preview-status">Building</span>
                </div>

                <div className="preview-progress" aria-hidden="true">
                  <span />
                </div>

                <div className="preview-grid">
                  <article>
                    <span>Background</span>
                    <strong>Data Science</strong>
                    <small>Profile saved</small>
                  </article>
                  <article>
                    <span>Current skills</span>
                    <strong>4 added</strong>
                    <small>Ready to compare</small>
                  </article>
                </div>

                <div className="preview-skills">
                  <span>Python</span>
                  <span>SQL</span>
                  <span>Statistics</span>
                  <span className="skill-gap">+ Skill gaps</span>
                </div>
              </div>
            </section>

            {/* Three short steps show what the user will do in HireWay. */}
            <section
              className="how-it-works"
              id="how-it-works"
              aria-labelledby="steps-title"
            >
              <div className="section-heading">
                <p className="eyebrow">How it works</p>
                <h2 id="steps-title">A clearer direction in three steps</h2>
                <p>
                  Start with what you already know. HireWay keeps the process
                  simple and gives each detail a purpose.
                </p>
              </div>

              <div className="steps-grid">
                <article className="step-card">
                  <span>01</span>
                  <h3>Share your background</h3>
                  <p>
                    Add your education and current role to set a starting point.
                  </p>
                </article>
                <article className="step-card">
                  <span>02</span>
                  <h3>Map your skills</h3>
                  <p>
                    Record the tools and strengths you can already bring to
                    work.
                  </p>
                </article>
                <article className="step-card">
                  <span>03</span>
                  <h3>Choose a direction</h3>
                  <p>
                    Set a career goal and build towards practical next steps.
                  </p>
                </article>
              </div>
            </section>

            {/* New and returning visitors can act from the same section. */}
            <section
              className="profile-entry"
              id="continue-profile"
              aria-labelledby="entry-title"
            >
              <div className="entry-copy">
                <p className="eyebrow">Ready when you are</p>
                <h2 id="entry-title">
                  Start fresh or pick up where you left off.
                </h2>
                <p>
                  Your recovery code is all you need to return. Keep it private,
                  because it gives access to your saved profile.
                </p>
                <button type="button" onClick={startProfile} disabled={busy}>
                  Create a new profile
                </button>
              </div>

              <form className="recovery-card" onSubmit={loadProfile} noValidate>
                <h3>Continue your profile</h3>
                <p>Enter the recovery code you saved earlier.</p>

                {/* Announce a loading error beside the field that needs attention. */}
                {message && (
                  <p
                    className={failed ? 'notice error' : 'notice success'}
                    role={failed ? 'alert' : 'status'}
                  >
                    {message}
                  </p>
                )}

                <label htmlFor="recovery-code">Recovery code</label>
                <input
                  id="recovery-code"
                  value={recoveryCode}
                  onChange={(event) => {
                    setRecoveryCode(event.target.value)
                    setMessage('')
                    setFailed(false)
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={busy}
                />
                <button type="submit" disabled={busy}>
                  {busy ? 'Loading...' : 'Load profile'}
                </button>
              </form>
            </section>

            {/* Keep the data promise broad while the recommendation model grows. */}
            <section className="data-callout">
              <span aria-hidden="true">HW</span>
              <div>
                <p className="eyebrow">Built for better career decisions</p>
                <h2>One profile, shaped into a practical pathway.</h2>
                <p>
                  HireWay is designed to connect personal experience with
                  occupation, skills and labour market data in one clear view.
                </p>
              </div>
            </section>

            <footer className="landing-footer">
              <strong>HireWay</strong>
              <span>Find your direction. Build your next step.</span>
            </footer>
          </>
        ) : (
          <>
            <h1>Your background</h1>
            <p className="intro">
              Tell us about your education and current role.
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

                  <label htmlFor="qualification">
                    Major / Field of study *
                  </label>
                  <div className="autocomplete">
                    <input
                      id="qualification"
                      value={details.qualification}
                      onChange={(event) =>
                        updateQualification(event.target.value)
                      }
                      placeholder="Start typing, for example Data"
                      autoComplete="off"
                      maxLength={200}
                      required
                      aria-invalid={Boolean(errors.qualification)}
                      aria-describedby={
                        errors.qualification
                          ? 'qualification-help qualification-error'
                          : 'qualification-help'
                      }
                      aria-expanded={majorOptions.length > 0}
                      aria-controls="major-suggestions"
                    />

                    {/* Keep matching fields of study close to the typed value. */}
                    {majorOptions.length > 0 && (
                      <ul className="autocomplete-menu" id="major-suggestions">
                        {majorOptions.map((option) => (
                          <li key={option.code}>
                            <button
                              type="button"
                              onClick={() => selectMajor(option)}
                            >
                              <strong>{option.label}</strong>
                              <small>{option.description}</small>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="field-help" id="qualification-help">
                    Choose a suggestion or keep your own field of study.
                  </p>
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
                    <p
                      id="education-error"
                      className="field-error"
                      role="alert"
                    >
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
                    <div className="recovery-code-row">
                      <input
                        id="saved-code"
                        value={profile.code}
                        readOnly
                        onFocus={(event) => event.currentTarget.select()}
                        aria-describedby="code-help"
                      />

                      <button
                        type="button"
                        className={`copy-code-button ${copied ? 'copied' : ''}`}
                        onClick={copyRecoveryCode}
                        aria-label={
                          copied ? 'Recovery code copied' : 'Copy recovery code'
                        }
                      >
                        {copied ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            strokeWidth="2.5"
                            aria-hidden="true"
                          >
                            <path d="m5 12 4 4L19 6" />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <rect x="9" y="9" width="10" height="10" rx="2" />
                            <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                          </svg>
                        )}
                      </button>
                    </div>
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

                  {/* Recommendations use any recognised major or target role. */}
                  {(details.qualificationCode || targetRole) && (
                    <div className="skill-recommendations">
                      <div>
                        <strong>
                          Suggested from{' '}
                          {details.qualificationCode && targetRole
                            ? 'your major and target role'
                            : details.qualificationCode
                              ? 'your major'
                              : 'your target role'}
                        </strong>
                        <span>Choose only the skills you already have.</span>
                      </div>

                      {recommendationsBusy ? (
                        <p>Loading suggestions...</p>
                      ) : suggestedSkills.length > 0 ? (
                        <div className="suggestion-chips">
                          {suggestedSkills.map((suggestion) => (
                            <button
                              type="button"
                              className="skill-suggestion"
                              key={suggestion.code}
                              disabled={skillsBusy}
                              onClick={() => addSuggestedSkill(suggestion)}
                              title={
                                suggestion.kind === 'tool'
                                  ? 'Tool or technology'
                                  : 'Transferable skill'
                              }
                            >
                              + {suggestion.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p>
                          No new suggestions are available for this selection.
                        </p>
                      )}
                    </div>
                  )}

                  <form onSubmit={submitSkill} noValidate>
                    <label htmlFor="skill-name">Skill or tool</label>
                    <div className="skill-entry">
                      <div className="autocomplete">
                        <input
                          id="skill-name"
                          value={skillName}
                          onChange={(event) => {
                            setSkillName(event.target.value)
                            setSkillCode(null)
                            setSkillOptions([])
                            setSkillError('')
                          }}
                          placeholder="Start typing, for example Python"
                          autoComplete="off"
                          maxLength={80}
                          disabled={skillsBusy}
                          aria-invalid={Boolean(skillError)}
                          aria-describedby={
                            skillError ? 'skill-error' : undefined
                          }
                          aria-expanded={skillOptions.length > 0}
                          aria-controls="skill-suggestions"
                        />

                        {/* A selected option keeps its standard code when saved. */}
                        {skillOptions.length > 0 && (
                          <ul
                            className="autocomplete-menu"
                            id="skill-suggestions"
                          >
                            {skillOptions.map((option) => (
                              <li key={option.code}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSkillName(option.label)
                                    setSkillCode(option.code)
                                    setSkillOptions([])
                                    setSkillError('')
                                  }}
                                >
                                  <strong>{option.label}</strong>
                                  <small>
                                    {option.kind === 'tool'
                                      ? 'Tool or technology'
                                      : 'Transferable skill'}
                                  </small>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
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
                    <p>
                      Describe the direction you would like your career to take.
                    </p>

                    <label htmlFor="career-goal">Your goal *</label>
                    <input
                      id="career-goal"
                      value={careerGoal}
                      onChange={(event) => {
                        setCareerGoal(event.target.value)
                        setGoalError('')
                        setGoalMessage('')
                      }}
                      placeholder="For example, use data to improve public services"
                      maxLength={240}
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

              {/* A target role is a specific occupation from the OSCA catalogue. */}
              {profile && (
                <form
                  className="card profile-card target-role-card"
                  onSubmit={submitTargetRole}
                  noValidate
                >
                  <fieldset disabled={busy || targetRoleBusy}>
                    <legend>Target role</legend>
                    <p>
                      Search Australian occupations and choose one direction.
                    </p>

                    <label htmlFor="target-role">Occupation *</label>
                    <div className="autocomplete">
                      <input
                        id="target-role"
                        value={targetRoleQuery}
                        onChange={(event) => {
                          setTargetRoleQuery(event.target.value)
                          setTargetRoleCode(null)
                          setTargetRoleOptions([])
                          setTargetRoleError('')
                          setTargetRoleMessage('')
                        }}
                        placeholder="Start typing, for example Data Analyst"
                        autoComplete="off"
                        maxLength={120}
                        required
                        aria-invalid={Boolean(targetRoleError)}
                        aria-describedby={
                          targetRoleError
                            ? 'target-role-help target-role-error'
                            : 'target-role-help'
                        }
                        aria-expanded={targetRoleOptions.length > 0}
                        aria-controls="target-role-suggestions"
                      />

                      {/* Alias matches still save the official OSCA occupation. */}
                      {targetRoleOptions.length > 0 && (
                        <ul
                          className="autocomplete-menu"
                          id="target-role-suggestions"
                        >
                          {targetRoleOptions.map((option) => (
                            <li key={option.code}>
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetRoleQuery(option.label)
                                  setTargetRoleCode(option.code)
                                  setTargetRoleOptions([])
                                  setTargetRoleError('')
                                  setTargetRoleMessage('')
                                }}
                              >
                                <strong>{option.label}</strong>
                                {option.description && (
                                  <small>{option.description}</small>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <p id="target-role-help">
                      Choose a suggestion before saving. A new choice replaces
                      the current target role.
                    </p>

                    {targetRoleError && (
                      <p
                        id="target-role-error"
                        className="field-error"
                        role="alert"
                      >
                        {targetRoleError}
                      </p>
                    )}

                    <button type="submit">
                      {targetRoleBusy ? 'Saving...' : 'Save target role'}
                    </button>
                  </fieldset>

                  {targetRole && (
                    <p className="selected-target-role">
                      Current target: <strong>{targetRole.title}</strong>
                    </p>
                  )}

                  {targetRoleMessage && (
                    <p className="notice success" role="status">
                      {targetRoleMessage}
                    </p>
                  )}
                </form>
              )}

              {/* Keep the open-data sources visible beside the suggestions. */}
              {profile && (
                <aside className="data-source-note">
                  <strong>Suggestion data</strong>
                  <p>
                    Fields of study use CIP 2020. Target roles use ABS OSCA
                    2024. Skills and tools use the O*NET 31.0 Database by
                    USDOL/ETA under CC BY 4.0. O*NET® is a trademark of
                    USDOL/ETA.
                  </p>
                </aside>
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}
