// Autocomplete and recommendation menus share one catalogue shape.
export type CatalogueOption = {
  code: string
  label: string
  description: string
  kind: 'education' | 'occupation' | 'skill' | 'tool'
}

export type SkillRecommendation = CatalogueOption & {
  score: number
  reason: 'education' | 'goal' | 'education and goal'
}

type OptionGroup = 'education' | 'goals' | 'skills'

// Let the page cancel an old search when the user keeps typing.
export async function searchOptions(
  group: OptionGroup,
  query: string,
  signal?: AbortSignal,
): Promise<CatalogueOption[]> {
  const response = await fetch(
    `/api/options/${group}?q=${encodeURIComponent(query)}`,
    { signal },
  )

  if (!response.ok) throw new Error('Could not load suggestions.')
  const data: { options: CatalogueOption[] } = await response.json()
  return data.options
}

// Recommendations can use the major, career goal, or both together.
export async function loadSkillRecommendations(
  educationCode: string | null,
  goalCode: string | null,
  signal?: AbortSignal,
): Promise<SkillRecommendation[]> {
  const parameters = new URLSearchParams()
  if (educationCode) parameters.set('educationCode', educationCode)
  if (goalCode) parameters.set('goalCode', goalCode)

  if (parameters.size === 0) return []
  const response = await fetch(
    `/api/recommendations/skills?${parameters.toString()}`,
    { signal },
  )

  if (!response.ok) throw new Error('Could not load skill suggestions.')
  const data: { recommendations: SkillRecommendation[] } = await response.json()
  return data.recommendations
}
