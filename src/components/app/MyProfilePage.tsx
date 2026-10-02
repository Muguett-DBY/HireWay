import { useRef, useState } from 'react'
import { Check, Copy, Trash2 } from 'lucide'
import { MorphIcon } from 'morphicons/react'
import { occupationTitle } from '../../lib/occupationTitle'
import { useI18n } from '../../lib/useI18n'
import { localizeMessage } from '../../lib/localizedErrors'
import { LocalizedText } from '../LocalizedText'
import { EducationLevelText } from '../EducationLevelSelect'
import { searchOptions } from '../../lib/optionsApi'
import { SkillPromptCard } from './SkillPromptCard'
import type { SaveSkillResult, Skill, SkillStatus } from '../../lib/skillsApi'
import type { Profile } from '../../lib/profileApi'
import type { TargetRole } from '../../lib/targetRoleApi'

const statusOrder: SkillStatus[] = ['upcoming', 'current', 'completed']
const statusKeys = {
  upcoming: 'analysis.status.upcoming',
  current: 'analysis.status.current',
  completed: 'analysis.status.completed',
} as const satisfies Record<SkillStatus, string>

type MyProfilePageProps = {
  profile: Profile
  recoveryCode: string
  skills: Skill[]
  targetRole: TargetRole | null
  busy: boolean
  onAddSkill: (name: string, code: string) => void
  onRemoveSkill: (skill: Skill) => Promise<SaveSkillResult>
  onSkillStatus: (skill: Skill, status: SkillStatus) => void
  onEditBackground: () => void
  onEditTargetRole: () => void
  promptSkill: { code: string; label: string } | null
  onDeclineSkill: (code: string) => void
}

// One page that manages everything the profile owns: the recovery code, the
// study background, the target role and the full skill list with its
// progress states. Background edits deep-link into the wizard because the
// course picker shares its machinery with the draft flow.
export function MyProfilePage({
  profile,
  recoveryCode,
  skills,
  targetRole,
  busy,
  onAddSkill,
  onRemoveSkill,
  onSkillStatus,
  onEditBackground,
  onEditTargetRole,
  promptSkill,
  onDeclineSkill,
}: MyProfilePageProps) {
  const { t, name } = useI18n()
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<
    { code: string; label: string; kind: string }[]
  >([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const searchTimer = useRef<number | null>(null)
  const removeTarget = useRef<Skill | null>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  // Debounced skill search against the same catalogue the wizard uses.
  function updateSearch(value: string) {
    setQuery(value)
    setError('')
    if (searchTimer.current) window.clearTimeout(searchTimer.current)
    if (value.trim().length < 2) {
      setOptions([])
      return
    }
    searchTimer.current = window.setTimeout(() => {
      void searchOptions('skills', value.trim())
        .then(setOptions)
        .catch(() => setOptions([]))
    }, 180)
  }

  function addFromOption(code: string, label: string) {
    setOptions([])
    setQuery('')
    void onAddSkill(label, code)
  }

  function copyCode() {
    void navigator.clipboard.writeText(recoveryCode).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  function askRemove(skill: Skill) {
    removeTarget.current = skill
    setConfirmingId(skill.id)
  }

  async function confirmRemove() {
    const skill = removeTarget.current
    setConfirmingId(null)
    if (!skill) return
    const result = await onRemoveSkill(skill)
    if (!result.ok) setError(result.error || 'profile.removeError')
  }

  return (
    <>
      <section className="app-hero">
        <p className="eyebrow">{t('profile.eyebrow')}</p>
        <h1>{t('profile.h1')}</h1>
        <p className="app-hero-sub">{t('profile.sub')}</p>
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>{t('profile.recovery')}</h2>
        </div>
        <div className="recovery-code-row">
          <input
            id="profile-code"
            value={recoveryCode}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
            aria-label={t('profile.recovery')}
          />
          <button type="button" className="btn ghost" onClick={copyCode}>
            {copied ? (
              <MorphIcon icon={Check} size={16} />
            ) : (
              <MorphIcon icon={Copy} size={16} />
            )}
            {copied ? t('wizard.recovery.copied') : t('wizard.recovery.copy')}
          </button>
        </div>
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>{t('profile.background')}</h2>
          <button type="button" className="link-btn" onClick={onEditBackground}>
            {t('profile.editBackground')}
          </button>
        </div>
        <div className="snapshot-grid">
          <article className="snapshot-card">
            <span>{t('overview.background')}</span>
            <strong>
              {profile.degreeCode ||
              profile.majorCode ||
              profile.qualificationCode ? (
                <LocalizedText text={profile.qualification} />
              ) : (
                profile.qualification
              )}
            </strong>
            <small>
              <EducationLevelText value={profile.educationLevel} />
            </small>
          </article>
          <article className="snapshot-card">
            <span>{t('profile.targetRole')}</span>
            {targetRole ? (
              <>
                <strong>
                  <LocalizedText text={occupationTitle(targetRole.title)} />
                </strong>
                <button
                  type="button"
                  className="link-btn"
                  onClick={onEditTargetRole}
                >
                  {t('profile.changeRole')}
                </button>
              </>
            ) : (
              <>
                <strong>{t('overview.chooseTitle')}</strong>
                <button
                  type="button"
                  className="link-btn"
                  onClick={onEditTargetRole}
                >
                  {t('overview.chooseCta')}
                </button>
              </>
            )}
          </article>
        </div>
      </section>

      <section className="page-section">
        <div className="section-row">
          <h2>{t('profile.skills')}</h2>
          <span className="section-tag">
            {t('profile.skillsTag', { n: skills.length })}
          </span>
        </div>

        {promptSkill && (
          <SkillPromptCard
            courseTitle={profile.qualification}
            skillLabel={promptSkill.label}
            busy={busy}
            onYes={() => onAddSkill(promptSkill.label, promptSkill.code)}
            onNotYet={() => onDeclineSkill(promptSkill.code)}
          />
        )}

        <form
          className="profile-skill-form"
          onSubmit={(event) => event.preventDefault()}
        >
          <input
            value={query}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder={t('wizard.s2.placeholder')}
            aria-label={t('wizard.s2.skill')}
            autoComplete="off"
            maxLength={80}
            disabled={busy}
          />
          {options.length > 0 && (
            <ul className="autocomplete-menu" aria-label={t('wizard.s2.skill')}>
              {options.map((option) => (
                <li key={option.code}>
                  <button
                    type="button"
                    onClick={() => addFromOption(option.code, option.label)}
                  >
                    <strong>
                      <LocalizedText text={option.label} />
                    </strong>
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
        </form>
        {error && (
          <p className="field-error" role="alert">
            {localizeMessage(error, t)}
          </p>
        )}

        {skills.length === 0 ? (
          <p className="empty-note">{t('profile.noSkills')}</p>
        ) : (
          <div className="progress-list">
            {skills.map((skill) => (
              <article className="progress-row" key={skill.id}>
                <span className="progress-name">
                  {skill.skillCode ? (
                    <LocalizedText text={skill.name} />
                  ) : (
                    skill.name
                  )}
                </span>
                <div className="progress-actions">
                  <div
                    className="status-cycle"
                    role="group"
                    aria-label={t('workspace.progressStatus', {
                      name: name(skill.name),
                    })}
                  >
                    {statusOrder.map((status) => (
                      <button
                        type="button"
                        key={status}
                        className={
                          skill.status === status
                            ? 'status-pill active'
                            : 'status-pill'
                        }
                        disabled={busy}
                        onClick={() => onSkillStatus(skill, status)}
                        aria-pressed={skill.status === status}
                      >
                        {t(statusKeys[status])}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="remove-skill-button"
                    disabled={busy}
                    aria-label={t('analysis.removeAria', {
                      name: name(skill.name),
                    })}
                    onClick={() => askRemove(skill)}
                  >
                    <MorphIcon icon={Trash2} size={16} />
                  </button>
                </div>
                {confirmingId === skill.id && (
                  <div className="remove-skill-confirm">
                    <p>{t('analysis.remove.sub')}</p>
                    <div className="confirm-dialog-actions">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => setConfirmingId(null)}
                      >
                        {t('analysis.remove.cancel')}
                      </button>
                      <button
                        type="button"
                        className="btn"
                        disabled={busy}
                        onClick={() => void confirmRemove()}
                      >
                        {t('analysis.remove.confirm')}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
