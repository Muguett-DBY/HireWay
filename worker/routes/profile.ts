// Use the same field names in API requests and responses.
type Profile = {
  code: string
  qualification: string
  educationLevel: string
  currentRole: string
}

// JSON input still needs checking even when we use TypeScript.
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Create a profile, read it back, or update its background details.
export async function handleProfile(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!['GET', 'POST', 'PUT'].includes(request.method)) {
    return Response.json(
      { error: 'Method not allowed.' },
      { status: 405, headers: { Allow: 'GET, POST, PUT' } },
    )
  }

  // The recovery code acts as the key to an existing profile.
  const authorization = request.headers.get('Authorization') ?? ''
  const code =
    request.method === 'POST'
      ? crypto.randomUUID()
      : authorization.startsWith('Bearer ')
        ? authorization.slice(7).trim()
        : ''

  if (!code) {
    return Response.json(
      { error: 'Enter your recovery code.' },
      { status: 401 },
    )
  }

  // SQL aliases keep database names out of the frontend.
  if (request.method === 'GET') {
    const profile = await env.DB.prepare(
      `SELECT code, qualification,
              education_level AS educationLevel,
              current_role AS currentRole
       FROM profile WHERE code = ?`,
    )
      .bind(code)
      .first<Profile>()

    return profile
      ? Response.json(profile)
      : Response.json({ error: 'Profile not found.' }, { status: 404 })
  }

  // Reject broken JSON and values that are not a form object.
  const input = await request.json<unknown>().catch(() => null)
  if (!isObject(input)) {
    return Response.json({ error: 'Send a JSON object.' }, { status: 400 })
  }

  // Spaces alone do not count as a qualification or education level.
  const qualification =
    typeof input.qualification === 'string' ? input.qualification.trim() : ''
  const educationLevel =
    typeof input.educationLevel === 'string' ? input.educationLevel.trim() : ''
  const currentRole =
    typeof input.currentRole === 'string' ? input.currentRole.trim() : ''
  const errors: Record<string, string> = {}

  if (!qualification) errors.qualification = 'Enter your qualification.'
  if (!educationLevel) errors.educationLevel = 'Select your education level.'

  // Keep saved text within the form's limits.
  if (qualification.length > 200) {
    errors.qualification = 'Use 200 characters or fewer.'
  }
  if (educationLevel.length > 80) {
    errors.educationLevel = 'Use 80 characters or fewer.'
  }
  if (currentRole.length > 120) {
    errors.currentRole = 'Use 120 characters or fewer.'
  }
  if (
    input.currentRole !== undefined &&
    typeof input.currentRole !== 'string'
  ) {
    errors.currentRole = 'Enter your current role as text.'
  }

  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 })
  }

  // A new profile gets one random recovery code.
  if (request.method === 'POST') {
    await env.DB.prepare(
      `INSERT INTO profile (code, qualification, education_level, current_role)
       VALUES (?, ?, ?, ?)`,
    )
      .bind(code, qualification, educationLevel, currentRole)
      .run()

    return Response.json(
      { code, qualification, educationLevel, currentRole },
      { status: 201 },
    )
  }

  // Editing keeps the same code and updates the existing row.
  const result = await env.DB.prepare(
    `UPDATE profile
     SET qualification = ?, education_level = ?, current_role = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE code = ?`,
  )
    .bind(qualification, educationLevel, currentRole, code)
    .run()

  if (result.meta.changes === 0) {
    return Response.json({ error: 'Profile not found.' }, { status: 404 })
  }

  return Response.json({ code, qualification, educationLevel, currentRole })
}
