import { useEffect, useState } from 'react'
import {
  loadSkillRecommendations,
  type SkillRecommendation,
} from '../lib/optionsApi'

const EMPTY_RECOMMENDATIONS: SkillRecommendation[] = []

// Only the actual request parameters determine when study recommendations
// reload. Changing a target role cannot change this endpoint's response.
export function useStudyRecommendations(
  degreeCode: string | null,
  majorCode: string | null,
) {
  const key =
    degreeCode || majorCode ? JSON.stringify([degreeCode, majorCode]) : null
  const [response, setResponse] = useState<{
    key: string
    recommendations: SkillRecommendation[]
  } | null>(null)
  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    void loadSkillRecommendations(degreeCode, majorCode, controller.signal)
      .then((recommendations) => {
        if (!controller.signal.aborted) setResponse({ key, recommendations })
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResponse({ key, recommendations: [] })
      })
    return () => controller.abort()
  }, [degreeCode, majorCode, key])

  return {
    recommendations:
      key && response?.key === key
        ? response.recommendations
        : EMPTY_RECOMMENDATIONS,
    recommendationsBusy: Boolean(key && response?.key !== key),
  }
}
