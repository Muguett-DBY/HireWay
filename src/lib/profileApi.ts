// Keep the frontend field names aligned with the API.
export type ProfileDetails = {
  qualification: string
  qualificationCode: string | null
  degreeCode: string | null
  majorCode: string | null
  educationLevel: string
  currentRole: string
}
export type Profile = ProfileDetails & { code: string }
export type ProfileErrors = Partial<
  Record<'qualification' | 'educationLevel' | 'currentRole', string>
>

// Successful requests return a profile; failed requests return errors.
type ProfileResult =
  | { ok: true; data: Profile }
  | { ok: false; data: { error?: string; errors?: ProfileErrors } }

// Use one endpoint for creating, loading, and editing a profile.
export async function requestProfile(
  method: 'GET' | 'POST' | 'PUT',
  code = '',
  details?: ProfileDetails,
): Promise<ProfileResult> {
  const response = await fetch('/api/profile', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(code ? { Authorization: 'Bearer ' + code } : {}),
    },
    body: details ? JSON.stringify(details) : undefined,
    cache: 'no-store',
  })

  // The backend decides whether the request succeeded.
  const data = await response.json()
  return response.ok ? { ok: true, data } : { ok: false, data }
}
