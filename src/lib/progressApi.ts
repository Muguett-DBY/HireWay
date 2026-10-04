// API for the per-skill learning progress stored on the backend.
export type SkillProgress = {
  skillCode: string
  progressPct: number
  secondsTotal: number
  sessions: number
  lastSessionAt: string | null
}

export type SkillWithProgress = {
  id: number
  name: string
  skillCode: string | null
  status: string
  learningMinutes: number
  progressPct: number
  secondsTotal: number
  sessions: number
  lastSessionAt: string | null
}

// API calls either return their expected data or one readable error.
type ApiResult<T> =
  { ok: true; data: T } | { ok: false; data: { error?: string } }

// Upper bound for one request. Without it a request swallowed by a dead
// network would leave the player's busy flag set forever, wedging the
// learning dialog shut; a timed-out request rejects and busy resets.
const REQUEST_TIMEOUT_MS = 10_000

async function requestProgressApi<T>(
  method: 'GET' | 'POST',
  code: string,
  body?: Record<string, unknown>,
): Promise<ApiResult<T>> {
  const response = await fetch('/api/profile/progress', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + code,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  const data = await response.json()
  return response.ok ? { ok: true, data } : { ok: false, data }
}

// Load the saved skills with their progress fields attached.
export function loadProgress(code: string) {
  return requestProgressApi<{ skills: SkillWithProgress[] }>('GET', code)
}

// Record one finished watching session. The percentage is the candidate the
// player computed from watch time; the backend keeps the higher of the two.
export function saveProgress(
  code: string,
  skillCode: string,
  seconds: number,
  progressPct: number,
) {
  return requestProgressApi<SkillProgress>('POST', code, {
    skillCode,
    seconds,
    progressPct,
  })
}
