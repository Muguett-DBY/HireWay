type TargetRoleRow = {
  code: string | null
  title: string | null
  description: string | null
}

// JSON still needs a quick shape check before its fields are used.
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Read or replace the occupation selected for one saved profile.
export async function handleTargetRole(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!['GET', 'PUT'].includes(request.method)) {
    return Response.json(
      { error: 'Method not allowed.' },
      { status: 405, headers: { Allow: 'GET, PUT' } },
    )
  }

  // The recovery code identifies the profile without an account system.
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

  // A left join also finds profiles that have not selected a role yet.
  if (request.method === 'GET') {
    const row = await env.DB.prepare(
      `SELECT o.code, o.title, o.description
       FROM profile p
       LEFT JOIN occupation o ON o.code = p.target_role_code
       WHERE p.code = ?`,
    )
      .bind(profileCode)
      .first<TargetRoleRow>()

    if (!row) {
      return Response.json({ error: 'Profile not found.' }, { status: 404 })
    }

    return Response.json({
      targetRole: row.code
        ? {
            code: row.code,
            title: row.title ?? '',
            description: row.description ?? '',
          }
        : null,
    })
  }

  // Only a catalogue occupation can become the selected target role.
  const input = await request.json<unknown>().catch(() => null)
  const targetRoleCode =
    isObject(input) && typeof input.targetRoleCode === 'string'
      ? input.targetRoleCode.trim()
      : ''

  if (!targetRoleCode) {
    return Response.json(
      { error: 'Choose a target role from the suggestions.' },
      { status: 400 },
    )
  }

  const targetRole = await env.DB.prepare(
    `SELECT code, title, description
     FROM occupation
     WHERE code = ?`,
  )
    .bind(targetRoleCode)
    .first<{ code: string; title: string; description: string }>()

  if (!targetRole) {
    return Response.json(
      { error: 'Choose a valid target role.' },
      { status: 400 },
    )
  }

  // Replacing this one value keeps the rest of the profile unchanged.
  const result = await env.DB.prepare(
    `UPDATE profile
     SET target_role_code = ?, updated_at = CURRENT_TIMESTAMP
     WHERE code = ?`,
  )
    .bind(targetRole.code, profileCode)
    .run()

  if (result.meta.changes === 0) {
    return Response.json({ error: 'Profile not found.' }, { status: 404 })
  }

  return Response.json({ targetRole })
}
