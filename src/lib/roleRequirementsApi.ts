export type RoleSkill = {
  code: string
  name: string
  description: string
  score: number
  priority: 'essential' | 'recommended' | 'bonus'
}

export type RoleQualification = {
  code: string
  title: string
  qualificationLevel: string
  relationship: string
  specialConditions: string
  specialConditionsDescription: string
}

export type RoleSource = {
  name: string
  publisher: string
  url: string
  licence: string
}

export type RoleMarket = {
  employedMay2025: number | null
  employedMay2030: number | null
  employedMay2035: number | null
  change5yPercent: number | null
  change10yPercent: number | null
  medianWeeklyEarnings: number | null
  outlook: string
  vacancies: { state: string; vacancies: number }[]
}

export type RoleRequirements = {
  targetRole: { code: string; title: string }
  skills: RoleSkill[]
  qualifications: RoleQualification[]
  tasks: string[]
  sources: RoleSource[]
  market: RoleMarket | null
}

type RoleRequirementsResult =
  { ok: true; data: RoleRequirements } | { ok: false; data: { error?: string } }

// Keep the authenticated request out of the dashboard component.
export async function loadRoleRequirements(
  profileCode: string,
  signal?: AbortSignal,
): Promise<RoleRequirementsResult> {
  const response = await fetch('/api/role-requirements', {
    headers: { Authorization: 'Bearer ' + profileCode },
    cache: 'no-store',
    signal,
  })

  const data = await response.json()
  return response.ok ? { ok: true, data } : { ok: false, data }
}
