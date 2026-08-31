// Keep one shape for every skill shown on the page.
export type Skill = {
  id: number
  name: string
}

// API calls either return their expected data or one readable error.
type ApiResult<T> =
  { ok: true; data: T } | { ok: false; data: { error?: string } }

// Share the recovery-code header and response handling between skill actions.
async function requestSkillApi<T>(
  method: 'GET' | 'POST' | 'DELETE',
  url: string,
  code: string,
  name?: string,
): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + code,
    },
    body: name === undefined ? undefined : JSON.stringify({ name }),
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

// Save one skill and return its database ID.
export function addSkill(code: string, name: string) {
  return requestSkillApi<Skill>('POST', '/api/skills', code, name)
}

// Remove one owned skill without changing the rest of the list.
export function removeSkill(code: string, id: number) {
  return requestSkillApi<{ message: string }>(
    'DELETE',
    `/api/skills?id=${id}`,
    code,
  )
}
