import { catalogueTerms, protectedNames } from '../locales/catalogueGlossary'

export type CatalogueLanguage = 'en' | 'zh' | 'es' | 'ja'
const columns = { en: 0, zh: 1, es: 2, ja: 3 } as const
const terms = new Map(
  catalogueTerms.map((entry) => [entry[0].toLowerCase(), entry]),
)
const suffixes = {
  zh: { knowledge: '知识', software: '软件', other: '其他' },
  es: { knowledge: 'conocimientos', software: 'software', other: 'otros' },
  ja: { knowledge: '知識', software: 'ソフトウェア', other: 'その他' },
}

export function glossaryText(
  text: string,
  lang: CatalogueLanguage,
): string | undefined {
  if (!text || lang === 'en') return text
  const trimmed = text.trim()
  const term = terms.get(trimmed.toLowerCase())
  if (term) return term[columns[lang]]
  if (
    protectedNames.some((name) => name.toLowerCase() === trimmed.toLowerCase())
  )
    return trimmed
  if (!/[a-z]/i.test(trimmed)) return trimmed
  const knowledge = trimmed.match(/^(.*?)\s+\(knowledge\)$/i)
  if (knowledge) {
    const label = glossaryText(knowledge[1], lang)
    if (label !== undefined) return `${label}（${suffixes[lang].knowledge}）`
  }
  const software = trimmed.match(/^(.*?)\s+software$/i)
  if (software) {
    const label = glossaryText(software[1], lang)
    if (label !== undefined) return `${label} ${suffixes[lang].software}`
  }
  return undefined
}
