import { useState, type FormEvent } from 'react'
import {
  requestProfile,
  type Profile,
  type ProfileDetails,
  type ProfileErrors,
} from '../lib/profileApi'

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
      showProfile(result.data)
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
      setMessage('Profile saved.')
    } catch {
      setMessage('Could not save. Please try again.')
      setFailed(true)
    } finally {
      setBusy(false)
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
            disabled={busy}
            onClick={() => {
              setScreen('home')
              setMessage('')
              setErrors({})
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
          <form className="card profile-card" onSubmit={saveProfile} noValidate>
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
                aria-describedby={errors.currentRole ? 'role-error' : undefined}
              />
              {errors.currentRole && (
                <p id="role-error" className="field-error" role="alert">
                  {errors.currentRole}
                </p>
              )}

              <button type="submit">
                {busy ? 'Saving...' : profile ? 'Save changes' : 'Save profile'}
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
                  Keep this code private. Anyone with it can view and edit your
                  profile. Use it to return after closing or refreshing the
                  page.
                </p>
              </section>
            )}
          </form>
        )}
      </main>
    </>
  )
}
