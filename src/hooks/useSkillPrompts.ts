import { useEffect, useMemo, useRef, useState } from 'react'
import type { SkillRecommendation } from '../lib/optionsApi'
import type { Skill } from '../lib/skillsApi'

const STORAGE_KEY = 'hireway.skillPrompt'
const PROMPT_LIMIT = 3
type PromptEntry = { code: string; skill: string }
type PromptHistory = { asked: PromptEntry[]; notYet: PromptEntry[] }

function readHistory(): PromptHistory {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const saved: unknown = raw ? JSON.parse(raw) : null
    if (saved && typeof saved === 'object') {
      const history = saved as Partial<PromptHistory>
      const validEntries = (entries: unknown): PromptEntry[] =>
        Array.isArray(entries)
          ? entries.filter(
              (entry): entry is PromptEntry =>
                entry !== null &&
                typeof entry === 'object' &&
                typeof entry.code === 'string' &&
                typeof entry.skill === 'string',
            )
          : []
      return {
        asked: validEntries(history.asked),
        notYet: validEntries(history.notYet),
      }
    }
  } catch {
    // An unavailable store or an old malformed entry starts a fresh session.
  }
  return { asked: [], notYet: [] }
}

function mergeHistory(
  memory: PromptHistory,
  stored: PromptHistory,
): PromptHistory {
  const mergeEntries = (answer: keyof PromptHistory) => {
    const entries = new Map<string, PromptEntry>()
    for (const entry of [...memory[answer], ...stored[answer]]) {
      entries.set(JSON.stringify([entry.code, entry.skill]), entry)
    }
    return [...entries.values()]
  }
  return { asked: mergeEntries('asked'), notYet: mergeEntries('notYet') }
}

// Prompt history is cached between answers. Only recording an answer or a
// storage event checks persistence; unrelated renders never read localStorage.
export function useSkillPrompts(
  profileCode: string | null,
  recommendations: SkillRecommendation[],
  skills: Skill[],
) {
  const [history, setHistory] = useState(readHistory)
  // Async save callbacks can outlive the render that created them. A ref
  // keeps those callbacks on the latest in-memory answers, even if storage fails.
  const historyRef = useRef(history)
  useEffect(() => {
    const syncHistory = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        const next = readHistory()
        historyRef.current = next
        setHistory(next)
      }
    }
    window.addEventListener('storage', syncHistory)
    return () => window.removeEventListener('storage', syncHistory)
  }, [])
  const suggestedSkills = useMemo(
    () =>
      recommendations.filter(
        (suggestion) =>
          !skills.some(
            (skill) =>
              skill.skillCode === suggestion.code ||
              skill.name.toLowerCase() === suggestion.label.toLowerCase(),
          ),
      ),
    [recommendations, skills],
  )
  const elicitation = useMemo(() => {
    if (
      !profileCode ||
      history.asked.filter((entry) => entry.code === profileCode).length >=
        PROMPT_LIMIT
    )
      return null
    const candidate = suggestedSkills.find(
      (suggestion) =>
        suggestion.kind === 'tool' &&
        ![...history.asked, ...history.notYet].some(
          (entry) =>
            entry.code === profileCode && entry.skill === suggestion.code,
        ),
    )
    return candidate ? { code: candidate.code, label: candidate.label } : null
  }, [profileCode, history, suggestedSkills])

  function recordAnswer(skillCode: string, answer: keyof PromptHistory) {
    if (!profileCode) return
    // Read only at the write boundary to include another tab's answer even
    // when its storage event has not arrived yet. A failed read returns an
    // empty history, so merging preserves every in-memory answer.
    const latest = mergeHistory(historyRef.current, readHistory())
    const alreadyRecorded = latest[answer].some(
      (entry) => entry.code === profileCode && entry.skill === skillCode,
    )
    const next = alreadyRecorded
      ? latest
      : {
          ...latest,
          [answer]: [
            ...latest[answer],
            { code: profileCode, skill: skillCode },
          ],
        }
    historyRef.current = next
    setHistory(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Answers remain effective in memory if storage is blocked or full.
    }
  }

  return { suggestedSkills, elicitation, recordAnswer }
}
