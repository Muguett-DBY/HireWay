// Reactions mirror the discovery deck: dismiss, keep exploring, or commit.
const allowedReactions = new Set(['not_for_me', 'curious', 'interested'])

// Record how one profile reacted to one suggested occupation.
export async function handleRoleFeedback(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed.' },
      { status: 405, headers: { Allow: 'POST' } },
    )
  }

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

  const input = await request.json<unknown>().catch(() => null)
  const body = (input ?? {}) as Record<string, unknown>
  const occupationCode =
    typeof body.occupationCode === 'string' ? body.occupationCode.trim() : ''
  const reaction = typeof body.reaction === 'string' ? body.reaction : ''

  if (!occupationCode || !allowedReactions.has(reaction)) {
    return Response.json(
      { error: 'Send an occupation code and a valid reaction.' },
      { status: 400 },
    )
  }

  // Both the profile and the occupation must exist before storing feedback.
  const profile = await env.DB.prepare(
    'SELECT code FROM profile WHERE code = ?',
  )
    .bind(code)
    .first()
  const occupation = await env.DB.prepare(
    'SELECT code FROM occupation WHERE code = ?',
  )
    .bind(occupationCode)
    .first()

  if (!profile) {
    return Response.json({ error: 'Profile not found.' }, { status: 404 })
  }
  if (!occupation) {
    return Response.json(
      { error: 'Choose a valid occupation.' },
      { status: 400 },
    )
  }

  // One reaction per occupation; the latest choice wins.
  await env.DB.prepare(
    `INSERT INTO profile_role_feedback (profile_code, occupation_code, reaction)
     VALUES (?, ?, ?)
     ON CONFLICT (profile_code, occupation_code) DO UPDATE SET
       reaction = excluded.reaction,
       created_at = CURRENT_TIMESTAMP`,
  )
    .bind(code, occupationCode, reaction)
    .run()

  return Response.json({ occupationCode, reaction })
}
