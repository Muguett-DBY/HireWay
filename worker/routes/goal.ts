// Use camelCase in the JSON sent to the page.
type CareerGoal = {
  careerGoal: string
  careerGoalCode: string | null
}

// Check the JSON shape before reading its fields.
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Read or replace the current goal for a saved profile.
export async function handleGoal(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!['GET', 'PUT'].includes(request.method)) {
    return Response.json(
      { error: 'Method not allowed.' },
      { status: 405, headers: { Allow: 'GET, PUT' } },
    )
  }

  // Use the same recovery code as the education and skills sections.
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

  // An empty goal means this profile has not chosen one yet.
  if (request.method === 'GET') {
    const goal = await env.DB.prepare(
      `SELECT career_goal AS careerGoal,
              career_goal_code AS careerGoalCode
       FROM profile WHERE code = ?`,
    )
      .bind(code)
      .first<CareerGoal>()

    return goal
      ? Response.json(goal)
      : Response.json({ error: 'Profile not found.' }, { status: 404 })
  }

  // Only PUT reaches this point, so read the new goal.
  const input = await request.json<unknown>().catch(() => null)
  if (!isObject(input)) {
    return Response.json({ error: 'Send a JSON object.' }, { status: 400 })
  }

  // Ignore outer spaces and reject a blank goal.
  let careerGoal =
    typeof input.careerGoal === 'string' ? input.careerGoal.trim() : ''
  const careerGoalCode =
    input.careerGoalCode === undefined || input.careerGoalCode === null
      ? null
      : typeof input.careerGoalCode === 'string'
        ? input.careerGoalCode.trim() || null
        : undefined

  if (careerGoalCode === undefined) {
    return Response.json(
      { error: 'Choose a valid career goal.' },
      { status: 400 },
    )
  }

  // A selected OSCA goal keeps its official title in the profile.
  if (careerGoalCode) {
    const option = await env.DB.prepare(
      'SELECT title FROM occupation WHERE code = ?',
    )
      .bind(careerGoalCode)
      .first<{ title: string }>()

    if (!option) {
      return Response.json(
        { error: 'Choose a valid career goal.' },
        { status: 400 },
      )
    }
    careerGoal = option.title
  }

  if (!careerGoal) {
    return Response.json({ error: 'Enter a career goal.' }, { status: 400 })
  }

  // Keep the goal short enough to display as a job title.
  if (careerGoal.length > 120) {
    return Response.json(
      { error: 'Use 120 characters or fewer.' },
      { status: 400 },
    )
  }

  // Update the same profile row without changing its education or skills.
  const result = await env.DB.prepare(
    `UPDATE profile
     SET career_goal = ?, career_goal_code = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE code = ?`,
  )
    .bind(careerGoal, careerGoalCode, code)
    .run()

  if (result.meta.changes === 0) {
    return Response.json({ error: 'Profile not found.' }, { status: 404 })
  }

  return Response.json({ careerGoal, careerGoalCode })
}
