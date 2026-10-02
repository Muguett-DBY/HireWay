import type {
  RecommendationReason,
  RoleSuggestion,
} from '../../lib/suggestionApi'
import { useI18n } from '../../lib/useI18n'
import { useLocalizedText } from '../../lib/useLocalizedText'

// Compatibility only for responses from older deployments. New responses use codes.
function legacyReason(reason: string): RecommendationReason | undefined {
  const growth = reason.match(
    /^Projected growth beats (\d+)% of Australian occupations$/,
  )
  if (growth) return { code: 'growth', percentile: Number(growth[1]) }
  if (reason === 'The typical skill level lines up with your education')
    return { code: 'educationAligned' }
  if (reason === 'Usually asks for a different study level')
    return { code: 'educationDifferent' }
  const skills = reason.match(
    /^(.*) (?:are|is) part of this role's usual toolkit$/,
  )
  if (skills) return { code: 'skills', skills: [skills[1]] }
  return undefined
}

function SkillReason({ skills }: { skills: string[] }) {
  // Current engine returns at most two terms; separate translation preserves names.
  const first = useLocalizedText(skills[0] ?? '')
  const second = useLocalizedText(skills[1] ?? '')
  const { t, locale } = useI18n()
  const names = new Intl.ListFormat(locale, { type: 'conjunction' }).format(
    [first, second].filter(Boolean),
  )
  return <>{t('workspace.reason.skills', { skills: names })}</>
}

function Reason({ reason }: { reason: RecommendationReason }) {
  const { t } = useI18n()
  if (reason.code === 'skills') return <SkillReason skills={reason.skills} />
  if (reason.code === 'growth')
    return <>{t('workspace.reason.growth', { n: reason.percentile })}</>
  return (
    <>
      {t(
        reason.code === 'educationAligned'
          ? 'workspace.reason.educationAligned'
          : 'workspace.reason.educationDifferent',
      )}
    </>
  )
}

export function RecommendationReasons({
  suggestion,
  limit = 3,
}: {
  suggestion: RoleSuggestion
  limit?: number
}) {
  const reasons =
    suggestion.reasonDetails ?? suggestion.reasons.map(legacyReason)
  return (
    <ul className="why-list">
      {reasons.slice(0, limit).map((reason, index) => (
        <li key={index}>
          {reason ? (
            <Reason reason={reason} />
          ) : (
            <span lang="en">{suggestion.reasons[index]}</span>
          )}
        </li>
      ))}
    </ul>
  )
}
