import type { RoleSuggestion } from './suggestionApi'

// Factors arrive as weighted points out of each weight's ceiling
// (skill 60, growth 15, education 25). Growth and education already sit on
// a natural 0-100 scale: growth is a percentile and education is level fit
// times field affinity. The skill factor is a cosine against the role's
// whole skill space, so a small profile tops out far below 100 even for a
// strong match - a one-skill profile peaks around 0.2 and a rich one near
// 0.5. Calibrate the skill display against that practical ceiling so the
// number reads as alignment strength rather than raw coverage. Presentation
// only: the ranking orders by the raw factor, which stays untouched.
const SKILL_CEILING = 60
const GROWTH_CEILING = 15
const EDUCATION_CEILING = 25
const SKILL_DISPLAY_CEILING = 0.55

export function factorPercents(factors: RoleSuggestion['factors']): {
  skill: number
  growth: number
  education: number
} {
  const cosine = factors.skill / SKILL_CEILING
  return {
    skill: Math.min(100, Math.round((cosine / SKILL_DISPLAY_CEILING) * 100)),
    growth: Math.min(100, Math.round((factors.growth / GROWTH_CEILING) * 100)),
    education: Math.min(
      100,
      Math.round((factors.education / EDUCATION_CEILING) * 100),
    ),
  }
}
