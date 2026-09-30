import { useI18n } from '../../lib/useI18n'

type SkillPromptCardProps = {
  courseTitle: string
  skillLabel: string
  busy: boolean
  onYes: () => void
  onNotYet: () => void
}

// A light elicitation card for thin profiles: the study pathway knows which
// tools its graduates use, so the overview asks about one at a time. Either
// answer is remembered and at most a few questions are ever asked.
export function SkillPromptCard({
  courseTitle,
  skillLabel,
  busy,
  onYes,
  onNotYet,
}: SkillPromptCardProps) {
  const { t } = useI18n()
  return (
    <section className="skill-prompt" aria-label="Quick skill question">
      <span className="skill-prompt-tag">{t('prompt.tag')}</span>
      <p className="skill-prompt-text">
        {t('prompt.question', { course: courseTitle, skill: skillLabel })}
      </p>
      <div className="skill-prompt-actions">
        <button type="button" className="btn" disabled={busy} onClick={onYes}>
          {t('prompt.yes')}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={busy}
          onClick={onNotYet}
        >
          {t('prompt.notYet')}
        </button>
      </div>
    </section>
  )
}
