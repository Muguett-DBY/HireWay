import { glossaryText } from '../../src/lib/catalogueText'
import { catalogueTranslation } from '../locales/catalogue'

type Locale = 'zh' | 'es' | 'ja'
const MAX_BODY_BYTES = 40_000

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function isLoopback(hostname: string): boolean {
  return (
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  )
}

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin')
  if (!origin) return request.headers.get('Sec-Fetch-Site') !== 'cross-site'
  try {
    const source = new URL(origin)
    const destination = new URL(request.url)
    return (
      source.origin === destination.origin ||
      (isLoopback(source.hostname) && isLoopback(destination.hostname))
    )
  } catch {
    return false
  }
}

// Bound actual bytes while reading; Content-Length is not trusted. No request
// text is logged, persisted, queried against profiles, or sent to a provider.
async function readInput(request: Request): Promise<unknown> {
  if (!request.body) throw new Error('invalid_request')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BODY_BYTES) {
        await reader.cancel()
        throw new Error('invalid_request')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(
    new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes),
  )
}

function validInput(
  input: unknown,
): input is { locale: Locale; texts: string[] } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false
  const value = input as Record<string, unknown>
  if (Object.keys(value).some((key) => key !== 'locale' && key !== 'texts'))
    return false
  if (
    typeof value.locale !== 'string' ||
    !['zh', 'es', 'ja'].includes(value.locale)
  )
    return false
  if (
    !Array.isArray(value.texts) ||
    value.texts.length < 1 ||
    value.texts.length > 8
  )
    return false
  if (
    !value.texts.every(
      (text) =>
        typeof text === 'string' &&
        text.trim().length > 0 &&
        text.length <= 2000,
    )
  )
    return false
  return (
    value.texts.reduce(
      (total: number, text: string) => total + text.length,
      0,
    ) <= 8000
  )
}

// This deliberately finite dictionary is the entire translation service.
// A missing entry is explicit; there is no model, provider, database, or cache.
export async function handleTranslations(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    const response = json({ error: 'method_not_allowed' }, 405)
    response.headers.set('Allow', 'POST')
    return response
  }
  if (!isAllowedOrigin(request)) return json({ error: 'invalid_origin' }, 403)
  let input: unknown
  try {
    input = await readInput(request)
  } catch {
    return json({ error: 'invalid_request' }, 400)
  }
  if (!validInput(input)) return json({ error: 'invalid_request' }, 400)
  const translations = input.texts.map((text) => {
    const translatedText =
      catalogueTranslation(text, input.locale) ??
      (/[a-z]/i.test(text) ? glossaryText(text, input.locale) : undefined)
    return translatedText === undefined
      ? { text, error: 'missing_translation' }
      : { text, translatedText }
  })
  return json({ locale: input.locale, translations })
}
