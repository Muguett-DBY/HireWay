export type RoleSuggestion = {
  code: string
  title: string
  matchScore: number
  reasons: string[]
  // Each factor's weighted share of the score, so the card can chart it.
  factors: { skill: number; growth: number; education: number }
  growthPercentile: number
  reaction: 'not_for_me' | 'curious' | 'interested' | null
}

export type RoleSuggestions = {
  suggestions: RoleSuggestion[]
  hint?: string
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

// Deck reactions feed straight back into the next ranking run.
export async function sendRoleFeedback(
  profileCode: string,
  occupationCode: string,
  reaction: 'not_for_me' | 'curious' | 'interested',
): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch('/api/role-feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + profileCode,
    },
    body: JSON.stringify({ occupationCode, reaction }),
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  return response.ok
    ? { ok: true }
    : { ok: false, error: data.error ?? 'Could not save your reaction.' }
}
