import { simplifyEducationLevel } from '../lib/education'

// Use the same field names in API requests and responses.
type Profile = {
  code: string
  qualification: string
  qualificationCode: string | null
  degreeCode: string | null
  majorCode: string | null
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
              qualification_code AS qualificationCode,
              degree_code AS degreeCode,
              major_code AS majorCode,
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

  // The selected codes decide which official study title is saved.
  const degreeCode =
    input.degreeCode === null
      ? null
      : typeof input.degreeCode === 'string'
        ? input.degreeCode.trim() || null
        : undefined
  const majorCode =
    input.majorCode === null
      ? null
      : typeof input.majorCode === 'string'
        ? input.majorCode.trim() || null
        : undefined
  let qualification = ''
  let educationLevel =
    typeof input.educationLevel === 'string' ? input.educationLevel.trim() : ''
  const currentRole =
    typeof input.currentRole === 'string' ? input.currentRole.trim() : ''
  const errors: Record<string, string> = {}

  if (
    degreeCode === undefined ||
    majorCode === undefined ||
    (!degreeCode && !majorCode)
  ) {
    errors.qualification =
      'Choose a course or field of study from the suggestions.'
  }

  // A course and a field are separate catalogue choices in the same search box.
  if (degreeCode) {
    const option = await env.DB.prepare(
      `SELECT title, education_level AS educationLevel
       FROM degree_option WHERE code = ?`,
    )
      .bind(degreeCode)
      .first<{ title: string; educationLevel: string }>()

    if (option) {
      qualification = option.title
      educationLevel = simplifyEducationLevel(option.educationLevel)
    } else {
      errors.qualification =
        'Choose a course or field of study from the suggestions.'
    }
  } else if (majorCode) {
    const option = await env.DB.prepare(
      'SELECT title FROM major_option WHERE code = ?',
    )
      .bind(majorCode)
      .first<{ title: string }>()

    if (option) {
      qualification = option.title
    } else {
      errors.qualification =
        'Choose a course or field of study from the suggestions.'
    }
  }

  // A named course does not need one arbitrary ASCED field attached to it.
  const savedMajorCode = degreeCode ? null : majorCode

  const educationLevels = new Set([
    'High School',
    'Diploma / Certificate',
    'Bachelor',
    'Master',
    'Doctorate',
    'Other',
  ])
  if (!educationLevel) {
    errors.educationLevel = 'Select your education level.'
  } else if (!educationLevels.has(educationLevel)) {
    errors.educationLevel = 'Choose a valid education level.'
  }

  // Keep optional profile text within the form's limit.
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
      `INSERT INTO profile (
         code, qualification, qualification_code, degree_code, major_code,
         education_level, current_role
       ) VALUES (?, ?, NULL, ?, ?, ?, ?)`,
    )
      .bind(
        code,
        qualification,
        degreeCode,
        savedMajorCode,
        educationLevel,
        currentRole,
      )
      .run()

    return Response.json(
      {
        code,
        qualification,
        qualificationCode: null,
        degreeCode,
        majorCode: savedMajorCode,
        educationLevel,
        currentRole,
      },
      { status: 201 },
    )
  }

  // Editing keeps the same code and updates the existing row.
  const result = await env.DB.prepare(
    `UPDATE profile
     SET qualification = ?, qualification_code = NULL,
         degree_code = ?, major_code = ?, education_level = ?, current_role = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE code = ?`,
  )
    .bind(
      qualification,
      degreeCode,
      savedMajorCode,
      educationLevel,
      currentRole,
      code,
    )
    .run()

  if (result.meta.changes === 0) {
    return Response.json({ error: 'Profile not found.' }, { status: 404 })
  }

  return Response.json({
    code,
    qualification,
    qualificationCode: null,
    degreeCode,
    majorCode: savedMajorCode,
    educationLevel,
    currentRole,
  })
}
