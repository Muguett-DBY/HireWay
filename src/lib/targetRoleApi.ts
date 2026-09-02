// A target role always comes from the Australian occupation catalogue.
export type TargetRole = {
  code: string
  title: string
  description: string
}

type TargetRoleResult =
  | { ok: true; data: { targetRole: TargetRole | null } }
  | { ok: false; data: { error?: string } }

// The same endpoint loads the saved role or replaces it with a new choice.
export async function requestTargetRole(
  method: 'GET' | 'PUT',
  profileCode: string,
  targetRoleCode?: string,
): Promise<TargetRoleResult> {
  const response = await fetch('/api/target-role', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + profileCode,
    },
    body:
      targetRoleCode === undefined
        ? undefined
        : JSON.stringify({ targetRoleCode }),
    cache: 'no-store',
  })

  // Keep HTTP details here so the page only handles success or failure.
  const data = await response.json()
  return response.ok ? { ok: true, data } : { ok: false, data }
}
