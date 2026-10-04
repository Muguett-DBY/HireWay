// Learning progress: watching sessions advance a skill's completion.
type SkillWithProgress = {
  id: number
  name: string
  skillCode: string | null
  status: string
  learningMinutes: number
  progressPct: number
  secondsTotal: number
  sessions: number
  lastSessionAt: string | null
}

// Check the JSON shape before reading its fields.
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Read the Bearer recovery code shared by every profile-scoped route.
function readCode(request: Request): string {
  const authorization = request.headers.get('Authorization') ?? ''
  return authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : ''
}

// POST records watched seconds for one skill; GET returns the skill list
// with progress fields attached.
export async function handleProgress(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!['GET', 'POST'].includes(request.method)) {
    return Response.json(
      { error: 'Method not allowed.' },
      { status: 405, headers: { Allow: 'GET, POST' } },
    )
  }

  const code = readCode(request)
  if (!code) {
    return Response.json(
      { error: 'Enter your recovery code.' },
      { status: 401 },
    )
  }

  const profile = await env.DB.prepare(
    'SELECT code FROM profile WHERE code = ?',
  )
    .bind(code)
    .first()

  if (!profile) {
    return Response.json({ error: 'Profile not found.' }, { status: 404 })
  }

  if (request.method === 'GET') {
    const result = await env.DB.prepare(
      `SELECT ps.id, ps.name, ps.skill_code AS skillCode, ps.status,
              ps.learning_minutes AS learningMinutes,
              COALESCE(pr.progress_pct, 0) AS progressPct,
              COALESCE(pr.seconds_total, 0) AS secondsTotal,
              COALESCE(pr.sessions, 0) AS sessions,
              pr.last_session_at AS lastSessionAt
       FROM profile_skill ps
       LEFT JOIN profile_skill_progress pr
         ON pr.profile_code = ps.profile_code AND pr.skill_code = ps.skill_code
       WHERE ps.profile_code = ? ORDER BY ps.id`,
    )
      .bind(code)
      .all<SkillWithProgress>()

    return Response.json({ skills: result.results })
  }

  // POST: one finished watching session for one saved skill.
  const input = await request.json<unknown>().catch(() => null)
  if (!isObject(input)) {
    return Response.json({ error: 'Send a JSON object.' }, { status: 400 })
  }

  const skillCode =
    typeof input.skillCode === 'string' ? input.skillCode.trim() : ''
  const seconds = Number(input.seconds)
  const progressPct =
    input.progressPct === undefined ? 0 : Number(input.progressPct)

  if (!skillCode || skillCode.length > 40) {
    return Response.json({ error: 'Send a valid skill code.' }, { status: 400 })
  }

  if (
    !Number.isSafeInteger(seconds) ||
    seconds <= 0 ||
    seconds > 24 * 60 * 60
  ) {
    return Response.json(
      { error: 'Send the watched seconds as a positive integer.' },
      { status: 400 },
    )
  }

  if (
    !Number.isSafeInteger(progressPct) ||
    progressPct < 0 ||
    progressPct > 100
  ) {
    return Response.json(
      { error: 'Send progress as a percentage from 0 to 100.' },
      { status: 400 },
    )
  }

  // The profile must already track the skill; this also blocks progress
  // entries for codes the profile never saved.
  const minutes = Math.round(seconds / 60)
  const owned = await env.DB.prepare(
    `UPDATE profile_skill SET learning_minutes = learning_minutes + ?
     WHERE profile_code = ? AND skill_code = ?`,
  )
    .bind(minutes, code, skillCode)
    .run()

  if (owned.meta.changes === 0) {
    return Response.json({ error: 'Skill not found.' }, { status: 404 })
  }

  // Progress only ever moves forward: a lower percentage never overwrites
  // a higher one, and watch time and sessions keep adding up.
  const watchedAt = new Date().toISOString()
  const saved = await env.DB.prepare(
    `INSERT INTO profile_skill_progress
       (profile_code, skill_code, progress_pct, seconds_total, sessions, last_session_at)
     VALUES (?, ?, ?, ?, 1, ?)
     ON CONFLICT (profile_code, skill_code) DO UPDATE SET
       progress_pct = MAX(progress_pct, excluded.progress_pct),
       seconds_total = seconds_total + excluded.seconds_total,
       sessions = sessions + 1,
       last_session_at = excluded.last_session_at
     RETURNING progress_pct AS progressPct, seconds_total AS secondsTotal,
               sessions, last_session_at AS lastSessionAt`,
  )
    .bind(code, skillCode, progressPct, seconds, watchedAt)
    .first<{
      progressPct: number
      secondsTotal: number
      sessions: number
      lastSessionAt: string
    }>()

  return Response.json({ skillCode, learningMinutes: minutes, ...saved })
}
