// Offline contract tests. No server, credentials, database, or provider needed.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const modules = new Map()
async function moduleUrl(path) {
  if (modules.has(path)) return modules.get(path)
  const source = await readFile(path, 'utf8')
  let output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2023,
    },
  }).outputText
  for (const entry of ts.preProcessFile(source).importedFiles) {
    assert.ok(
      entry.fileName.startsWith('.'),
      'Translation service must only import local modules',
    )
    const dependency = await moduleUrl(
      resolve(dirname(path), `${entry.fileName}.ts`),
    )
    output = output
      .replaceAll(`'${entry.fileName}'`, JSON.stringify(dependency))
      .replaceAll(`"${entry.fileName}"`, JSON.stringify(dependency))
  }
  const url = `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`
  modules.set(path, url)
  return url
}

const { handleTranslations } = await import(
  await moduleUrl(resolve(root, 'worker/routes/translations.ts'))
)
const { publicCatalogueMessages } = await import(
  await moduleUrl(resolve(root, 'worker/locales/catalogue.ts'))
)
let networkAttempts = 0
const originalFetch = globalThis.fetch
globalThis.fetch = async () => {
  networkAttempts += 1
  throw new Error('Network access is forbidden in dictionary translations')
}
const request = (body, options = {}) =>
  new Request(options.url ?? 'https://hireway.example/api/translations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
let assertions = 0
async function invoke(body, options) {
  const response = await handleTranslations(request(body, options))
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assertions += 1
  return { status: response.status, body: await response.json() }
}

try {
  assert.equal(
    new Set(publicCatalogueMessages.map((entry) => entry[0])).size,
    publicCatalogueMessages.length,
  )
  for (const [locale, index] of [
    ['zh', 1],
    ['es', 2],
    ['ja', 3],
  ]) {
    for (let offset = 0; offset < publicCatalogueMessages.length; offset += 8) {
      const entries = publicCatalogueMessages.slice(offset, offset + 8)
      const result = await invoke({
        locale,
        texts: entries.map((entry) => entry[0]),
      })
      assert.equal(result.status, 200)
      assert.equal(result.body.locale, locale)
      assert.deepEqual(
        result.body.translations,
        entries.map((entry) => ({
          text: entry[0],
          translatedText: entry[index],
        })),
      )
      for (const entry of entries) assert.ok(entry[index].trim())
    }
  }
  const known = await invoke({
    locale: 'zh',
    texts: ['Data Analyst', 'Python', 'SQL', 'C++'],
  })
  assert.deepEqual(
    known.body.translations.map((item) => item.translatedText),
    ['数据分析师', 'Python', 'SQL', 'C++'],
  )
  const unknowns = [
    'Unlisted catalogue occupation',
    'Private profile note: 9F6A-1234',
    '123456789',
    '私密档案',
  ]
  const unknown = await invoke({ locale: 'zh', texts: unknowns })
  assert.deepEqual(
    unknown.body.translations,
    unknowns.map((text) => ({ text, error: 'missing_translation' })),
  )
  const mixed = await invoke({ locale: 'ja', texts: ['Python', unknowns[0]] })
  assert.equal(mixed.body.translations[0].translatedText, 'Python')
  assert.equal(mixed.body.translations[1].error, 'missing_translation')

  const invalidBodies = [
    {},
    null,
    [],
    '{invalid json',
    { locale: 'en', texts: ['Data Analyst'] },
    { locale: 'zh', texts: [] },
    { locale: 'zh', texts: Array(9).fill('Python') },
    { locale: 'zh', texts: ['a'.repeat(2001)] },
    { locale: 'zh', texts: Array(5).fill('a'.repeat(1700)) },
    { locale: 'zh', texts: [''] },
    { locale: 'zh', texts: [null] },
    { locale: 'zh', texts: ['Python'], profileCode: 'private-code' },
  ]
  for (const body of invalidBodies) {
    const result = await invoke(body)
    assert.equal(result.status, 400)
    assert.equal(result.body.error, 'invalid_request')
  }
  const oversized = await invoke(
    `{"locale":"zh","texts":["${'中'.repeat(14000)}"]}`,
    { headers: { 'Content-Length': '1' } },
  )
  assert.equal(
    oversized.status,
    400,
    'Actual streamed bytes must be limited despite a false Content-Length',
  )
  assert.equal(
    (
      await invoke(
        { locale: 'zh', texts: ['Python'] },
        { headers: { Origin: 'https://other.example' } },
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await invoke(
        { locale: 'zh', texts: ['Python'] },
        { headers: { Origin: 'null' } },
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await invoke(
        { locale: 'zh', texts: ['Python'] },
        { headers: { 'Sec-Fetch-Site': 'cross-site' } },
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await invoke(
        { locale: 'zh', texts: ['Python'] },
        { headers: { Origin: 'https://hireway.example' } },
      )
    ).status,
    200,
  )
  assert.equal(
    (
      await invoke(
        { locale: 'zh', texts: ['Python'] },
        {
          url: 'http://127.0.0.1:8787/api/translations',
          headers: { Origin: 'http://localhost:5173' },
        },
      )
    ).status,
    200,
  )
  const wrongMethod = await handleTranslations(
    new Request('https://hireway.example/api/translations'),
  )
  assert.equal(wrongMethod.status, 405)
  assert.equal(wrongMethod.headers.get('Allow'), 'POST')
  const source = await readFile(
    resolve(root, 'worker/routes/translations.ts'),
    'utf8',
  )
  assert.ok(
    !/\bfetch\s*\(|\benv\s*\.|\bcaches\s*\.|TRANSLATION_LIMITER|@cf\//.test(
      source,
    ),
  )
  assert.equal(networkAttempts, 0)
  console.log(
    `PASS: ${publicCatalogueMessages.length} public dictionary entries × 3 languages; ${assertions} endpoint responses; glossary/brand preservation, explicit misses, validation, byte limits, origin checks, zero network calls.`,
  )
} finally {
  globalThis.fetch = originalFetch
}
