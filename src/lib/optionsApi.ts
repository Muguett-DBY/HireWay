// Autocomplete and recommendation menus share one catalogue shape.
export type CatalogueOption = {
  code: string
  label: string
  description: string
  kind: 'education' | 'occupation' | 'skill' | 'tool'
}

export type SkillRecommendation = CatalogueOption & {
  score: number
  reason: 'education' | 'target role' | 'education and target role'
}

type OptionGroup = 'education' | 'occupations' | 'skills'

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

// Recommendations can use the major, target role, or both together.
export async function loadSkillRecommendations(
  educationCode: string | null,
  targetRoleCode: string | null,
  signal?: AbortSignal,
): Promise<SkillRecommendation[]> {
  const parameters = new URLSearchParams()
  if (educationCode) parameters.set('educationCode', educationCode)
  if (targetRoleCode) parameters.set('targetRoleCode', targetRoleCode)

  if (parameters.size === 0) return []
  const response = await fetch(
    `/api/recommendations/skills?${parameters.toString()}`,
    { signal },
  )

  if (!response.ok) throw new Error('Could not load skill suggestions.')
  const data: { recommendations: SkillRecommendation[] } = await response.json()
  return data.recommendations
}
