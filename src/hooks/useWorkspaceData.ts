import { useEffect, useState } from 'react'
import type { Profile } from '../lib/profileApi'
import type { TargetRole } from '../lib/targetRoleApi'
import { loadRoleSuggestions, type RoleSuggestion } from '../lib/suggestionApi'
import {
  loadRoleRequirements,
  type RoleRequirements,
} from '../lib/roleRequirementsApi'

// One shared refresh keeps all workspace views in sync after a profile or
// skill mutation. The refresh version is intentionally live state.
export function useWorkspaceData(
  enabled: boolean,
  profile: Profile | null,
  targetRole: TargetRole | null,
  refreshVersion: number,
) {
  const [suggestions, setSuggestions] = useState<RoleSuggestion[]>([])
  const [suggestionHint, setSuggestionHint] = useState<string | null>(null)
  const [requirements, setRequirements] = useState<RoleRequirements | null>(
    null,
  )
  useEffect(() => {
    if (!enabled || !profile) return
    const controller = new AbortController()
    void loadRoleSuggestions(profile.code, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setSuggestions(result.ok ? result.data.suggestions : [])
        setSuggestionHint(result.ok ? (result.data.hint ?? null) : null)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSuggestions([])
          setSuggestionHint(null)
        }
      })
    const requirementsTask = targetRole
      ? loadRoleRequirements(profile.code, controller.signal).then((result) =>
          result.ok ? result.data : null,
        )
      : Promise.resolve(null)
    void requirementsTask
      .then((data) => {
        if (!controller.signal.aborted) setRequirements(data)
      })
      .catch(() => {
        if (!controller.signal.aborted) setRequirements(null)
      })
    return () => controller.abort()
  }, [enabled, profile, targetRole, refreshVersion])
  return { suggestions, suggestionHint, requirements }
}
