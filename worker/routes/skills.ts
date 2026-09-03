// Send the row ID and display name back to the page.
type Skill = {
  id: number
  name: string
  skillCode: string | null
}

// Check the JSON shape before reading its fields.
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Read, add, or remove skills for one saved profile.
export async function handleSkills(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!['GET', 'POST', 'DELETE'].includes(request.method)) {
    return Response.json(
      { error: 'Method not allowed.' },
      { status: 405, headers: { Allow: 'GET, POST, DELETE' } },
    )
  }

  // Use the same recovery code as the education profile.
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

  // Skills must belong to a profile that already exists.
  const profile = await env.DB.prepare(
    'SELECT code FROM profile WHERE code = ?',
  )
    .bind(code)
    .first()

  if (!profile) {
    return Response.json({ error: 'Profile not found.' }, { status: 404 })
  }

  // Return this profile's skills in the order they were added.
  if (request.method === 'GET') {
    const result = await env.DB.prepare(
      `SELECT id, name, skill_code AS skillCode
       FROM profile_skill WHERE profile_code = ? ORDER BY id`,
    )
      .bind(code)
      .all<Skill>()

    return Response.json({ skills: result.results })
  }

  // Both the skill ID and profile code must match before deleting a row.
  if (request.method === 'DELETE') {
    const id = Number(new URL(request.url).searchParams.get('id'))

    if (!Number.isSafeInteger(id) || id <= 0) {
      return Response.json(
        { error: 'Enter a valid skill ID.' },
        { status: 400 },
      )
    }

    const result = await env.DB.prepare(
      'DELETE FROM profile_skill WHERE id = ? AND profile_code = ?',
    )
      .bind(id, code)
      .run()

    if (result.meta.changes === 0) {
      return Response.json({ error: 'Skill not found.' }, { status: 404 })
    }

    return Response.json({ message: 'Skill removed.' })
  }

  // Only POST reaches this point, so read the new skill name.
  const input = await request.json<unknown>().catch(() => null)
  if (!isObject(input)) {
    return Response.json({ error: 'Send a JSON object.' }, { status: 400 })
  }

  // Free text is gone: every saved skill must come from the catalogue search.
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const skillCode =
    typeof input.skillCode === 'string' ? input.skillCode.trim() : ''

  if (!skillCode || !name) {
    return Response.json(
      { error: 'Choose a skill or tool from the suggestions.' },
      { status: 400 },
    )
  }

  // The catalogue name replaces the typed text so records stay consistent.
  const option = await env.DB.prepare('SELECT name FROM skill WHERE code = ?')
    .bind(skillCode)
    .first<{ name: string }>()

  if (!option || option.name.toLowerCase() !== name.toLowerCase()) {
    return Response.json(
      { error: 'Choose a skill or tool from the suggestions.' },
      { status: 400 },
    )
  }

  if (name.length > 80) {
    return Response.json(
      { error: 'Use 80 characters or fewer.' },
      { status: 400 },
    )
  }

  // Let the database reject duplicates, even if two requests arrive together.
  const result = await env.DB.prepare(
    `INSERT INTO profile_skill (profile_code, name, skill_code)
     VALUES (?, ?, ?)
     ON CONFLICT (profile_code, name) DO NOTHING`,
  )
    .bind(code, name, skillCode)
    .run()

  if (result.meta.changes === 0) {
    return Response.json(
      { error: 'This skill is already in your list.' },
      { status: 409 },
    )
  }

  return Response.json(
    { id: result.meta.last_row_id, name, skillCode },
    { status: 201 },
  )
}
