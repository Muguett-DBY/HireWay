import type { RecommendationReason } from '../../shared/recommendation'
export type { RecommendationReason } from '../../shared/recommendation'

export type RoleSuggestion = {
  code: string
  title: string
  matchScore: number
  reasons: string[]
  reasonDetails?: RecommendationReason[]
  // Each factor's weighted share of the score, so the card can chart it.
  factors: { skill: number; growth: number; education: number }
  change5yPercent: number | null
  medianWeeklyEarnings: number | null
  growthPercentile: number
}

export type RoleSuggestions = {
  suggestions: RoleSuggestion[]
  hint?: string
  hintCode?: 'knowledgeOnly' | 'noSkills'
  modelledOccupations?: number
}

type SuggestionsResult =
  { ok: true; data: RoleSuggestions } | { ok: false; data: { error?: string } }

// Suggestions are personal, so the recovery code scopes every request.
export async function loadRoleSuggestions(
  profileCode: string,
  signal?: AbortSignal,
): Promise<SuggestionsResult> {
  const response = await fetch('/api/recommendations/roles', {
    headers: { Authorization: 'Bearer ' + profileCode },
    cache: 'no-store',
    signal,
  })
  const data = await response.json()
  return response.ok ? { ok: true, data } : { ok: false, data }
}
