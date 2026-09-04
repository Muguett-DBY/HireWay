import { useEffect, useState, type FormEvent } from 'react'
import { Check, Copy } from 'lucide'
import { MorphIcon } from 'morphicons/react'
import {
  requestProfile,
  type Profile,
  type ProfileDetails,
  type ProfileErrors,
} from '../lib/profileApi'
import {
  addSkill,
  loadSkills,
  removeSkill,
  type SaveSkillResult,
  type Skill,
} from '../lib/skillsApi'
import { requestTargetRole, type TargetRole } from '../lib/targetRoleApi'
import { CareerDashboard } from '../components/CareerDashboard'
import { Stepper } from '../components/Stepper'
import type { RoleSuggestion } from '../lib/suggestionApi'
import { EducationLevelSelect } from '../components/EducationLevelSelect'
import {
  loadSkillRecommendations,
  searchOptions,
  searchStudyOptions,
  type CatalogueOption,
  type SkillRecommendation,
  type StudyOption,
} from '../lib/optionsApi'
// A new form starts with no background details.
const emptyDetails: ProfileDetails = {
  qualification: '',
  qualificationCode: null,
  degreeCode: null,
  majorCode: null,
  educationLevel: '',
  currentRole: '',
}

// Returning visitors resume from the saved code instead of typing it again.
const RECOVERY_CODE_KEY = 'hireway.recoveryCode'
const DRAFT_KEY = 'hireway.backgroundDraft'

// The unsaved background form survives a refresh through a small draft.
function saveDraft(next: ProfileDetails) {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
}

function readDraft(): ProfileDetails | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    return raw ? { ...emptyDetails, ...JSON.parse(raw) } : null
  } catch {
    return null
  }
}

// The saved code lets a returning visitor skip the sign-in form.
function rememberCode(code: string) {
  window.localStorage.setItem(RECOVERY_CODE_KEY, code)
}

function forgetSavedLogin() {
  window.localStorage.removeItem(RECOVERY_CODE_KEY)
  window.localStorage.removeItem(DRAFT_KEY)
}

export function ProfilePage() {
  // Keep the saved record separate from the fields being edited.
  const [screen, setScreen] = useState<'home' | 'wizard' | 'dashboard'>('home')
  // The wizard walks through background, skills and direction in order.
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [profile, setProfile] = useState<Profile | null>(null)
  // An abandoned background draft gives its owner a head start on return.
  const [details, setDetails] = useState<ProfileDetails>(
    () => readDraft() ?? emptyDetails,
  )
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
  const [studyOptions, setStudyOptions] = useState<StudyOption[]>([])
  const [skillOptions, setSkillOptions] = useState<CatalogueOption[]>([])
  const [skillCode, setSkillCode] = useState<string | null>(null)
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
  // Suggestion cards reload whenever quiz answers or the target role change.
  const [suggestionsRefresh, setSuggestionsRefresh] = useState(0)

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
    if (
      details.degreeCode ||
      details.majorCode ||
      details.qualification.trim().length < 2
    ) {
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void searchStudyOptions(details.qualification.trim(), controller.signal)
        .then(setStudyOptions)
        .catch(() => {
          if (!controller.signal.aborted) setStudyOptions([])
        })
    }, 180)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [details.degreeCode, details.majorCode, details.qualification])

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

  // Refresh suggestions whenever a saved study choice or target role changes.
  useEffect(() => {
    if (
      !details.qualificationCode &&
      !details.degreeCode &&
      !details.majorCode &&
      !targetRole
    ) {
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setRecommendationsBusy(true)
      void loadSkillRecommendations(
        details.qualificationCode,
        details.degreeCode,
        details.majorCode,
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
  }, [
    details.degreeCode,
    details.majorCode,
    details.qualificationCode,
    targetRole,
  ])

  // Fill the form with the values that actually came back from D1.
  function showProfile(saved: Profile) {
    setProfile(saved)
    setDetails({
      qualification: saved.qualification,
      qualificationCode: saved.qualificationCode,
      degreeCode: saved.degreeCode,
      majorCode: saved.majorCode,
      educationLevel: saved.educationLevel,
      currentRole: saved.currentRole,
    })
    setRecoveryCode(saved.code)
    setErrors({})
    setStudyOptions([])
  }

  // On the first render, resume the login this browser remembers. The work
  // is deferred so the landing screen can paint before the restore begins.
  useEffect(() => {
    const storedCode = window.localStorage.getItem(RECOVERY_CODE_KEY)

    if (!storedCode) return

    const timer = window.setTimeout(() => {
      setRecoveryCode(storedCode)
      setBusy(true)
      void fetchProfileBundle(storedCode)
        .then((bundle) => {
          if (!bundle) {
            // A code that no longer works should not keep failing on reload.
            forgetSavedLogin()
            setRecoveryCode('')
            return
          }
          applyLoadedProfile(bundle)
          setScreen(bundle.targetRole ? 'dashboard' : 'wizard')
          setStep(3)
        })
        .catch(() => {
          // Leave the stored code in place for the next successful connection.
        })
        .finally(() => setBusy(false))
    }, 0)

    return () => window.clearTimeout(timer)
    // Bundle helpers are stable component closures, so the effect runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Typing changes the draft, not the database.
  function updateField(field: 'educationLevel' | 'currentRole', value: string) {
    setDetails((current) => {
      const next = { ...current, [field]: value }
      saveDraft(next)
      return next
    })
    setErrors((current) => ({ ...current, [field]: undefined }))
    setMessage('')
  }

  // Editing the text clears an earlier catalogue choice until it is selected again.
  function updateQualification(value: string) {
    setDetails((current) => {
      const next = {
        ...current,
        qualification: value,
        qualificationCode: null,
        degreeCode: null,
        majorCode: null,
      }
      saveDraft(next)
      return next
    })
    setStudyOptions([])
    if (!targetRole) {
      setRecommendations([])
      setRecommendationsBusy(false)
    }
    setErrors((current) => ({ ...current, qualification: undefined }))
    setMessage('')
  }

  // One menu lets the user choose either a named course or an ASCED field.
  function selectStudy(option: StudyOption) {
    setDetails((current) => {
      const next = {
        ...current,
        qualification: option.label,
        qualificationCode: null,
        degreeCode: option.degreeCode,
        majorCode: option.majorCode,
        educationLevel: option.educationLevel ?? current.educationLevel,
      }
      saveDraft(next)
      return next
    })
    setStudyOptions([])
    setErrors((current) => ({
      ...current,
      qualification: undefined,
      educationLevel: undefined,
    }))
    setMessage('')
  }

  // Starting again clears the form without deleting a saved profile.
  function startProfile() {
    setProfile(null)
    // An abandoned background draft gives the new profile a head start.
    const draft = readDraft()
    setDetails(draft ?? emptyDetails)
    setErrors({})
    setMessage('')
    setFailed(false)
    setSkills([])
    setSkillName('')
    setSkillCode(null)
    setSkillOptions([])
    setSkillError('')
    setTargetRole(null)
    setTargetRoleQuery('')
    setTargetRoleCode(null)
    setTargetRoleOptions([])
    setTargetRoleError('')
    setTargetRoleMessage('')
    setRecommendations([])
    setRecommendationsBusy(false)
    setStep(1)
    setScreen('wizard')
  }

  type ProfileBundle = {
    profile: Profile
    skills: Skill[]
    targetRole: TargetRole | null
  }

  // Every saved section is fetched together so one failure aborts the load.
  async function fetchProfileBundle(
    code: string,
  ): Promise<ProfileBundle | null> {
    const result = await requestProfile('GET', code)
    if (!result.ok) return null

    const [skillResult, targetRoleResult] = await Promise.all([
      loadSkills(result.data.code),
      requestTargetRole('GET', result.data.code),
    ])

    if (!skillResult.ok || !targetRoleResult.ok) {
      return null
    }

    return {
      profile: result.data,
      skills: skillResult.data.skills,
      targetRole: targetRoleResult.data.targetRole,
    }
  }

  // One place fills every field from a fully loaded profile bundle.
  function applyLoadedProfile(bundle: ProfileBundle) {
    showProfile(bundle.profile)
    setSkills(bundle.skills)
    setSkillName('')
    setSkillCode(null)
    setSkillOptions([])
    setSkillError('')
    setTargetRole(bundle.targetRole)
    setTargetRoleQuery(bundle.targetRole?.title ?? '')
    setTargetRoleCode(bundle.targetRole?.code ?? null)
    setTargetRoleOptions([])
    setTargetRoleError('')
    setTargetRoleMessage('')
    setRecommendations([])
    setRecommendationsBusy(false)
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
      const bundle = await fetchProfileBundle(recoveryCode.trim())
      if (!bundle) {
        setMessage('Could not load a profile with that code.')
        setFailed(true)
        return
      }

      applyLoadedProfile(bundle)
      rememberCode(bundle.profile.code)
      setMessage('Profile loaded.')
      if (bundle.targetRole) {
        setScreen('dashboard')
      } else {
        setStep(3)
        setScreen('wizard')
      }
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

    if (!details.degreeCode && !details.majorCode) {
      nextErrors.qualification =
        'Choose a course or field of study from the suggestions.'
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
      rememberCode(result.data.code)

      // A finished background step clears its draft and opens the skills step.
      window.localStorage.removeItem(DRAFT_KEY)
      setStep(2)

      // New profiles start empty; education edits keep the saved skills.
      if (creating) {
        setSkills([])
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
      setScreen('dashboard')
    } catch {
      setTargetRoleError('Could not connect. Please try again.')
    } finally {
      setTargetRoleBusy(false)
    }
  }
  // Both suggested and searched skills use the same API request.
  async function saveSkill(
    name: string,
    selectedCode: string,
  ): Promise<SaveSkillResult> {
    if (!profile) {
      const error = 'Save your profile before adding skills.'
      setSkillError(error)
      return { ok: false, error }
    }

    setSkillError('')
    setSkillsBusy(true)
    try {
      const result = await addSkill(profile.code, name, selectedCode)
      if (!result.ok) {
        const error = result.data.error ?? 'Could not add this skill.'
        setSkillError(error)
        return { ok: false, error }
      }

      setSkills((current) => [...current, result.data])
      setSkillName('')
      setSkillCode(null)
      setSkillOptions([])
      return { ok: true }
    } catch {
      const error = 'Could not connect. Please try again.'
      setSkillError(error)
      return { ok: false, error }
    } finally {
      setSkillsBusy(false)
    }
  }

  // Save a skill typed into the form; only catalogue selections get through.
  async function submitSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSkillError('')

    if (!skillCode) {
      setSkillError('Choose a skill or tool from the suggestions.')
      return
    }

    await saveSkill(skillName.trim(), skillCode)
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

  // Picking a suggested role saves it with the same call as the search box.
  async function chooseSuggestedRole(suggestion: RoleSuggestion) {
    if (!profile) return

    try {
      const result = await requestTargetRole(
        'PUT',
        profile.code,
        suggestion.code,
      )
      if (!result.ok || !result.data.targetRole) return

      setTargetRole(result.data.targetRole)
      setTargetRoleQuery(result.data.targetRole.title)
      setTargetRoleCode(result.data.targetRole.code)
      setSuggestionsRefresh((current) => current + 1)
    } catch {
      // The card stays interactive so the user can retry the choice.
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
          <nav className="workspace-nav" aria-label="Profile navigation">
            {profile && targetRole && screen !== 'dashboard' && (
              <button type="button" onClick={() => setScreen('dashboard')}>
                Dashboard
              </button>
            )}
            {profile && screen !== 'wizard' && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setStep(3)
                  setScreen('wizard')
                }}
              >
                Edit pathway
              </button>
            )}
            <button
              type="button"
              className="secondary"
              disabled={busy || skillsBusy || targetRoleBusy}
              onClick={() => {
                setScreen('home')
                setMessage('')
                setErrors({})
                setSkillName('')
                setSkillError('')
                setTargetRoleError('')
                setTargetRoleMessage('')
              }}
            >
              Home
            </button>
          </nav>
        )}
      </header>

      <main
        className={
          screen === 'home'
            ? 'landing-page'
            : screen === 'dashboard'
              ? 'dashboard-page'
              : 'profile-page'
        }
      >
        {' '}
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
                  HireWay brings your education and current skills together,
                  then shows the Australian outlook behind the careers that suit
                  you.
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
                  <p>Pick a target role and see the demand behind it.</p>
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
        ) : screen === 'dashboard' && profile ? (
          <CareerDashboard
            profile={profile}
            skills={skills}
            targetRole={targetRole}
            suggestionsRefresh={suggestionsRefresh}
            onEditProfile={() => {
              setStep(3)
              setScreen('wizard')
            }}
            onAddSkill={saveSkill}
            onChooseRole={chooseSuggestedRole}
          />
        ) : (
          <>
            {/* The stepper doubles as a progress bar and a way to go back. */}
            <Stepper
              items={[
                { id: 1, label: 'Background', unlocked: true },
                { id: 2, label: 'Skills', unlocked: Boolean(profile) },
                { id: 3, label: 'Direction', unlocked: Boolean(profile) },
                // The dashboard greets unfinished profiles with next steps.
                { id: 4, label: 'Dashboard', unlocked: Boolean(profile) },
              ]}
              currentId={step}
              onSelect={(id) => {
                if (id === 4) {
                  setScreen('dashboard')
                } else {
                  setStep(id as 1 | 2 | 3)
                  setScreen('wizard')
                }
              }}
            />

            {/* A profile is required from step 2 on; anything else falls back. */}
            {(step === 1 || !profile) && (
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
                        What did you study? *
                      </label>
                      <div className="autocomplete">
                        <input
                          id="qualification"
                          value={details.qualification}
                          onChange={(event) =>
                            updateQualification(event.target.value)
                          }
                          placeholder="Search your course, e.g. Master of Data Science"
                          autoComplete="off"
                          maxLength={240}
                          required
                          aria-invalid={Boolean(errors.qualification)}
                          aria-describedby={
                            errors.qualification
                              ? 'qualification-help qualification-error'
                              : 'qualification-help'
                          }
                          aria-expanded={studyOptions.length > 0}
                          aria-controls="study-suggestions"
                        />

                        {/* Course and ASCED matches stay in one short suggestion list. */}
                        {studyOptions.length > 0 && (
                          <ul
                            className="autocomplete-menu"
                            id="study-suggestions"
                          >
                            {studyOptions.map((option) => (
                              <li key={option.degreeCode ?? option.majorCode}>
                                <button
                                  type="button"
                                  onClick={() => selectStudy(option)}
                                >
                                  <span className="study-option-heading">
                                    <strong>{option.label}</strong>
                                    <span>
                                      {option.kind === 'course'
                                        ? 'Exact course'
                                        : 'Field of study'}
                                    </span>
                                  </span>
                                  <small>{option.description}</small>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <p className="field-help" id="qualification-help">
                        Pick your exact course if it appears - otherwise pick
                        the closest field, like Accounting or Data Science.
                        Courses come from the Australian CRICOS register.
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

                      {/* A picked course already fixes the education level. */}
                      {details.degreeCode ? (
                        <>
                          <label>Education level</label>
                          <p className="derived-level">
                            {details.educationLevel || 'Set automatically'}{' '}
                            <small>from your course</small>
                          </p>
                        </>
                      ) : (
                        <>
                          <label htmlFor="education-level">
                            Education level *
                          </label>
                          <EducationLevelSelect
                            value={details.educationLevel}
                            onChange={(value) =>
                              updateField('educationLevel', value)
                            }
                            invalid={Boolean(errors.educationLevel)}
                            describedBy={
                              errors.educationLevel
                                ? 'education-error'
                                : undefined
                            }
                          />
                          {errors.educationLevel && (
                            <p
                              id="education-error"
                              className="field-error"
                              role="alert"
                            >
                              {errors.educationLevel}
                            </p>
                          )}
                        </>
                      )}

                      <label htmlFor="current-role">
                        Current role (optional)
                      </label>
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
                        {busy ? 'Saving...' : 'Save and continue'}
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
                              copied
                                ? 'Recovery code copied'
                                : 'Copy recovery code'
                            }
                          >
                            <MorphIcon
                              icon={copied ? Check : Copy}
                              size={19}
                              strokeWidth={2}
                              spring="snappy"
                              reducedMotion="user"
                            />
                          </button>
                        </div>
                        <p id="code-help">
                          Keep this code private. Anyone with it can view and
                          edit your profile. Use it to return after closing or
                          refreshing the page. This browser remembers it for
                          you.
                        </p>
                        <button
                          type="button"
                          className="secondary forget-login-button"
                          onClick={() => {
                            forgetSavedLogin()
                            setRecoveryCode('')
                            setMessage('This browser forgot your saved code.')
                          }}
                        >
                          Forget the code on this device
                        </button>
                      </section>
                    )}
                  </form>
                </div>
              </>
            )}

            {/* Step 2 collects the skills the catalogue can match against. */}
            {step === 2 && profile && (
              <>
                <h1>Your skills</h1>
                <p className="intro">
                  Add what you can already do so roles can be matched to you.
                </p>

                <div className="profile-stack">
                  {/* Skills are linked to the profile created by the first form. */}
                  {profile && (
                    <section className="card profile-card skills-card">
                      <h2>Current skills</h2>
                      <p>Add the skills and tools you already use.</p>

                      {/* Suggestions use a recognised study choice or target role. */}
                      {(details.qualificationCode ||
                        details.degreeCode ||
                        details.majorCode ||
                        targetRole) && (
                        <div className="skill-recommendations">
                          <div>
                            <strong>
                              Suggested from{' '}
                              {(details.qualificationCode ||
                                details.degreeCode ||
                                details.majorCode) &&
                              targetRole
                                ? 'your study and target role'
                                : details.qualificationCode ||
                                    details.degreeCode ||
                                    details.majorCode
                                  ? 'your study'
                                  : 'your target role'}
                            </strong>
                            <span>
                              Add only the skills you already have. Study
                              starters use existing O*NET skill and tool names.
                            </span>
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
                              No new suggestions are available for this
                              selection.
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
                                skillError ? 'skill-error' : 'skill-help'
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
                          <button
                            type="submit"
                            disabled={skillsBusy || !skillCode}
                          >
                            {skillsBusy ? 'Working...' : 'Add skill'}
                          </button>
                        </div>

                        <p id="skill-help">
                          Pick a suggestion so every skill can be compared with
                          real occupation data.
                        </p>

                        {skillError && (
                          <p
                            id="skill-error"
                            className="field-error"
                            role="alert"
                          >
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

                  {/* Step navigation keeps progress obvious between cards. */}
                  <div className="wizard-nav">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </button>
                    <button type="button" onClick={() => setStep(3)}>
                      Continue
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 3 turns the profile into a concrete target role. */}
            {step === 3 && profile && (
              <>
                <h1>Your target role</h1>
                <p className="intro">
                  Search Australian occupations and pick one direction to plan
                  towards.
                </p>

                <div className="profile-stack">
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
                          Search Australian occupations and choose one
                          direction.
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
                                    <span className="occupation-option-heading">
                                      <strong>{option.label}</strong>
                                      {/* Projections make the search data driven. */}
                                      {option.growth5yPercent != null && (
                                        <span
                                          className={`growth-badge ${
                                            option.growth5yPercent >= 2
                                              ? 'positive'
                                              : ''
                                          }`}
                                        >
                                          {option.growth5yPercent > 0
                                            ? '▲'
                                            : '▼'}{' '}
                                          {Math.abs(
                                            Math.round(
                                              option.growth5yPercent * 10,
                                            ) / 10,
                                          )}
                                          % in 5 yrs
                                        </span>
                                      )}
                                    </span>
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
                          Choose a suggestion before saving. A new choice
                          replaces the current target role.
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
                        Courses use Australian Government CRICOS data. Fields of
                        study use ABS ASCED 2001. Target roles use ABS OSCA
                        2024. Skills and tools use the O*NET 31.0 Database by
                        USDOL/ETA under CC BY 4.0. O*NET® is a trademark of
                        USDOL/ETA.
                      </p>
                    </aside>
                  )}

                  {/* The dashboard works with or without a saved target role. */}
                  <div className="wizard-nav">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setStep(2)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setScreen('dashboard')}
                    >
                      Go to dashboard
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </>
  )
}
