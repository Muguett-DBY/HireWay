type RoleRow = {
  code: string | null
  title: string | null
}

type RoleSkill = {
  code: string
  name: string
  description: string
  score: number
  priority: 'essential' | 'recommended' | 'bonus'
}

type RoleQualification = {
  code: string
  title: string
  qualificationLevel: string
  relationship: string
  specialConditions: string
  specialConditionsDescription: string
}

type RoleSource = {
  name: string
  publisher: string
  url: string
  licence: string
}

type MarketRow = {
  releaseId: number
  employedMay2025: number | null
  employedMay2030: number | null
  employedMay2035: number | null
  change5yPercent: number | null
  change10yPercent: number | null
  medianWeeklyEarnings: number | null
  vacanciesTotal: number | null
}

type StateVacancyRow = {
  state: string
  vacancies: number
}

type TaskRow = {
  task: string
}

// Outlook labels keep five-year movements readable without hiding the number.
function outlookLabel(change5yPercent: number | null): string {
  if (change5yPercent === null) return 'Outlook unknown'
  if (change5yPercent >= 10) return 'Growing strongly'
  if (change5yPercent >= 2) return 'Growing'
  if (change5yPercent >= 0) return 'Stable'
  return 'Declining'
}

// Load the common skills and training pathways for one saved target role.
export async function handleRoleRequirements(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json(
      { error: 'Method not allowed.' },
      { status: 405, headers: { Allow: 'GET' } },
    )
  }

  // The recovery code keeps this request tied to the user's saved choice.
  const authorization = request.headers.get('Authorization') ?? ''
  const profileCode = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : ''

  if (!profileCode) {
    return Response.json(
      { error: 'Enter your recovery code.' },
      { status: 401 },
    )
  }

  const role = await env.DB.prepare(
    `SELECT o.code, o.title
     FROM profile p
     LEFT JOIN occupation o ON o.code = p.target_role_code
     WHERE p.code = ?`,
  )
    .bind(profileCode)
    .first<RoleRow>()

  if (!role) {
    return Response.json({ error: 'Profile not found.' }, { status: 404 })
  }

  if (!role.code || !role.title) {
    return Response.json(
      { error: 'Choose a target role first.' },
      { status: 400 },
    )
  }

  // Independent lookups can run together once the target role is known.
  const [skillResult, qualificationResult, sourceResult, marketResult] =
    await Promise.all([
      env.DB.prepare(
        `WITH grouped_requirements AS (
         SELECT s.code, s.name, s.description,
                ROUND(v.score, 1) AS score,
                MIN(
                  CASE v.requirement_type
                    WHEN 'essential_skill' THEN 0
                    WHEN 'transferable_skill' THEN 1
                    WHEN 'tool' THEN 2
                    ELSE 1
                  END
                ) AS priority_rank
         FROM occupation_skill_vector v
         JOIN skill s ON s.code = v.skill_code
         WHERE v.occupation_code = ?
         GROUP BY s.code, s.name, s.description
       ),
       ranked_requirements AS (
         SELECT code, name, description, score, priority_rank,
                ROW_NUMBER() OVER (
                  PARTITION BY priority_rank
                  ORDER BY score DESC,
                    CASE WHEN priority_rank = 2 THEN
                      CASE name
                        WHEN 'Python' THEN 0
                        WHEN 'SQL' THEN 1
                        WHEN 'Microsoft Excel' THEN 2
                        WHEN 'R' THEN 3
                        WHEN 'Power BI' THEN 4
                        WHEN 'Tableau' THEN 5
                        WHEN 'Git' THEN 6
                        WHEN 'JavaScript' THEN 7
                        ELSE 20
                      END
                    ELSE 0 END,
                    name
                ) AS category_rank
         FROM grouped_requirements
       )
       SELECT code, name, description, score,
              CASE priority_rank
                WHEN 0 THEN 'essential'
                WHEN 1 THEN 'recommended'
                ELSE 'bonus'
              END AS priority
       FROM ranked_requirements
       WHERE (priority_rank IN (0, 1) AND category_rank <= 4)
          OR (priority_rank = 2 AND category_rank <= 5)
       ORDER BY priority_rank, category_rank`,
      )
        .bind(role.code)
        .all<RoleSkill>(),
      env.DB.prepare(
        `SELECT q.code, q.title,
              q.qualification_level AS qualificationLevel,
              oq.relationship,
              oq.special_conditions AS specialConditions,
              oq.special_conditions_description AS specialConditionsDescription
       FROM occupation_qualification oq
       JOIN qualification q ON q.code = oq.qualification_code
       WHERE oq.occupation_code = ?
       ORDER BY CASE oq.relationship
                  WHEN 'Occupation ready' THEN 0
                  WHEN 'Specialised training' THEN 1
                  WHEN 'Progression pathway' THEN 2
                  WHEN 'Pre-vocational' THEN 3
                  ELSE 4
                END,
                q.title
       LIMIT 8`,
      )
        .bind(role.code)
        .all<RoleQualification>(),
      env.DB.prepare(
        `SELECT name, publisher, source_url AS url, licence
       FROM data_source
       WHERE name IN (
         'ABS OSCA 2024',
         'O*NET 31.0',
         'Australian training pathways',
         'Australian labour market outlook'
       )
       ORDER BY id`,
      ).all<RoleSource>(),
      // Projections live on the four-digit ANZSCO side of the bridge.
      env.DB.prepare(
        `SELECT m.dataset_release_id AS releaseId,
              m.employed_may_2025 AS employedMay2025,
              m.employed_may_2030 AS employedMay2030,
              m.employed_may_2035 AS employedMay2035,
              m.change_5y_percent AS change5yPercent,
              m.change_10y_percent AS change10yPercent,
              m.median_weekly_earnings AS medianWeeklyEarnings,
              m.vacancies_total AS vacanciesTotal
       FROM occupation_anzsco_map map
       JOIN anzsco4_market m ON m.anzsco4_code = map.anzsco_code
       JOIN dataset_release release ON release.id = m.dataset_release_id
       JOIN data_source source ON source.id = release.data_source_id
       WHERE map.occupation_code = ?
         AND source.name = 'Australian labour market outlook'
       ORDER BY map.is_primary DESC, release.id DESC
       LIMIT 1`,
      )
        .bind(role.code)
        .first<MarketRow>(),
    ])

  // State vacancies follow the same release as the market row itself.
  const vacancies: StateVacancyRow[] = []
  if (marketResult) {
    const vacancyResult = await env.DB.prepare(
      `SELECT v.state_code AS state, v.vacancy_count AS vacancies
       FROM occupation_anzsco_map map
       JOIN anzsco4_state_vacancy v
         ON v.anzsco4_code = map.anzsco_code
        AND v.dataset_release_id = ?
       WHERE map.occupation_code = ?
       ORDER BY map.is_primary DESC, v.vacancy_count DESC`,
    )
      .bind(marketResult.releaseId, role.code)
      .all<StateVacancyRow>()

    // One occupation can bridge to two ANZSCO groups; keep the first state hit.
    const seenStates = new Set<string>()
    for (const row of vacancyResult.results) {
      if (!seenStates.has(row.state)) {
        seenStates.add(row.state)
        vacancies.push(row)
      }
    }
  }

  const market = marketResult
    ? {
        employedMay2025: marketResult.employedMay2025,
        employedMay2030: marketResult.employedMay2030,
        employedMay2035: marketResult.employedMay2035,
        change5yPercent: marketResult.change5yPercent,
        change10yPercent: marketResult.change10yPercent,
        medianWeeklyEarnings: marketResult.medianWeeklyEarnings,
        outlook: outlookLabel(marketResult.change5yPercent),
        vacancies,
      }
    : null

  // Only list a source when its data appears in this response.
  const visibleSources = sourceResult.results.filter(
    (source) =>
      source.name === 'ABS OSCA 2024' ||
      (source.name === 'O*NET 31.0' && skillResult.results.length > 0) ||
      (source.name === 'Australian training pathways' &&
        qualificationResult.results.length > 0) ||
      (source.name === 'Australian labour market outlook' && market !== null),
  )

  // The official OSCA task statements describe the day-to-day work.
  const taskResult = await env.DB.prepare(
    `SELECT task FROM occupation_task
     WHERE occupation_code = ?
     ORDER BY display_order, id
     LIMIT 5`,
  )
    .bind(role.code)
    .all<TaskRow>()

  return Response.json({
    targetRole: { code: role.code, title: role.title },
    skills: skillResult.results,
    qualifications: qualificationResult.results,
    tasks: taskResult.results.map((row) => row.task),
    sources: visibleSources,
    market,
  })
}
