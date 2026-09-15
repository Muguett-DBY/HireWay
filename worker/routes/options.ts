import { simplifyEducationLevel } from '../lib/education'

// Every autocomplete menu uses the same small response shape.
type CatalogueOption = {
  code: string
  label: string
  description: string
  kind: 'education' | 'occupation' | 'skill' | 'tool' | 'knowledge'
  // Only occupation results carry the five-year projection figure.
  growth5yPercent?: number | null
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

// Growth figures arrive separately so the search query stays simple.
async function attachGrowth(
  env: Env,
  options: CatalogueOption[],
): Promise<CatalogueOption[]> {
  const codes = options.map((option) => option.code)
  if (codes.length === 0) return options

  const placeholders = codes.map(() => '?').join(', ')
  const result = await env.DB.prepare(
    `SELECT map.occupation_code AS code, market.change_5y_percent AS growth
     FROM occupation_anzsco_map map
     JOIN anzsco4_market market ON market.anzsco4_code = map.anzsco_code
     JOIN dataset_release release ON release.id = market.dataset_release_id
     JOIN data_source source ON source.id = release.data_source_id
     WHERE map.occupation_code IN (${placeholders})
       AND source.name = 'Australian labour market outlook'
     ORDER BY map.is_primary DESC, release.id DESC`,
  )
    .bind(...codes)
    .all<{ code: string; growth: number | null }>()

  // Keep the first (preferred) mapping per occupation.
  const growthByCode = new Map<string, number | null>()
  for (const row of result.results) {
    if (!growthByCode.has(row.code)) growthByCode.set(row.code, row.growth)
  }

  return options.map((option) => ({
    ...option,
    growth5yPercent: growthByCode.get(option.code) ?? null,
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

  return attachGrowth(env, result.results)
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

// Study-only recommendations. No target-role or keyword fallback.
async function recommendSkills(
  env: Env,
  degreeCode: string,
  majorCode: string,
): Promise<SkillRecommendation[]> {
  if (!degreeCode && !majorCode) return []
  const result = await env.DB.prepare(
    `WITH selected_fields AS (
       SELECT major_code FROM degree_major_map WHERE degree_code = ?
       UNION SELECT code FROM major_option WHERE code = ? AND ? = ''
     ), candidates AS (
       SELECT s.code, s.name AS label, s.description, s.kind,
              MAX(m.relevance) AS score
       FROM selected_fields f
       JOIN study_skill_map m ON m.major_code = f.major_code
       JOIN skill s ON s.code = m.skill_code
       GROUP BY s.code
     ), ranked AS (
       SELECT *, ROW_NUMBER() OVER (
         PARTITION BY kind ORDER BY score DESC, label
       ) AS category_rank FROM candidates
     )
     SELECT code,label,description,kind,score FROM ranked
     WHERE (kind = 'knowledge' AND category_rank <= 4)
        OR (kind = 'tool' AND category_rank <= 4)
        OR (kind = 'skill' AND category_rank <= 2)
     ORDER BY CASE kind WHEN 'knowledge' THEN 0 WHEN 'tool' THEN 1 ELSE 2 END,
              score DESC,label`,
  )
    .bind(degreeCode, majorCode, degreeCode)
    .all<CatalogueOption & { score: number }>()
  return result.results.map((item) => ({ ...item, reason: 'education' }))
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
      (url.searchParams.get('degreeCode') ?? '').trim(),
      (url.searchParams.get('majorCode') ?? '').trim(),
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
