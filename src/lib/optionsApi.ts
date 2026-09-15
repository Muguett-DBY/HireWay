// Autocomplete and recommendation menus share one catalogue shape.
export type CatalogueOption = {
  code: string
  label: string
  description: string
  kind: 'education' | 'occupation' | 'skill' | 'tool' | 'knowledge'
  // Only occupation results carry the five-year projection figure.
  growth5yPercent?: number | null
}

export type StudyOption = {
  degreeCode: string | null
  majorCode: string | null
  label: string
  description: string
  educationLevel: string | null
  kind: 'course' | 'major'
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

// Course names and ASCED fields share one search box on the profile form.
export async function searchStudyOptions(
  query: string,
  signal?: AbortSignal,
): Promise<StudyOption[]> {
  const response = await fetch(
    `/api/options/studies?q=${encodeURIComponent(query)}`,
    { signal },
  )

  if (!response.ok) throw new Error('Could not load study suggestions.')
  const data: { options: StudyOption[] } = await response.json()
  return data.options
}

// Recommendations only use the selected course or ASCED field.
export async function loadSkillRecommendations(
  degreeCode: string | null,
  majorCode: string | null,
  signal?: AbortSignal,
): Promise<SkillRecommendation[]> {
  const parameters = new URLSearchParams()
  if (degreeCode) parameters.set('degreeCode', degreeCode)
  if (majorCode) parameters.set('majorCode', majorCode)

  if (parameters.size === 0) return []
  const response = await fetch(
    `/api/recommendations/skills?${parameters.toString()}`,
    { signal },
  )

  if (!response.ok) throw new Error('Could not load skill suggestions.')
  const data: { recommendations: SkillRecommendation[] } = await response.json()
  return data.recommendations
}
