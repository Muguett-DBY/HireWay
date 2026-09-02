// The goal endpoint returns either saved text or a readable error.
type GoalResult =
  | {
      ok: true
      data: { careerGoal: string }
    }
  | { ok: false; data: { error?: string } }

// Read or replace the goal using the profile's recovery code.
export async function requestGoal(
  method: 'GET' | 'PUT',
  code: string,
  careerGoal?: string,
): Promise<GoalResult> {
  const response = await fetch('/api/goal', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + code,
    },
    body: careerGoal === undefined ? undefined : JSON.stringify({ careerGoal }),
    cache: 'no-store',
  })

  // Let the backend decide whether the save or load succeeded.
  const data = await response.json()
  return response.ok ? { ok: true, data } : { ok: false, data }
}
