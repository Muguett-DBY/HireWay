type CandidateRow = {
  code: string
  title: string
  skillMatch: number
  growthPercentile: number
  skillLevel: number | null
  change5yPercent: number | null
  medianWeeklyEarnings: number | null
  vectorSource: string
  overlap: number
}

type SavedSkillRow = {
  skillCode: string
  kind: string
}

type BridgeRow = { code: string; onet: string }
type OverlapRow = { code: string; name: string; contribution: number }

type Suggestion = {
  code: string
  title: string
  matchScore: number
  reasons: string[]
  factors: { skill: number; growth: number; education: number }
  change5yPercent: number | null
  medianWeeklyEarnings: number | null
}

// The factor weights sum to one so the score stays on a 0-100 scale.
// Education carries real weight because it now measures field alignment,
// not just the award level.
const WEIGHTS = { skill: 0.6, growth: 0.15, education: 0.25 }

// Bridge codes shared by many OSCA occupations (Managers, All Other and
// friends) carry no field signal, so affinity ignores them on both sides.
const GENERIC_BRIDGE_MAX = 15

// Claimed tools weigh slightly more than broad skills.
const USER_WEIGHTS = { tool: 1.0, skill: 0.8 }

const EDUCATION_RANKS: Record<string, number> = {
  'High School': 1,
  'Diploma / Certificate': 2,
  Bachelor: 3,
  Master: 4,
  Doctorate: 5,
}

// OSCA 1 is bachelor-or-higher; OSCA 5 is secondary education.
// Levels 2-4 share our coarse Diploma / Certificate profile category.
const OSCA_EDUCATION_RANKS: Record<number, number> = {
  1: 3,
  2: 2,
  3: 2,
  4: 2,
  5: 1,
}

// Compare education levels on the same scale, without penalising higher awards.
function educationFactor(
  educationLevel: string | null,
  skillLevel: number | null,
): number {
  if (!educationLevel || !skillLevel) return 0.5
  const userRank = EDUCATION_RANKS[educationLevel] ?? null
  const requiredRank = OSCA_EDUCATION_RANKS[skillLevel] ?? null
  if (!userRank || !requiredRank) return 0.5
  const shortfall = Math.max(0, requiredRank - userRank)
  return Math.max(0, 1 - shortfall / 3)
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

  const [profile, skillResult, spreadResult] = await Promise.all([
    env.DB.prepare(
      'SELECT education_level AS educationLevel, degree_code AS degreeCode ' +
        'FROM profile WHERE code = ?',
    )
      .bind(code)
      .first<{ educationLevel: string; degreeCode: string | null }>(),
    // Planned gap skills are not yet owned; current and completed skills
    // keep contributing to recommendations as before.
    env.DB.prepare(
      `SELECT ps.skill_code AS skillCode, s.kind
       FROM profile_skill ps
       JOIN skill s ON s.code = ps.skill_code
       WHERE ps.profile_code = ? AND ps.status != 'upcoming'`,
    )
      .bind(code)
      .all<SavedSkillRow>(),
    // How many OSCA occupations share each O*NET bridge code.
    env.DB.prepare(
      'SELECT onet_code AS onet, COUNT(DISTINCT occupation_code) AS n ' +
        'FROM occupation_onet_map GROUP BY onet_code',
    ).all<{ onet: string; n: number }>(),
  ])

  if (!profile) {
    return Response.json({ error: 'Profile not found.' }, { status: 404 })
  }

  const specificBridgeCodes = new Set(
    spreadResult.results
      .filter((row) => row.n <= GENERIC_BRIDGE_MAX)
      .map((row) => row.onet),
  )

  const savedSkills = skillResult.results

  // Knowledge areas describe what someone knows about, not what they can
  // do, so they never enter the match. A profile holding only knowledge
  // items gets the honest hint rather than a wall of unrelated cards.
  const matchable = savedSkills.filter((skill) => skill.kind !== 'knowledge')
  if (matchable.length === 0) {
    return Response.json({
      suggestions: [],
      hint: savedSkills.length
        ? 'Knowledge areas alone do not drive matching - add a few tools or skills you can use.'
        : 'Add a few skills to unlock career suggestions built from real occupation data.',
    })
  }

  const userVectorRaw: Record<string, number> = {}
  for (const skill of matchable) {
    userVectorRaw[skill.skillCode] =
      USER_WEIGHTS[skill.kind as keyof typeof USER_WEIGHTS] ??
      USER_WEIGHTS.skill
  }

  // Document frequency across every modelled occupation: common office
  // tools appear in most vectors, so matching on them proves little.
  const freqResult = await env.DB.prepare(
    `SELECT skill_code AS code,
            COUNT(DISTINCT occupation_code) AS freq
     FROM occupation_skill_vector
     WHERE skill_code IN (SELECT value FROM json_each(?))
     GROUP BY skill_code`,
  )
    .bind(JSON.stringify(Object.keys(userVectorRaw)))
    .all<{ code: string; freq: number }>()
  const totalModelled = await env.DB.prepare(
    'SELECT COUNT(DISTINCT occupation_code) AS n FROM occupation_skill_vector',
  ).first<{ n: number }>()
  const total = totalModelled?.n || 1
  const frequency = new Map(
    freqResult.results.map((row) => [row.code, row.freq / total]),
  )

  // Rank the full user vector in one query, regardless of saved skill count.
  const userVector: Record<string, number> = {}
  for (const skill of matchable) {
    const base =
      USER_WEIGHTS[skill.kind as keyof typeof USER_WEIGHTS] ??
      USER_WEIGHTS.skill
    const rarity = 1 - (frequency.get(skill.skillCode) ?? 0)
    // Keep a floor so no saved skill ever counts for nothing.
    userVector[skill.skillCode] = base * Math.max(0.15, rarity)
  }
  const userNorm = Math.sqrt(
    Object.values(userVector).reduce(
      (total, value) => total + value * value,
      0,
    ),
  )

  // D1 allows only 100 bound parameters per query. Expand one JSON binding
  // into rows instead of spending two bindings per saved skill. JSON stays
  // parameterised; neither skill codes nor weights are interpolated into SQL.
  const userVectorJson = JSON.stringify(userVector)

  // Every occupation sharing at least one skill enters the ranking; the
  // weighted score, not a skill-only pre-cut, decides who surfaces. Cutting
  // candidates by raw skill similarity first used to lock out professions
  // with rich vectors (law, nursing, accounting) behind thin ones. The norm
  // divisor carries a shrinkage constant (found by grid search) so thin
  // vectors stop inflating a single matching skill into a top ranking -
  // without it, "Mathematics" alone ranked bricklayers above statisticians.
  const SHRINKAGE = 500
  const skillCandidates = await env.DB.prepare(
    `WITH user_skills (skill_code, weight) AS (
       SELECT key, value FROM json_each(?)
     )
     SELECT v.occupation_code AS code, o.title,
            SUM(v.score * user_skills.weight) / (m.skill_norm + ${SHRINKAGE})
              * CASE m.vector_source WHEN 'onet' THEN 1.0 ELSE 0.6 END
              AS skillMatch,
            m.growth_percentile AS growthPercentile,
            o.skill_level AS skillLevel,
            mk.change_5y_percent AS change5yPercent,
            mk.median_weekly_earnings AS medianWeeklyEarnings,
            m.vector_source AS vectorSource,
            COUNT(DISTINCT v.skill_code) AS overlap
     FROM user_skills
     JOIN occupation_skill_vector v
       ON v.skill_code = user_skills.skill_code
     JOIN skill s ON s.code = v.skill_code
     JOIN occupation_match m ON m.occupation_code = v.occupation_code
     JOIN occupation o ON o.code = v.occupation_code
     LEFT JOIN occupation_anzsco_map om
       ON om.occupation_code = v.occupation_code AND om.is_primary = 1
     LEFT JOIN anzsco4_market mk ON mk.anzsco4_code = om.anzsco_code
     WHERE s.kind != 'knowledge'
     GROUP BY v.occupation_code
     HAVING COUNT(DISTINCT v.skill_code) >= 1`,
  )
    .bind(userVectorJson)
    .all<CandidateRow>()

  const candidates = new Map<string, CandidateRow>()
  for (const row of skillCandidates.results) {
    candidates.set(row.code, row)
  }

  // Field affinity: does the user's degree pathway reach this occupation?
  // The feeder set walks degree -> ASCED majors -> CIP programs -> O*NET;
  // each occupation's basis is its own bridge codes, inherited from its
  // ANZSCO group when it has none of its own. Without either side the
  // factor falls back to the plain education-level comparison.
  const feeder = new Set<string>()
  if (profile.degreeCode) {
    const feederResult = await env.DB.prepare(
      `SELECT DISTINCT e.onet_code AS onet
       FROM degree_major_map d
       JOIN study_program_map p ON p.major_code = d.major_code
       JOIN education_onet_map e ON e.education_code = p.education_code
       WHERE d.degree_code = ?`,
    )
      .bind(profile.degreeCode)
      .all<{ onet: string }>()
    for (const row of feederResult.results) {
      if (specificBridgeCodes.has(row.onet)) feeder.add(row.onet)
    }
  }

  const candidateCodesJson = JSON.stringify([...candidates.keys()])
  // Each list uses a single binding, removing the former serial chunk
  // requests. D1 executes one query at a time per database; batching these
  // independent reads saves round trips without flooding its request queue.
  const [direct, overlapResult] = (await env.DB.batch([
    env.DB.prepare(
      `SELECT occupation_code AS code, onet_code AS onet
       FROM occupation_onet_map
       WHERE occupation_code IN (SELECT value FROM json_each(?))`,
    ).bind(candidateCodesJson),
    env.DB.prepare(
      `WITH user_skills (skill_code, weight) AS (
         SELECT key, value FROM json_each(?)
       )
       SELECT v.occupation_code AS code, s.name AS name,
              v.score * user_skills.weight AS contribution
       FROM user_skills
       JOIN occupation_skill_vector v
         ON v.skill_code = user_skills.skill_code
       JOIN skill s ON s.code = v.skill_code
       WHERE v.occupation_code IN (SELECT value FROM json_each(?))`,
    ).bind(userVectorJson, candidateCodesJson),
  ])) as [D1Result<BridgeRow>, D1Result<OverlapRow>]

  const basisByOccupation = new Map<string, Set<string>>()
  for (const row of direct.results) {
    if (!specificBridgeCodes.has(row.onet)) continue
    const set = basisByOccupation.get(row.code) ?? new Set<string>()
    set.add(row.onet)
    basisByOccupation.set(row.code, set)
  }
  const inheritedCodes = [...candidates.keys()].filter(
    (code) => !basisByOccupation.has(code),
  )
  if (inheritedCodes.length > 0) {
    const sibling = await env.DB.prepare(
      `SELECT m1.occupation_code AS code, om.onet_code AS onet
       FROM occupation_anzsco_map m1
       JOIN occupation_anzsco_map m2
         ON m2.anzsco_code = m1.anzsco_code AND m2.is_primary = 1
       JOIN occupation_onet_map om ON om.occupation_code = m2.occupation_code
       WHERE m1.is_primary = 1
         AND m1.occupation_code IN (SELECT value FROM json_each(?))`,
    )
      .bind(JSON.stringify(inheritedCodes))
      .all<{ code: string; onet: string }>()
    for (const row of sibling.results) {
      if (!specificBridgeCodes.has(row.onet)) continue
      const set = basisByOccupation.get(row.code) ?? new Set<string>()
      set.add(row.onet)
      basisByOccupation.set(row.code, set)
    }
  }

  function fieldAffinity(occupationCode: string): number | null {
    if (feeder.size === 0) return null
    const basis = basisByOccupation.get(occupationCode)
    if (!basis || basis.size === 0) return null
    let shared = 0
    for (const onet of feeder) {
      if (basis.has(onet)) shared += 1
    }
    if (shared === 0) return 0
    return Math.min(1, 0.3 + (0.7 * shared) / basis.size)
  }

  // Reuse the overlap read for every explanation.
  const overlaps = new Map<string, { name: string; contribution: number }[]>()
  for (const row of overlapResult.results) {
    const list = overlaps.get(row.code) ?? []
    list.push({ name: row.name, contribution: row.contribution })
    overlaps.set(row.code, list)
  }

  const userNormValue = userNorm || 1
  const suggestions: Suggestion[] = []

  for (const candidate of candidates.values()) {
    const skillFactor = (candidate.skillMatch || 0) / userNormValue
    // Award-level fit alone gave every degree holder a flat score, so it is
    // multiplied by field affinity when the profile carries a degree whose
    // pathway we can trace; unrelated fields then score honestly lower.
    const levelMatch = educationFactor(
      profile.educationLevel,
      candidate.skillLevel,
    )
    const affinity = fieldAffinity(candidate.code)
    const educationMatch =
      affinity === null ? levelMatch : levelMatch * affinity

    const score =
      100 *
      (WEIGHTS.skill * skillFactor +
        WEIGHTS.growth * candidate.growthPercentile +
        WEIGHTS.education * educationMatch)

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

    suggestions.push({
      code: candidate.code,
      title: candidate.title,
      matchScore: Math.max(0, Math.min(99, Math.round(score))),
      reasons,
      change5yPercent: candidate.change5yPercent,
      medianWeeklyEarnings: candidate.medianWeeklyEarnings,
      factors: {
        skill: Math.round(WEIGHTS.skill * skillFactor * 100),
        growth: Math.round(WEIGHTS.growth * candidate.growthPercentile * 100),
        education: Math.round(WEIGHTS.education * educationMatch * 100),
      },
    })
  }

  suggestions.sort(
    (left, right) =>
      right.matchScore - left.matchScore ||
      left.title.localeCompare(right.title),
  )

  return Response.json({
    suggestions: suggestions.slice(0, 9),
    modelledOccupations: candidates.size,
  })
}
