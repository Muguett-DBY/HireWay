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
  const [skillResult, qualificationResult, sourceResult] = await Promise.all([
    env.DB.prepare(
      `WITH grouped_requirements AS (
         SELECT s.code, s.name, s.description,
                ROUND(AVG(os.score), 1) AS score,
                MIN(
                  CASE os.requirement_type
                    WHEN 'essential_skill' THEN 0
                    WHEN 'transferable_skill' THEN 1
                    WHEN 'tool' THEN 2
                    ELSE 1
                  END
                ) AS priority_rank
         FROM occupation_onet_map map
         JOIN onet_occupation_skill os ON os.onet_code = map.onet_code
         JOIN skill s ON s.code = os.skill_code
         WHERE map.occupation_code = ?
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
         'Australian training pathways'
       )
       ORDER BY id`,
    ).all<RoleSource>(),
  ])

  // Only list a source when its data appears in this response.
  const visibleSources = sourceResult.results.filter(
    (source) =>
      source.name === 'ABS OSCA 2024' ||
      (source.name === 'O*NET 31.0' && skillResult.results.length > 0) ||
      (source.name === 'Australian training pathways' &&
        qualificationResult.results.length > 0),
  )

  return Response.json({
    targetRole: { code: role.code, title: role.title },
    skills: skillResult.results,
    qualifications: qualificationResult.results,
    sources: visibleSources,
  })
}
