type CandidateRow = {
  code: string
  title: string
  skillMatch: number
  growthPercentile: number
  skillLevel: number | null
}

type SavedSkillRow = {
  skillCode: string
  kind: string
}

type OverlapRow = {
  code: string
  name: string
  contribution: number
}

type FeedbackRow = {
  occupationCode: string
  reaction: string
}

type Suggestion = {
  code: string
  title: string
  matchScore: number
  reasons: string[]
  factors: { skill: number; growth: number; education: number }
  reaction: string | null
}

// The factor weights sum to one so the score stays on a 0-100 scale.
const WEIGHTS = { skill: 0.6, growth: 0.25, education: 0.15 }

// Claimed tools weigh slightly more than broad skills.
const USER_WEIGHTS = { tool: 1.0, skill: 0.8 }

const EDUCATION_RANKS: Record<string, number> = {
  'High School': 1,
  'Diploma / Certificate': 2,
  Bachelor: 3,
  Master: 4,
  Doctorate: 5,
  Other: 3,
}

// How close the role's typical skill level sits to the user's education.
function educationFactor(
  educationLevel: string | null,
  skillLevel: number | null,
): number {
  if (!educationLevel || !skillLevel) return 0.5
  const userRank = EDUCATION_RANKS[educationLevel] ?? null
  if (!userRank) return 0.5
  return Math.max(0, 1 - Math.abs(userRank - skillLevel) / 3)
}

// Suggest occupations by ranking them against one user's saved skills.
export async function handleRoleSuggestions(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json(
      { error: 'Method not allowed.' },
      { status: 405, headers: { Allow: 'GET' } },
    )
  }

  const authorization = request.headers.get('Authorization') ?? ''
  const code = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : ''

  if (!code) {
    return Response.json(
      { error: 'Enter your recovery code.' },
      { status: 401 },
    )
  }

  const [profile, skillResult, feedbackResult] = await Promise.all([
    env.DB.prepare(
      'SELECT education_level AS educationLevel FROM profile WHERE code = ?',
    )
      .bind(code)
      .first<{ educationLevel: string }>(),
    env.DB.prepare(
      `SELECT ps.skill_code AS skillCode, s.kind
       FROM profile_skill ps
       JOIN skill s ON s.code = ps.skill_code
       WHERE ps.profile_code = ?`,
    )
      .bind(code)
      .all<SavedSkillRow>(),
    env.DB.prepare(
      `SELECT occupation_code AS occupationCode, reaction
       FROM profile_role_feedback WHERE profile_code = ?`,
    )
      .bind(code)
      .all<FeedbackRow>(),
  ])

  if (!profile) {
    return Response.json({ error: 'Profile not found.' }, { status: 404 })
  }

  const savedSkills = skillResult.results
  const feedback = new Map(
    feedbackResult.results.map((row) => [row.occupationCode, row.reaction]),
  )

  if (savedSkills.length === 0) {
    return Response.json({
      suggestions: [],
      hint: 'Add a few skills to unlock career suggestions built from real occupation data.',
    })
  }

  // The user vector is small, so the whole ranking runs in one query.
  const userVector: Record<string, number> = {}
  for (const skill of savedSkills) {
    userVector[skill.skillCode] =
      USER_WEIGHTS[skill.kind as keyof typeof USER_WEIGHTS] ??
      USER_WEIGHTS.skill
  }
  const userNorm = Math.sqrt(
    Object.values(userVector).reduce(
      (total, value) => total + value * value,
      0,
    ),
  )

  const placeholders = Object.keys(userVector)
    .map(() => '(?, ?)')
    .join(', ')
  const bindings = Object.entries(userVector).flatMap(([skillCode, weight]) => [
    skillCode,
    weight,
  ])

  // Skills drive the shortlist; high-growth roles keep discovery open.
  const skillCandidates = await env.DB.prepare(
    `WITH user_skills (skill_code, weight) AS (
       VALUES ${placeholders}
     )
     SELECT v.occupation_code AS code, o.title,
            SUM(v.score * user_skills.weight) / m.skill_norm AS skillMatch,
            m.growth_percentile AS growthPercentile,
            o.skill_level AS skillLevel
     FROM user_skills
     JOIN occupation_skill_vector v
       ON v.skill_code = user_skills.skill_code
     JOIN occupation_match m ON m.occupation_code = v.occupation_code
     JOIN occupation o ON o.code = v.occupation_code
     GROUP BY v.occupation_code
     ORDER BY skillMatch DESC
     LIMIT 40`,
  )
    .bind(...bindings)
    .all<CandidateRow>()

  const growthCandidates = await env.DB.prepare(
    `SELECT m.occupation_code AS code, o.title,
            0 AS skillMatch,
            m.growth_percentile AS growthPercentile,
            o.skill_level AS skillLevel
     FROM occupation_match m
     JOIN occupation o ON o.code = m.occupation_code
     ORDER BY m.growth_percentile DESC
     LIMIT 25`,
  ).all<CandidateRow>()

  const candidates = new Map<string, CandidateRow>()
  for (const row of skillCandidates.results) {
    candidates.set(row.code, row)
  }
  for (const row of growthCandidates.results) {
    if (!candidates.has(row.code)) candidates.set(row.code, row)
  }

  // Skill overlaps are fetched once and reused for every explanation.
  const overlaps = new Map<string, { name: string; contribution: number }[]>()
  const overlapResult = await env.DB.prepare(
    `WITH user_skills (skill_code, weight) AS (
       VALUES ${placeholders}
     )
     SELECT v.occupation_code AS code, s.name AS name,
            v.score * user_skills.weight AS contribution
     FROM user_skills
     JOIN occupation_skill_vector v
       ON v.skill_code = user_skills.skill_code
     JOIN skill s ON s.code = v.skill_code
     WHERE v.occupation_code IN (${[...candidates.keys()]
       .map(() => '?')
       .join(', ')})`,
  )
    .bind(...bindings, ...candidates.keys())
    .all<OverlapRow>()

  for (const row of overlapResult.results) {
    const list = overlaps.get(row.code) ?? []
    list.push({ name: row.name, contribution: row.contribution })
    overlaps.set(row.code, list)
  }

  const userNormValue = userNorm || 1
  const suggestions: Suggestion[] = []

  for (const candidate of candidates.values()) {
    // Dismissed roles leave the list; reactions elsewhere nudge the score.
    const reaction = feedback.get(candidate.code) ?? null
    if (reaction === 'not_for_me') continue

    const skillFactor = (candidate.skillMatch || 0) / userNormValue
    const educationMatch = educationFactor(
      profile.educationLevel,
      candidate.skillLevel,
    )

    let score =
      100 *
      (WEIGHTS.skill * skillFactor +
        WEIGHTS.growth * candidate.growthPercentile +
        WEIGHTS.education * educationMatch)
    if (reaction === 'curious') score += 3
    if (reaction === 'interested') score += 6

    const reasons: string[] = []
    const topSkills = (overlaps.get(candidate.code) ?? [])
      .sort((left, right) => right.contribution - left.contribution)
      .slice(0, 2)
      .map((overlap) => overlap.name)
    if (topSkills.length > 0) {
      reasons.push(
        `${topSkills.join(' and ')} ${topSkills.length > 1 ? 'are' : 'is'} part of this role's usual toolkit`,
      )
    }
    const growthShare = Math.round(candidate.growthPercentile * 100)
    reasons.push(
      `Projected growth beats ${growthShare}% of Australian occupations`,
    )
    if (educationMatch >= 0.8) {
      reasons.push(`The typical skill level lines up with your education`)
    } else if (educationMatch < 0.5) {
      reasons.push(`Usually asks for a different study level`)
    }
    if (reaction === 'interested' || reaction === 'curious') {
      reasons.push(`You marked this role as ${reaction.replace('_', ' ')}`)
    }

    suggestions.push({
      code: candidate.code,
      title: candidate.title,
      matchScore: Math.max(0, Math.min(99, Math.round(score))),
      reasons,
      factors: {
        skill: Math.round(WEIGHTS.skill * skillFactor * 100),
        growth: Math.round(WEIGHTS.growth * candidate.growthPercentile * 100),
        education: Math.round(WEIGHTS.education * educationMatch * 100),
      },
      reaction,
    })
  }

  suggestions.sort(
    (left, right) =>
      right.matchScore - left.matchScore ||
      left.title.localeCompare(right.title),
  )

  return Response.json({
    suggestions: suggestions.slice(0, 12),
    modelledOccupations: candidates.size,
  })
}
