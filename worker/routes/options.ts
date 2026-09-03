import { simplifyEducationLevel } from '../lib/education'
import { findStudySkillNames } from '../lib/studySkills'

// Every autocomplete menu uses the same small response shape.
type CatalogueOption = {
  code: string
  label: string
  description: string
  kind: 'education' | 'occupation' | 'skill' | 'tool'
}

type StudyOption = {
  degreeCode: string | null
  majorCode: string | null
  label: string
  description: string
  educationLevel: string | null
  kind: 'course' | 'major'
}

type StudyRow = Omit<StudyOption, 'educationLevel'> & {
  educationLevel: string | null
  matchRank: number
}

type RecommendationRow = CatalogueOption & {
  score: number
  relevance: number
  educationMatch: number
  targetRoleMatch: number
}

type StudyTitleRow = {
  title: string
}

export type SkillRecommendation = CatalogueOption & {
  score: number
  reason: 'education' | 'target role' | 'education and target role'
}

// Escape the three characters that have a special meaning in a LIKE pattern.
function likeValue(value: string): string {
  return value.replace(/[~%_]/g, (character) => `~${character}`)
}

// Keep catalogue searches short and useful while the user is typing.
async function searchEducation(
  env: Env,
  query: string,
): Promise<CatalogueOption[]> {
  const term = likeValue(query)
  const showOther = query.toLowerCase().includes('other') ? 1 : 0
  const result = await env.DB.prepare(
    `SELECT ep.code, ep.title AS label,
            CASE
              WHEN ep.title LIKE '%, General' COLLATE NOCASE
                THEN 'General field - ' || ep.source
              WHEN ep.title LIKE '%, Other' COLLATE NOCASE
                THEN 'Programs not listed separately - ' || ep.source
              ELSE ep.source
            END AS description,
            'education' AS kind
     FROM education_program ep
     WHERE ep.title LIKE ? ESCAPE '~' COLLATE NOCASE
       AND (
         ? = 1
         OR ep.title NOT LIKE '%, Other' COLLATE NOCASE
         OR NOT EXISTS (
           SELECT 1
           FROM education_program general_option
           WHERE general_option.title =
             SUBSTR(ep.title, 1, LENGTH(ep.title) - 7) || ', General'
             COLLATE NOCASE
         )
       )
     ORDER BY CASE
                WHEN ep.title = ? COLLATE NOCASE THEN 0
                WHEN ep.title LIKE ? ESCAPE '~' COLLATE NOCASE THEN 1
                ELSE 2
              END,
              CASE
                WHEN ep.title LIKE '%, General' COLLATE NOCASE THEN 0
                WHEN ep.title LIKE '%, Other' COLLATE NOCASE THEN 2
                ELSE 1
              END,
              LENGTH(ep.title), ep.title
     LIMIT 8`,
  )
    .bind(`%${term}%`, showOther, query, `${term}%`)
    .all<CatalogueOption>()

  return result.results
}

// One search covers both named CRICOS courses and Australian fields of study.
async function searchStudies(env: Env, query: string): Promise<StudyOption[]> {
  const term = likeValue(query)
  const contains = `%${term}%`
  const prefix = `${term}%`
  const result = await env.DB.prepare(
    `WITH matches AS (
       SELECT d.code AS degreeCode, NULL AS majorCode,
              d.title AS label,
              d.education_level || ' - CRICOS course - ' ||
                d.provider_count ||
                CASE d.provider_count WHEN 1 THEN ' provider' ELSE ' providers' END
                AS description,
              d.education_level AS educationLevel,
              'course' AS kind,
              CASE
                WHEN d.title = ? COLLATE NOCASE THEN 0
                WHEN d.title LIKE ? ESCAPE '~' COLLATE NOCASE THEN 1
                ELSE 2
              END AS matchRank
       FROM degree_option d
       WHERE d.title LIKE ? ESCAPE '~' COLLATE NOCASE

       UNION ALL

       SELECT NULL AS degreeCode, m.code AS majorCode,
              m.title AS label,
              'ASCED field - ' || m.narrow_field_name || ' - ' ||
                m.broad_field_name AS description,
              NULL AS educationLevel,
              'major' AS kind,
              CASE
                WHEN m.title = ? COLLATE NOCASE THEN 0
                WHEN m.title LIKE ? ESCAPE '~' COLLATE NOCASE THEN 1
                WHEN m.narrow_field_name = ? COLLATE NOCASE THEN 2
                WHEN m.narrow_field_name LIKE ? ESCAPE '~' COLLATE NOCASE THEN 3
                ELSE 4
              END AS matchRank
       FROM major_option m
       WHERE m.title LIKE ? ESCAPE '~' COLLATE NOCASE
          OR m.narrow_field_name LIKE ? ESCAPE '~' COLLATE NOCASE
          OR m.broad_field_name LIKE ? ESCAPE '~' COLLATE NOCASE
     )
     SELECT degreeCode, majorCode, label, description,
            educationLevel, kind, MIN(matchRank) AS matchRank
     FROM matches
     GROUP BY degreeCode, majorCode, label, description, educationLevel, kind
     ORDER BY matchRank, CASE kind WHEN 'course' THEN 0 ELSE 1 END,
              LENGTH(label), label, COALESCE(degreeCode, majorCode)
     LIMIT 5`,
  )
    .bind(
      query,
      prefix,
      contains,
      query,
      prefix,
      query,
      prefix,
      contains,
      contains,
      contains,
    )
    .all<StudyRow>()

  return result.results.map((row) => ({
    degreeCode: row.degreeCode,
    majorCode: row.majorCode,
    label: row.label,
    description: row.description,
    educationLevel: row.educationLevel
      ? simplifyEducationLevel(row.educationLevel)
      : null,
    kind: row.kind,
  }))
}

// Search both principal OSCA titles and the alternative titles people use.
async function searchOccupations(
  env: Env,
  query: string,
): Promise<CatalogueOption[]> {
  const term = likeValue(query)
  const contains = `%${term}%`
  const prefix = `${term}%`
  const result = await env.DB.prepare(
    `WITH matches AS (
       SELECT o.code, o.title AS label, o.description,
              CASE
                WHEN o.title = ? COLLATE NOCASE THEN 0
                WHEN o.title LIKE ? ESCAPE '~' COLLATE NOCASE THEN 1
                ELSE 3
              END AS match_rank
       FROM occupation o
       WHERE o.title LIKE ? ESCAPE '~' COLLATE NOCASE

       UNION ALL

       SELECT o.code, o.title AS label, o.description,
              CASE
                WHEN a.alias = ? COLLATE NOCASE THEN 0
                WHEN a.alias LIKE ? ESCAPE '~' COLLATE NOCASE THEN 2
                ELSE 4
              END AS match_rank
       FROM occupation_alias a
       JOIN occupation o ON o.code = a.occupation_code
       WHERE a.alias LIKE ? ESCAPE '~' COLLATE NOCASE
     )
     SELECT code, label, SUBSTR(description, 1, 180) AS description,
            'occupation' AS kind
     FROM matches
     GROUP BY code, label, description
     ORDER BY MIN(match_rank), LENGTH(label), label
     LIMIT 8`,
  )
    .bind(query, prefix, contains, query, prefix, contains)
    .all<CatalogueOption>()

  return result.results
}

// Skill aliases let a search for a long O*NET name still find its short label.
async function searchSkills(
  env: Env,
  query: string,
): Promise<CatalogueOption[]> {
  const term = likeValue(query)
  const contains = `%${term}%`
  const prefix = `${term}%`
  const result = await env.DB.prepare(
    `WITH matches AS (
       SELECT s.code, s.name AS label, s.description, s.kind,
              CASE
                WHEN s.name = ? COLLATE NOCASE THEN 0
                WHEN s.name LIKE ? ESCAPE '~' COLLATE NOCASE THEN 1
                ELSE 3
              END AS match_rank
       FROM skill s
       WHERE s.name LIKE ? ESCAPE '~' COLLATE NOCASE

       UNION ALL

       SELECT s.code, s.name AS label, s.description, s.kind,
              CASE
                WHEN a.alias = ? COLLATE NOCASE THEN 0
                WHEN a.alias LIKE ? ESCAPE '~' COLLATE NOCASE THEN 2
                ELSE 4
              END AS match_rank
       FROM skill_alias a
       JOIN skill s ON s.code = a.skill_code
       WHERE a.alias LIKE ? ESCAPE '~' COLLATE NOCASE
     )
     SELECT code, label, description, kind
     FROM matches
     GROUP BY code, label, description, kind
     ORDER BY MIN(match_rank), LENGTH(label), label
     LIMIT 8`,
  )
    .bind(query, prefix, contains, query, prefix, contains)
    .all<CatalogueOption>()

  return result.results
}

// Related O*NET occupations turn a legacy study code or target role into suggestions.
async function recommendFromOccupations(
  env: Env,
  educationCode: string,
  targetRoleCode: string,
): Promise<SkillRecommendation[]> {
  if (!educationCode && !targetRoleCode) return []

  const result = await env.DB.prepare(
    `WITH raw_selected AS (
       SELECT onet_code, 1 AS education_match, 0 AS target_role_match
       FROM education_onet_map
       WHERE education_code = ?

       UNION ALL

       SELECT onet_code, 0 AS education_match, 1 AS target_role_match
       FROM occupation_onet_map
       WHERE occupation_code = ?
     ),
     selected AS (
       SELECT onet_code,
              MAX(education_match) AS education_match,
              MAX(target_role_match) AS target_role_match
       FROM raw_selected
       GROUP BY onet_code
     ),
     scored AS (
       SELECT s.code, s.name AS label, s.description, s.kind,
              ROUND(AVG(os.score), 1) AS score,
              COUNT(DISTINCT os.onet_code) AS occupation_count,
              (SELECT COUNT(*) FROM selected) AS selected_count,
              MAX(os.hot_technology) AS hot,
              MAX(os.in_demand) AS in_demand,
              MAX(selected.education_match) AS educationMatch,
              MAX(selected.target_role_match) AS targetRoleMatch
       FROM selected
       JOIN onet_occupation_skill os ON os.onet_code = selected.onet_code
       JOIN skill s ON s.code = os.skill_code
       GROUP BY s.code, s.name, s.description, s.kind
     )
     SELECT code, label, description, kind, score,
            educationMatch, targetRoleMatch,
            ROUND(
              score * 0.4 +
              (100.0 * occupation_count / selected_count) * 0.4 +
              hot * 5 + in_demand * 15,
              1
            ) AS relevance
     FROM scored
     ORDER BY relevance DESC, label
     LIMIT 120`,
  )
    .bind(educationCode, targetRoleCode)
    .all<RecommendationRow>()

  // Familiar starting tools win close ties without overriding the source data.
  const starterTools = [
    'Python',
    'SQL',
    'Microsoft Excel',
    'R',
    'Power BI',
    'Tableau',
    'Git',
    'JavaScript',
  ]
  const toolBonus = new Map(
    starterTools.map((name, index) => [name, 8 - index * 0.6]),
  )
  const sortRecommendations = (
    left: RecommendationRow,
    right: RecommendationRow,
  ) =>
    right.relevance +
      (toolBonus.get(right.label) ?? 0) -
      (left.relevance + (toolBonus.get(left.label) ?? 0)) ||
    left.label.localeCompare(right.label)

  const skills = result.results
    .filter((item) => item.kind === 'skill')
    .sort(sortRecommendations)
    .slice(0, 6)
  const tools = result.results
    .filter((item) => item.kind === 'tool')
    .sort(sortRecommendations)
    .slice(0, 10)

  return [...skills, ...tools].map((item) => ({
    code: item.code,
    label: item.label,
    description: item.description,
    kind: item.kind,
    score: item.score,
    reason:
      item.educationMatch && item.targetRoleMatch
        ? 'education and target role'
        : item.targetRoleMatch
          ? 'target role'
          : 'education',
  }))
}

// A selected CRICOS course or ASCED field chooses a short O*NET starter set.
async function recommendFromStudy(
  env: Env,
  degreeCode: string,
  majorCode: string,
): Promise<SkillRecommendation[]> {
  if (!degreeCode && !majorCode) return []

  const study = await env.DB.prepare(
    `SELECT title FROM degree_option WHERE code = ?
     UNION ALL
     SELECT title FROM major_option WHERE code = ?
     LIMIT 1`,
  )
    .bind(degreeCode, majorCode)
    .first<StudyTitleRow>()

  if (!study) return []
  const names = findStudySkillNames(study.title)
  if (names.length === 0) return []

  const placeholders = names.map(() => '?').join(', ')
  const result = await env.DB.prepare(
    `SELECT code, name AS label, description, kind
     FROM skill WHERE name IN (${placeholders})`,
  )
    .bind(...names)
    .all<CatalogueOption>()
  const order = new Map(names.map((name, index) => [name, index]))

  return result.results
    .sort(
      (left, right) =>
        (order.get(left.label) ?? names.length) -
        (order.get(right.label) ?? names.length),
    )
    .map((item, index) => ({
      ...item,
      score: 100 - index,
      reason: 'education',
    }))
}

// Study starters stay visible while matching role data adds a few extra choices.
async function recommendSkills(
  env: Env,
  educationCode: string,
  degreeCode: string,
  majorCode: string,
  targetRoleCode: string,
): Promise<SkillRecommendation[]> {
  const [studyRecommendations, roleRecommendations] = await Promise.all([
    recommendFromStudy(env, degreeCode, majorCode),
    recommendFromOccupations(env, educationCode, targetRoleCode),
  ])
  const roleCodes = new Set(roleRecommendations.map((item) => item.code))
  const combined = studyRecommendations.map((item) => ({
    ...item,
    reason: roleCodes.has(item.code)
      ? ('education and target role' as const)
      : item.reason,
  }))
  const studyCodes = new Set(studyRecommendations.map((item) => item.code))

  for (const item of roleRecommendations) {
    if (!studyCodes.has(item.code)) combined.push(item)
  }

  return combined.slice(0, 10)
}

// Route the public catalogue endpoints through one small handler.
export async function handleOptions(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json(
      { error: 'Method not allowed.' },
      { status: 405, headers: { Allow: 'GET' } },
    )
  }

  const url = new URL(request.url)
  if (url.pathname === '/api/recommendations/skills') {
    const recommendations = await recommendSkills(
      env,
      (url.searchParams.get('educationCode') ?? '').trim(),
      (url.searchParams.get('degreeCode') ?? '').trim(),
      (url.searchParams.get('majorCode') ?? '').trim(),
      (url.searchParams.get('targetRoleCode') ?? '').trim(),
    )
    return Response.json({ recommendations })
  }

  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 80)
  if (query.length < 2) return Response.json({ options: [] })

  if (url.pathname === '/api/options/studies') {
    return Response.json({ options: await searchStudies(env, query) })
  }

  let options: CatalogueOption[]
  if (url.pathname === '/api/options/education') {
    options = await searchEducation(env, query)
  } else if (url.pathname === '/api/options/occupations') {
    options = await searchOccupations(env, query)
  } else if (url.pathname === '/api/options/skills') {
    options = await searchSkills(env, query)
  } else {
    return Response.json({ error: 'Not found.' }, { status: 404 })
  }

  return Response.json({ options })
}
