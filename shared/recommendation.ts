// Language-neutral explanation data shared by Worker and UI.
export type RecommendationReason =
  | { code: 'skills'; skills: string[] }
  | { code: 'growth'; percentile: number }
  | { code: 'educationAligned' | 'educationDifferent' }
