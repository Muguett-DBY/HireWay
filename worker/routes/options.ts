// Every autocomplete menu uses the same small response shape.
type CatalogueOption = {
  code: string
  label: string
  description: string
  kind: 'education' | 'occupation' | 'skill' | 'tool'
}

type RecommendationRow = CatalogueOption & {
  score: number
  relevance: number
  educationMatch: number
  goalMatch: number
}

export type SkillRecommendation = CatalogueOption & {
  score: number
  reason: 'education' | 'goal' | 'education and goal'
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
  const result = await env.DB.prepare(
    `SELECT code, title AS label, source AS description,
            'education' AS kind
     FROM education_program
     WHERE title LIKE ? ESCAPE '~' COLLATE NOCASE
     ORDER BY CASE
                WHEN title = ? COLLATE NOCASE THEN 0
                WHEN title LIKE ? ESCAPE '~' COLLATE NOCASE THEN 1
                ELSE 2
              END,
              LENGTH(title), title
     LIMIT 8`,
  )
    .bind(`%${term}%`, query, `${term}%`)
    .all<CatalogueOption>()

  return result.results
}

// Search both principal OSCA titles and the alternative titles people use.
async function searchGoals(
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

// Related O*NET occupations turn a chosen major or goal into skill suggestions.
async function recommendSkills(
  env: Env,
  educationCode: string,
  goalCode: string,
): Promise<SkillRecommendation[]> {
  if (!educationCode && !goalCode) return []

  const result = await env.DB.prepare(
    `WITH raw_selected AS (
       SELECT onet_code, 1 AS education_match, 0 AS goal_match
       FROM education_onet_map
       WHERE education_code = ?

       UNION ALL

       SELECT onet_code, 0 AS education_match, 1 AS goal_match
       FROM occupation_onet_map
       WHERE occupation_code = ?
     ),
     selected AS (
       SELECT onet_code,
              MAX(education_match) AS education_match,
              MAX(goal_match) AS goal_match
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
              MAX(selected.goal_match) AS goalMatch
       FROM selected
       JOIN onet_occupation_skill os ON os.onet_code = selected.onet_code
       JOIN skill s ON s.code = os.skill_code
       GROUP BY s.code, s.name, s.description, s.kind
     )
     SELECT code, label, description, kind, score,
            educationMatch, goalMatch,
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
    .bind(educationCode, goalCode)
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
      item.educationMatch && item.goalMatch
        ? 'education and goal'
        : item.goalMatch
          ? 'goal'
          : 'education',
  }))
}

// Route the four public catalogue endpoints through one small handler.
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
      (url.searchParams.get('goalCode') ?? '').trim(),
    )
    return Response.json({ recommendations })
  }

  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 80)
  if (query.length < 2) return Response.json({ options: [] })

  let options: CatalogueOption[]
  if (url.pathname === '/api/options/education') {
    options = await searchEducation(env, query)
  } else if (url.pathname === '/api/options/goals') {
    options = await searchGoals(env, query)
  } else if (url.pathname === '/api/options/skills') {
    options = await searchSkills(env, query)
  } else {
    return Response.json({ error: 'Not found.' }, { status: 404 })
  }

  return Response.json({ options })
}
