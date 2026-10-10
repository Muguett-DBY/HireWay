import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Copy } from 'lucide'
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
  updateSkillStatus,
  type SaveSkillResult,
  type Skill,
  type SkillStatus,
} from '../lib/skillsApi'
import { requestTargetRole, type TargetRole } from '../lib/targetRoleApi'
import { occupationTitle } from '../lib/occupationTitle'
import { Stepper } from '../components/Stepper'
import { EducationLevelSelect } from '../components/EducationLevelSelect'
import { MarketingLanding } from '../components/landing/MarketingLanding'
import { LandingScreen } from '../components/landing/LandingScreen'
import { AppNav, type AppPage } from '../components/app/AppNav'
import { SkillPromptCard } from '../components/app/SkillPromptCard'
import { MyProfilePage } from '../components/app/MyProfilePage'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useI18n } from '../lib/useI18n'
import { OverviewPage } from '../components/app/OverviewPage'
import { MatchesPage } from '../components/app/MatchesPage'
import { AnalysisPage } from '../components/app/AnalysisPage'
import { RoleDetailsPage } from '../components/app/RoleDetailsPage'
import { PathwaysPage } from '../components/app/PathwaysPage'
import {
  loadRoleRequirements,
  type RoleRequirements as RequirementsData,
  type RoleSkill,
} from '../lib/roleRequirementsApi'
import { loadRoleSuggestions, type RoleSuggestion } from '../lib/suggestionApi'

import {
  loadSkillRecommendations,
  searchOptions,
  searchStudyOptions,
  type CatalogueOption,
  type SkillRecommendation,
  type StudyOption,
} from '../lib/optionsApi'

type PendingTargetRoleChange = Pick<TargetRole, 'code' | 'title'> & {
  returnToOverview: boolean
}

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
  const { t } = useI18n()
  const [screen, setScreen] = useState<'home' | 'entry' | 'wizard' | 'app'>(
    'home',
  )
  const [appPage, setAppPage] = useState<AppPage>('overview')
  // The wizard walks through background, skills and a target role in order.
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
  // Current role is optional; suggestions come from the occupation catalogue.
  const [currentRoleOptions, setCurrentRoleOptions] = useState<
    CatalogueOption[]
  >([])
  // True while the field holds a saved or just-picked title, so the value
  // alone never reopens the suggestion menu.
  const [currentRolePicked, setCurrentRolePicked] = useState(true)
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
  const [pendingTargetRole, setPendingTargetRole] =
    useState<PendingTargetRoleChange | null>(null)
  const targetRoleDialogRef = useRef<HTMLDialogElement>(null)
  const [recommendations, setRecommendations] = useState<SkillRecommendation[]>(
    [],
  )
  const [recommendationsBusy, setRecommendationsBusy] = useState(false)
  // Workspace data for the app pages, reloaded whenever something changes.
  const [suggestions, setSuggestions] = useState<RoleSuggestion[]>([])
  const [suggestionHint, setSuggestionHint] = useState<string | null>(null)
  const [requirements, setRequirements] = useState<RequirementsData | null>(
    null,
  )
  const [refreshKey, setRefreshKey] = useState(0)

  const bumpRefresh = () => setRefreshKey((current) => current + 1)

  // The native modal traps focus and returns it to the triggering control.
  useEffect(() => {
    const dialog = targetRoleDialogRef.current
    if (!dialog) return

    if (pendingTargetRole && !dialog.open) {
      dialog.showModal()
    } else if (!pendingTargetRole && dialog.open) {
      dialog.close()
    }
  }, [pendingTargetRole])

  // Do not suggest a skill the profile has already saved.
  const suggestedSkills = recommendations.filter(
    (suggestion) =>
      !skills.some(
        (skill) =>
          skill.skillCode === suggestion.code ||
          skill.name.toLowerCase() === suggestion.label.toLowerCase(),
      ),
  )

  // Elicitation: the overview asks about at most three study-pathway tools,
  // one at a time, and only while the profile lacks a strong skill match.
  // The stop line was re-derived after the shrinkage change compressed the
  // cosine scale: weak profiles peak near 6 raw skill points and strong ones
  // near 10, so 8 of the 60 raw points separates "keep asking" from "the
  // matches are already there". A generic soft-skill profile clears the line
  // on its own, and one high-weight tool such as Epic Systems crosses it in
  // a single answer.
  const SKILL_PROMPT_KEY = 'hireway.skillPrompt'
  const SKILL_PROMPT_LIMIT = 3
  const SKILL_PROMPT_QUALITY = 8
  const [skillPromptBusy, setSkillPromptBusy] = useState(false)
  // Re-render trigger when an answer is recorded; the prompt itself is
  // recomputed from localStorage on every render.
  const [promptEpoch, setPromptEpoch] = useState(0)

  function readPromptHistory(): {
    asked: { code: string; skill: string }[]
    notYet: { code: string; skill: string }[]
  } {
    try {
      const raw = window.localStorage.getItem(SKILL_PROMPT_KEY)
      if (raw) return { asked: [], notYet: [], ...JSON.parse(raw) }
    } catch {
      // fall through to a fresh history
    }
    return { asked: [], notYet: [] }
  }

  function writePromptHistory(history: {
    asked: { code: string; skill: string }[]
    notYet: { code: string; skill: string }[]
  }) {
    window.localStorage.setItem(SKILL_PROMPT_KEY, JSON.stringify(history))
  }

  // Elicitation candidate shared by the wizard skills step and the overview
  // card: the first study-pathway tool the profile has neither answered nor
  // declined yet. The cap counts answers per profile across both surfaces.
  let elicitation: { code: string; label: string } | null = null
  if (profile) {
    void promptEpoch
    const history = readPromptHistory()
    const askedCount = history.asked.filter(
      (entry) => entry.code === profile.code,
    ).length
    const candidate = suggestedSkills.find(
      (suggestion) =>
        suggestion.kind === 'tool' &&
        !history.notYet.some(
          (entry) =>
            entry.code === profile.code && entry.skill === suggestion.code,
        ) &&
        !history.asked.some(
          (entry) =>
            entry.code === profile.code && entry.skill === suggestion.code,
        ),
    )
    if (askedCount < SKILL_PROMPT_LIMIT && candidate) {
      elicitation = { code: candidate.code, label: candidate.label }
    }
  }

  let skillPrompt: { code: string; label: string } | null = null
  if (screen === 'app' && profile) {
    // Stop once any visible match already carries a strong skill factor:
    // quality-based, so a profile with one high-value tool can finish in
    // zero questions while a generic one keeps getting useful asks. A
    // knowledge-only profile has no matches at all - exactly the case that
    // needs the ask - so an empty suggestion list never blocks the prompt.
    const bestSkillFactor = suggestions.length
      ? Math.max(...suggestions.map((suggestion) => suggestion.factors.skill))
      : 0
    if (bestSkillFactor < SKILL_PROMPT_QUALITY && elicitation) {
      skillPrompt = elicitation
    }
  }

  // The wizard skills step runs the same loop while the profile holds fewer
  // than three tools, so users leave the wizard with enough signal for real
  // matches and the overview card takes over from there.
  const wizardElicitation =
    screen === 'wizard' && step === 2 && skills.length < 3 && elicitation
      ? elicitation
      : null

  function rememberAsked(skillCode: string) {
    if (!profile) return
    const history = readPromptHistory()
    history.asked.push({ code: profile.code, skill: skillCode })
    writePromptHistory(history)
  }

  async function answerPromptYes(
    target: { code: string; label: string } | null,
  ) {
    if (!profile || !target) return
    setSkillPromptBusy(true)
    const result = await saveSkill(target.label, target.code)
    setSkillPromptBusy(false)
    if (result.ok) {
      rememberAsked(target.code)
      setPromptEpoch((current) => current + 1)
    }
  }

  function answerPromptNotYet(target: { code: string; label: string } | null) {
    if (!profile || !target) return
    const history = readPromptHistory()
    history.notYet.push({ code: profile.code, skill: target.code })
    writePromptHistory(history)
    setPromptEpoch((current) => current + 1)
  }

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

  // Current role suggestions use the same occupation search, but the field
  // saves typed text and never blocks the form. Stale options are cleared by
  // the change handler, not here, so no state flips inside the effect.
  useEffect(() => {
    if (currentRolePicked || details.currentRole.trim().length < 2) {
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void searchOptions(
        'occupations',
        details.currentRole.trim(),
        controller.signal,
      )
        .then(setCurrentRoleOptions)
        .catch(() => {
          if (!controller.signal.aborted) setCurrentRoleOptions([])
        })
    }, 180)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [currentRolePicked, details.currentRole])

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
        details.degreeCode,
        details.majorCode,
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

  // The workspace pages read from one shared load: suggestions always, role
  // requirements once a target role exists. Refreshes re-run the same pair.
  useEffect(() => {
    if (screen !== 'app' || !profile) return

    const controller = new AbortController()
    void loadRoleSuggestions(profile.code, controller.signal)
      .then((result) => {
        if (result.ok) {
          setSuggestions(result.data.suggestions)
          setSuggestionHint(result.data.hint ?? null)
        } else {
          setSuggestions([])
          setSuggestionHint(null)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setSuggestions([])
      })

    // With a target role the requirements load too; without one they clear.
    const requirementsTask = targetRole
      ? loadRoleRequirements(profile.code, controller.signal).then((result) =>
          result.ok ? result.data : null,
        )
      : Promise.resolve(null)

    void requirementsTask
      .then((data) => {
        if (!controller.signal.aborted) setRequirements(data)
      })
      .catch(() => {
        if (!controller.signal.aborted) setRequirements(null)
      })

    return () => controller.abort()
  }, [screen, profile, targetRole, refreshKey])

  // Each page swap starts from the top, like a real page change should.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen, appPage, step])

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
    setCurrentRoleOptions([])
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
          setScreen(bundle.targetRole ? 'app' : 'wizard')
          setAppPage('overview')
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
  function updateField(field: 'educationLevel', value: string) {
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

  // The current role field saves typed text; the field itself stays optional.
  function updateCurrentRole(value: string) {
    setCurrentRolePicked(false)
    setCurrentRoleOptions([])
    setDetails((current) => {
      const next = { ...current, currentRole: value }
      saveDraft(next)
      return next
    })
    setMessage('')
  }

  // A suggestion replaces the typed text with the official occupation title.
  function selectCurrentRole(option: CatalogueOption) {
    updateCurrentRole(occupationTitle(option.label))
    setCurrentRolePicked(true)
    setCurrentRoleOptions([])
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
    setCurrentRoleOptions([])
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
    setCurrentRoleOptions([])
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
      setMessage('')
      if (bundle.targetRole) {
        setScreen('app')
        setAppPage('overview')
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
      nextErrors.qualification = t('wizard.errors.chooseStudy')
    }
    if (!details.educationLevel) {
      nextErrors.educationLevel = t('wizard.errors.chooseLevel')
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
    } catch {
      setMessage('Could not save. Please try again.')
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  // Both suggested and searched skills use the same API request and land as
  // current strengths; the progress pills on the analysis page adjust later.
  async function saveSkill(
    name: string,
    selectedCode: string,
    status: 'current' | 'upcoming' = 'current',
  ): Promise<SaveSkillResult> {
    if (!profile) {
      const error = 'Save your profile before adding skills.'
      setSkillError(error)
      return { ok: false, error }
    }

    setSkillError('')
    setSkillsBusy(true)
    try {
      const result = await addSkill(profile.code, name, selectedCode, status)
      if (!result.ok) {
        const error = result.data.error ?? 'Could not add this skill.'
        setSkillError(error)
        return { ok: false, error }
      }

      setSkills((current) => [...current, result.data])
      setSkillName('')
      setSkillCode(null)
      setSkillOptions([])
      bumpRefresh()
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
  async function deleteSkill(id: number): Promise<SaveSkillResult> {
    if (!profile) {
      return { ok: false, error: 'Open a profile before removing a skill.' }
    }

    setSkillError('')
    setSkillsBusy(true)

    try {
      const result = await removeSkill(profile.code, id)
      if (!result.ok) {
        const error = result.data.error ?? 'Could not remove this skill.'
        setSkillError(error)
        return { ok: false, error }
      }

      setSkills((current) => current.filter((skill) => skill.id !== id))
      bumpRefresh()
      return { ok: true }
    } catch {
      const error = 'Could not connect. Please try again.'
      setSkillError(error)
      return { ok: false, error }
    } finally {
      setSkillsBusy(false)
    }
  }

  // Move one saved skill between upcoming, current and completed.
  async function cycleSkillStatus(skill: Skill, status: SkillStatus) {
    if (!profile) return

    setSkillsBusy(true)
    try {
      const result = await updateSkillStatus(profile.code, skill.id, status)
      if (result.ok) {
        setSkills((current) =>
          current.map((item) =>
            item.id === skill.id ? { ...item, status } : item,
          ),
        )
        bumpRefresh()
      }
    } catch {
      // The control stays interactive so the change can be retried.
    } finally {
      setSkillsBusy(false)
    }
  }

  // Save one confirmed catalogue occupation as the profile's target role.
  async function saveTargetRoleSelection(
    roleCode: string,
    returnToOverview: boolean,
  ): Promise<boolean> {
    setTargetRoleError('')
    setTargetRoleMessage('')

    if (!profile) {
      setTargetRoleError('Save your profile before choosing a target role.')
      return false
    }

    setTargetRoleBusy(true)
    try {
      const result = await requestTargetRole('PUT', profile.code, roleCode)

      if (!result.ok || !result.data.targetRole) {
        setTargetRoleError(
          result.ok
            ? 'Could not save your target role.'
            : (result.data.error ?? 'Could not save your target role.'),
        )
        return false
      }

      // The official title returned by D1 replaces the search draft.
      setTargetRole(result.data.targetRole)
      setTargetRoleQuery(result.data.targetRole.title)
      setTargetRoleCode(result.data.targetRole.code)
      setTargetRoleOptions([])
      setTargetRoleMessage('Target role saved.')
      if (returnToOverview) {
        setScreen('app')
        setAppPage('overview')
      }
      bumpRefresh()
      return true
    } catch {
      setTargetRoleError('Could not connect. Please try again.')
      return false
    } finally {
      setTargetRoleBusy(false)
    }
  }

  // A replacement pauses for confirmation; the first target saves directly.
  async function submitTargetRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTargetRoleError('')
    setTargetRoleMessage('')

    if (!targetRoleCode) {
      setTargetRoleError(t('wizard.errors.chooseRole'))
      return
    }

    if (targetRole && targetRole.code !== targetRoleCode) {
      setPendingTargetRole({
        code: targetRoleCode,
        title: targetRoleQuery,
        returnToOverview: true,
      })
      return
    }

    await saveTargetRoleSelection(targetRoleCode, true)
  }

  // Match cards use the same confirmation before replacing a saved target.
  async function chooseSuggestedRole(suggestion: RoleSuggestion) {
    if (!profile) return

    if (targetRole && targetRole.code !== suggestion.code) {
      setTargetRoleError('')
      setPendingTargetRole({
        code: suggestion.code,
        title: suggestion.title,
        returnToOverview: false,
      })
      return
    }

    await saveTargetRoleSelection(suggestion.code, false)
  }

  async function confirmTargetRoleChange() {
    if (!pendingTargetRole) return

    const saved = await saveTargetRoleSelection(
      pendingTargetRole.code,
      pendingTargetRole.returnToOverview,
    )
    if (saved) setPendingTargetRole(null)
  }

  return (
    <>
      {/* The header swaps navigation depending on which space the user is in. */}
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
          <span className="brand-word">
            Hire<strong>Way</strong>
          </span>
        </button>

        <div className="header-end">
          {screen === 'app' && profile && (
            <AppNav page={appPage} onSelect={(page) => setAppPage(page)} />
          )}
          <LanguageSwitcher />
        </div>
      </header>

      <main
        className={
          screen === 'home'
            ? 'marketing-page'
            : screen === 'entry'
              ? 'landing-page'
              : screen === 'wizard'
                ? 'wizard-page'
                : 'app-page'
        }
      >
        {screen === 'home' && (
          <MarketingLanding
            onEnterProfile={() => {
              setScreen('entry')
              setMessage('')
              setFailed(false)
            }}
          />
        )}

        {screen === 'entry' && (
          <LandingScreen
            recoveryCode={recoveryCode}
            busy={busy}
            message={message}
            failed={failed}
            hasProfile={Boolean(profile)}
            onCodeChange={(value) => {
              setRecoveryCode(value)
              setMessage('')
              setFailed(false)
            }}
            onContinue={loadProfile}
            onStart={startProfile}
            onOpenProfile={() => {
              setScreen('app')
              setAppPage('overview')
            }}
          />
        )}

        {screen === 'wizard' && (
          <>
            {/* One top bar: back arrow on the left, step dots centered. */}
            <div className="wizard-top">
              <button
                type="button"
                className="wizard-back"
                aria-label={t('wizard.back')}
                onClick={() => {
                  if (step > 1) setStep((step - 1) as 1 | 2 | 3)
                  else {
                    // Step one has no earlier step; the entry screen is the
                    // funnel parent of the wizard.
                    setScreen('entry')
                    setMessage('')
                    setFailed(false)
                  }
                }}
              >
                <MorphIcon
                  icon={ArrowLeft}
                  size={20}
                  strokeWidth={2}
                  spring="snappy"
                  reducedMotion="user"
                />
              </button>

              {/* The numbered dots mirror the mock: three plain steps. */}
              <Stepper
                items={[
                  { id: 1, label: t('wizard.step1'), unlocked: true },
                  {
                    id: 2,
                    label: t('wizard.step2'),
                    unlocked: Boolean(profile),
                  },
                  {
                    id: 3,
                    label: t('wizard.step3'),
                    unlocked: Boolean(profile),
                  },
                ]}
                currentId={step}
                onSelect={(id) => {
                  if (id === 1 || (profile && id <= 3)) setStep(id as 1 | 2 | 3)
                }}
              />
            </div>

            {/* A profile is required from step 2 on; anything else falls back. */}
            {(step === 1 || !profile) && (
              <div className="wizard-shell">
                <h1>{t('wizard.s1.h1')}</h1>
                <p className="wizard-sub">{t('wizard.s1.sub')}</p>

                <div className="wizard-card">
                  {message && (
                    <p
                      className={failed ? 'notice error' : 'notice success'}
                      role={failed ? 'alert' : 'status'}
                    >
                      {message}
                    </p>
                  )}

                  <form onSubmit={saveProfile} noValidate>
                    <fieldset disabled={busy} className="plain-fieldset">
                      <label htmlFor="qualification">
                        {t('wizard.s1.degreeMajor')}
                      </label>
                      <div className="autocomplete">
                        <input
                          id="qualification"
                          value={details.qualification}
                          onChange={(event) =>
                            updateQualification(event.target.value)
                          }
                          placeholder={t('wizard.s1.degreeMajorPlaceholder')}
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
                        {t('wizard.s1.studyHelp')}
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
                          <label>{t('wizard.s1.level')}</label>
                          <p className="derived-level">
                            {details.educationLevel ||
                              t('wizard.s1.derivedAuto')}{' '}
                            <small>{t('wizard.s1.derived')}</small>
                          </p>
                        </>
                      ) : (
                        <>
                          <label htmlFor="education-level">
                            {t('wizard.s1.level')}
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

                      {/* Optional: typing suggests occupations, but the
                          field can stay empty. */}
                      <label htmlFor="current-role">
                        {t('wizard.s1.currentRole')}
                      </label>
                      <div className="autocomplete">
                        <input
                          id="current-role"
                          value={details.currentRole}
                          onChange={(event) =>
                            updateCurrentRole(event.target.value)
                          }
                          placeholder={t('wizard.s1.currentRolePlaceholder')}
                          autoComplete="off"
                          maxLength={120}
                          aria-expanded={currentRoleOptions.length > 0}
                          aria-controls="current-role-suggestions"
                          aria-describedby="current-role-help"
                        />

                        {currentRoleOptions.length > 0 && (
                          <ul
                            className="autocomplete-menu"
                            id="current-role-suggestions"
                          >
                            {currentRoleOptions.map((option) => (
                              <li key={option.code}>
                                <button
                                  type="button"
                                  onClick={() => selectCurrentRole(option)}
                                >
                                  <strong>
                                    {occupationTitle(option.label)}
                                  </strong>
                                  {option.description && (
                                    <small>{option.description}</small>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <p className="field-help" id="current-role-help">
                        {t('wizard.s1.currentRoleHelp')}
                      </p>

                      <button type="submit" className="btn block">
                        {busy ? t('entry.loading') : t('wizard.continue')}
                      </button>
                    </fieldset>
                  </form>

                  {/* Keep the code visible so the user can copy it. */}
                  {profile && (
                    <section className="recovery-note">
                      <label htmlFor="saved-code">
                        {t('wizard.recovery.label')}
                      </label>
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
                              ? t('wizard.recovery.copied')
                              : t('wizard.recovery.copy')
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
                        Keep this code private. Anyone with it can view and edit
                        your profile. This browser remembers it for you.
                      </p>
                      <button
                        type="button"
                        className="forget-login-button"
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
                </div>
              </div>
            )}

            {/* Step 2 collects the skills the catalogue can match against. */}
            {step === 2 && profile && (
              <div className="wizard-shell">
                <h1>{t('wizard.s2.h1')}</h1>
                <p className="wizard-sub">
                  Add what you can already do so roles can be matched to you.
                </p>

                <div className="wizard-card">
                  {(details.qualificationCode ||
                    details.degreeCode ||
                    details.majorCode ||
                    targetRole) && (
                    <div className="skill-recommendations">
                      <div>
                        <strong>{t('wizard.s2.studyTitle')}</strong>
                        <span>{t('wizard.s2.studyNote')}</span>
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
                    <label htmlFor="skill-name">{t('wizard.s2.skill')}</label>
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
                        placeholder={t('wizard.s2.placeholder')}
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

                      {/* Picking a suggestion saves it straight away, so the
                          search behaves like the suggestion chips above. */}
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
                                  void saveSkill(option.label, option.code)
                                }}
                              >
                                <strong>{option.label}</strong>
                                <small>
                                  {option.kind === 'tool'
                                    ? t('wizard.s2.kind.tool')
                                    : option.kind === 'knowledge'
                                      ? t('wizard.s2.kind.knowledge')
                                      : t('wizard.s2.kind.skill')}
                                </small>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <p id="skill-help">{t('wizard.s2.help')}</p>
                    {skillError && (
                      <p id="skill-error" className="field-error" role="alert">
                        {skillError}
                      </p>
                    )}
                  </form>

                  {skills.length === 0 ? (
                    <p className="empty-note">{t('wizard.s2.empty')}</p>
                  ) : (
                    <div className="chips-list">
                      {skills.map((skill) => (
                        <span className="chip" key={skill.id}>
                          {skill.name}
                          <button
                            type="button"
                            disabled={skillsBusy}
                            onClick={() => deleteSkill(skill.id)}
                            aria-label={t('wizard.s2.remove', {
                              name: skill.name,
                            })}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {wizardElicitation && (
                    <SkillPromptCard
                      courseTitle={profile?.qualification ?? ''}
                      skillLabel={wizardElicitation.label}
                      busy={skillsBusy}
                      onYes={() => void answerPromptYes(wizardElicitation)}
                      onNotYet={() => answerPromptNotYet(wizardElicitation)}
                    />
                  )}

                  <div className="wizard-nav single">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setStep(3)}
                    >
                      {t('wizard.continue')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 turns the profile into a concrete target role. */}
            {step === 3 && profile && (
              <div className="wizard-shell">
                <h1>{t('wizard.s3.h1')}</h1>
                <p className="wizard-sub">{t('wizard.s3.sub')}</p>

                <div className="wizard-card">
                  <form onSubmit={submitTargetRole} noValidate>
                    <fieldset
                      disabled={busy || targetRoleBusy}
                      className="plain-fieldset"
                    >
                      <label htmlFor="target-role">
                        {t('wizard.s3.occupation')}
                      </label>
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
                          placeholder={t('wizard.s3.placeholder')}
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
                                    setTargetRoleQuery(
                                      occupationTitle(option.label),
                                    )
                                    setTargetRoleCode(option.code)
                                    setTargetRoleOptions([])
                                    setTargetRoleError('')
                                    setTargetRoleMessage('')
                                  }}
                                >
                                  <span className="study-option-heading">
                                    <strong>
                                      {occupationTitle(option.label)}
                                    </strong>
                                    {option.growth5yPercent != null && (
                                      <span
                                        className={`growth-badge ${
                                          option.growth5yPercent >= 2
                                            ? 'positive'
                                            : ''
                                        }`}
                                      >
                                        {option.growth5yPercent > 0 ? '▲' : '▼'}{' '}
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

                      <p id="target-role-help">{t('wizard.s3.help')}</p>

                      {targetRoleError && (
                        <p
                          id="target-role-error"
                          className="field-error"
                          role="alert"
                        >
                          {targetRoleError}
                        </p>
                      )}

                      <button type="submit" className="btn block">
                        {targetRoleBusy
                          ? t('wizard.s3.saving')
                          : t('wizard.s3.save')}
                      </button>
                    </fieldset>
                  </form>

                  {targetRole && (
                    <p className="selected-target-role">
                      {t('wizard.s3.current')}{' '}
                      <strong>{targetRole.title}</strong>
                    </p>
                  )}

                  {targetRoleMessage && (
                    <p className="notice success" role="status">
                      {targetRoleMessage}
                    </p>
                  )}

                  <div className="wizard-nav single">
                    {targetRole && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setTargetRoleError('')
                          setTargetRoleMessage('')
                          setTargetRoleQuery(targetRole.title)
                          setTargetRoleCode(targetRole.code)
                          setTargetRoleOptions([])
                          setScreen('app')
                          setAppPage('overview')
                        }}
                      >
                        {t('wizard.s3.return')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {screen === 'app' && profile && (
          <>
            {appPage === 'overview' && (
              <>
                {skillPrompt && (
                  <SkillPromptCard
                    courseTitle={profile.qualification}
                    skillLabel={skillPrompt.label}
                    busy={skillPromptBusy}
                    onYes={() => void answerPromptYes(skillPrompt)}
                    onNotYet={() => answerPromptNotYet(skillPrompt)}
                  />
                )}
                <OverviewPage
                  profile={profile}
                  skills={skills}
                  targetRole={targetRole}
                  suggestions={suggestions}
                  requirements={requirements}
                  busy={skillsBusy || targetRoleBusy}
                  onEditTargetRole={() => {
                    setStep(3)
                    setScreen('wizard')
                  }}
                  onPlan={chooseSuggestedRole}
                  onGoMatches={() => setAppPage('matches')}
                  onGoWizard={() => {
                    setStep(1)
                    setScreen('wizard')
                  }}
                  onGoPage={(page) => setAppPage(page)}
                />
              </>
            )}

            {appPage === 'matches' && (
              <MatchesPage
                suggestions={suggestions}
                targetRole={targetRole}
                hint={suggestionHint}
                skillsCount={skills.length}
                busy={skillsBusy || targetRoleBusy}
                onPlan={chooseSuggestedRole}
              />
            )}

            {appPage === 'analysis' && (
              <AnalysisPage
                skills={skills}
                targetRole={targetRole}
                suggestions={suggestions}
                requirements={requirements}
                busy={skillsBusy}
                onAddSkill={(skill: RoleSkill) => {
                  void saveSkill(skill.name, skill.code)
                }}
                onSkillStatus={(skill: Skill, status: SkillStatus) => {
                  void cycleSkillStatus(skill, status)
                }}
                onRemoveSkill={(skill: Skill) => deleteSkill(skill.id)}
                onGoMatches={() => setAppPage('matches')}
                onEditTargetRole={() => {
                  setStep(3)
                  setScreen('wizard')
                }}
              />
            )}

            {appPage === 'role' && (
              <RoleDetailsPage
                targetRole={targetRole}
                skills={skills}
                requirements={requirements}
                busy={skillsBusy}
                onAddSkill={saveSkill}
                onGoPathways={() => setAppPage('pathways')}
              />
            )}

            {appPage === 'pathways' && (
              <PathwaysPage
                targetRole={targetRole}
                requirements={requirements}
                skills={skills}
                profileCode={profile.code}
                busy={skillsBusy}
                onGoRole={() => setAppPage('role')}
                onSkillStatus={(skill, status) => {
                  void cycleSkillStatus(skill, status)
                }}
              />
            )}

            {appPage === 'profile' && (
              <MyProfilePage
                profile={profile}
                recoveryCode={recoveryCode || profile.code}
                skills={skills}
                targetRole={targetRole}
                busy={skillsBusy || targetRoleBusy}
                onAddSkill={(name, code) => {
                  void saveSkill(name, code)
                }}
                onRemoveSkill={(skill) => deleteSkill(skill.id)}
                onSkillStatus={(skill, status) => {
                  void cycleSkillStatus(skill, status)
                }}
                onEditBackground={() => {
                  setStep(1)
                  setScreen('wizard')
                }}
                onEditTargetRole={() => {
                  setStep(3)
                  setScreen('wizard')
                }}
                promptSkill={elicitation}
                onDeclineSkill={(code) => {
                  const history = readPromptHistory()
                  history.notYet.push({ code: profile.code, skill: code })
                  writePromptHistory(history)
                  setPromptEpoch((current) => current + 1)
                }}
              />
            )}
          </>
        )}
      </main>

      <dialog
        ref={targetRoleDialogRef}
        className="confirm-dialog"
        aria-labelledby="target-role-confirm-title"
        aria-describedby="target-role-confirm-description"
        onCancel={(event) => {
          event.preventDefault()
          if (!targetRoleBusy) setPendingTargetRole(null)
        }}
        onClose={() => setPendingTargetRole(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget && !targetRoleBusy) {
            setPendingTargetRole(null)
          }
        }}
      >
        {pendingTargetRole && targetRole && (
          <div className="confirm-dialog-card">
            <p className="eyebrow">{t('profile.targetRole')}</p>
            <h2 id="target-role-confirm-title">{t('wizard.dialog.title')}</h2>
            <p id="target-role-confirm-description">{t('wizard.dialog.sub')}</p>

            <div
              className="role-change-summary"
              aria-label={t('wizard.dialog.changeAria')}
            >
              <span>
                <small>{t('wizard.dialog.current')}</small>
                <strong>{targetRole.title}</strong>
              </span>
              <span className="role-change-arrow" aria-hidden="true">
                →
              </span>
              <span>
                <small>{t('wizard.dialog.new')}</small>
                <strong>{pendingTargetRole.title}</strong>
              </span>
            </div>

            {targetRoleError && (
              <p className="field-error" role="alert">
                {targetRoleError}
              </p>
            )}

            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="btn ghost"
                disabled={targetRoleBusy}
                autoFocus
                onClick={() => setPendingTargetRole(null)}
              >
                {t('wizard.dialog.keep')}
              </button>
              <button
                type="button"
                className="btn"
                disabled={targetRoleBusy}
                onClick={() => void confirmTargetRoleChange()}
              >
                {targetRoleBusy
                  ? t('wizard.dialog.changing')
                  : t('wizard.dialog.confirm')}
              </button>
            </div>
          </div>
        )}
      </dialog>

      <footer className="app-footer">
        <span className="footer-brand">
          Hire<strong>Way</strong>
        </span>
        <span>{t('footer.tagline')}</span>
        <span className="footer-note">{t('footer.privacy')}</span>
      </footer>
    </>
  )
}
