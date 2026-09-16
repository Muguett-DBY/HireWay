// Keep one shape for every skill shown on the page.
export type Skill = {
  id: number
  name: string
  skillCode: string | null
  status: 'upcoming' | 'current' | 'completed'
}

export type SkillStatus = Skill['status']

export type SaveSkillResult = { ok: true } | { ok: false; error: string }

// API calls either return their expected data or one readable error.
type ApiResult<T> =
  { ok: true; data: T } | { ok: false; data: { error?: string } }

// Share the recovery-code header and response handling between skill actions.
async function requestSkillApi<T>(
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
  url: string,
  code: string,
  body?: Record<string, unknown>,
): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + code,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  })

  // The backend status decides which side of the result is returned.
  const data = await response.json()
  return response.ok ? { ok: true, data } : { ok: false, data }
}

// Load all skills belonging to one recovery code.
export function loadSkills(code: string) {
  return requestSkillApi<{ skills: Skill[] }>('GET', '/api/skills', code)
}

// Save one catalogue skill and return its database ID. Skills added from a
// gap list start as upcoming; everything else is a current strength.
export function addSkill(
  code: string,
  name: string,
  skillCode: string,
  status: 'current' | 'upcoming' = 'current',
) {
  return requestSkillApi<Skill>('POST', '/api/skills', code, {
    name,
    skillCode,
    status,
  })
}

// Move one saved skill between the progress buckets.
export function updateSkillStatus(
  code: string,
  id: number,
  status: SkillStatus,
) {
  return requestSkillApi<{ id: number; status: SkillStatus }>(
    'PATCH',
    '/api/skills',
    code,
    { id, status },
  )
}

// Remove one owned skill without changing the rest of the list.
export function removeSkill(code: string, id: number) {
  return requestSkillApi<{ message: string }>(
    'DELETE',
    `/api/skills?id=${id}`,
    code,
  )
}
