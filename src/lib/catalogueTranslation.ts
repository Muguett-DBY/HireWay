import { glossaryText, type CatalogueLanguage } from './catalogueText'

const CACHE_KEY = 'hireway.catalogue-translations.offline-v1'
const MAX_CACHE_ENTRIES = 1200
type Entry = { text: string; locale: CatalogueLanguage; translatedText: string }
const cache = new Map<string, Entry>()
const queued = new Map<string, { text: string; locale: CatalogueLanguage }>()
const pending = new Set<string>()
const failed = new Map<string, { text: string; locale: CatalogueLanguage }>()
const untranslated = new Set<string>()
const active = new Map<string, number>()
const listeners = new Set<() => void>()
let version = 0
let hydrated = false
let running = false
let timer: ReturnType<typeof setTimeout> | undefined

function key(text: string, locale: CatalogueLanguage) {
  return `${locale}:${text}`
}

function emit() {
  version += 1
  listeners.forEach((listener) => listener())
}

function hydrate() {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]')
    if (!Array.isArray(saved)) return
    for (const entry of saved.slice(-MAX_CACHE_ENTRIES)) {
      if (
        entry &&
        ['zh', 'es', 'ja'].includes(entry.locale) &&
        typeof entry.text === 'string' &&
        typeof entry.translatedText === 'string' &&
        entry.text.length <= 2000 &&
        entry.translatedText.length <= 8000
      ) {
        cache.set(key(entry.text, entry.locale), entry)
      }
    }
  } catch {
    /* Storage may be disabled or full. Translation still works. */
  }
}

function persist() {
  while (cache.size > MAX_CACHE_ENTRIES)
    cache.delete(cache.keys().next().value!)
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify([...cache.values()]))
  } catch {
    /* In-memory cache remains available in private browsing. */
  }
}

export function catalogueText(text: string, locale: CatalogueLanguage): string {
  hydrate()
  return (
    glossaryText(text, locale) ??
    cache.get(key(text, locale))?.translatedText ??
    text
  )
}

export function catalogueIsTranslated(
  text: string,
  locale: CatalogueLanguage,
): boolean {
  hydrate()
  return (
    glossaryText(text, locale) !== undefined || cache.has(key(text, locale))
  )
}

export function subscribeCatalogue(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function catalogueVersion() {
  return version
}

export function observeCatalogueText(text: string, locale: CatalogueLanguage) {
  const id = key(text, locale)
  active.set(id, (active.get(id) ?? 0) + 1)
  requestCatalogueText(text, locale)
  emit()
  return () => {
    const count = (active.get(id) ?? 1) - 1
    if (count) active.set(id, count)
    else active.delete(id)
    emit()
  }
}

export function requestCatalogueText(text: string, locale: CatalogueLanguage) {
  if (catalogueIsTranslated(text, locale)) return
  const id = key(text, locale)
  if (pending.has(id) || failed.has(id) || untranslated.has(id)) return
  pending.add(id)
  queued.set(id, { text, locale })
  emit()
  if (!timer && !running)
    timer = setTimeout(() => {
      timer = undefined
      void flush()
    }, 25)
}

async function flush() {
  if (running) return
  running = true
  try {
    while (queued.size) {
      const locale = queued.values().next().value!.locale
      const batch: { text: string; locale: CatalogueLanguage }[] = []
      let length = 0
      for (const [id, item] of queued) {
        if (item.locale !== locale) continue
        if (item.text.length > 2000) {
          queued.delete(id)
          pending.delete(id)
          failed.set(id, item)
          continue
        }
        if (batch.length >= 8 || length + item.text.length > 8000) break
        queued.delete(id)
        batch.push(item)
        length += item.text.length
      }
      if (!batch.length) continue
      try {
        const response = await fetch('/api/translations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locale,
            texts: batch.map((item) => item.text),
          }),
          signal: AbortSignal.timeout(60000),
        })
        if (!response.ok) throw new Error('Translation unavailable')
        const result: {
          translations?: {
            text: string
            translatedText?: string
            error?: string
          }[]
        } = await response.json()
        if (!Array.isArray(result.translations))
          throw new Error('Invalid translation response')
        for (const item of batch) {
          const translated = result.translations.find(
            (entry) => entry.text === item.text,
          )
          const id = key(item.text, locale)
          if (
            typeof translated?.translatedText === 'string' &&
            translated.translatedText.trim()
          ) {
            cache.set(id, {
              ...item,
              translatedText: translated.translatedText,
            })
            failed.delete(id)
          } else if (translated?.error === 'missing_translation')
            untranslated.add(id)
          else failed.set(id, item)
        }
        persist()
      } catch {
        // Do not cache untranslated fallbacks as if they were successful.
        batch.forEach((item) => failed.set(key(item.text, locale), item))
      } finally {
        batch.forEach((item) => pending.delete(key(item.text, locale)))
        emit()
      }
    }
  } finally {
    running = false
    emit()
  }
}

export function catalogueStatus(locale: CatalogueLanguage) {
  const prefix = `${locale}:`
  return {
    pending: [...pending].filter(
      (id) => id.startsWith(prefix) && active.has(id),
    ).length,
    failed: [...failed.keys()].filter(
      (id) => id.startsWith(prefix) && active.has(id),
    ).length,
    untranslated: [...untranslated].filter(
      (id) => id.startsWith(prefix) && active.has(id),
    ).length,
  }
}

export function retryCatalogue(locale: CatalogueLanguage) {
  const retry = [...failed.values()].filter(
    (item) => item.locale === locale && active.has(key(item.text, locale)),
  )
  for (const item of retry) {
    failed.delete(key(item.text, locale))
    requestCatalogueText(item.text, locale)
  }
}
