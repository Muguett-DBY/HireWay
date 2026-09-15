// Usage: node scripts/test-study-skills.mjs <local-d1.sqlite> [worker-url]
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

const [database, baseUrl = 'http://127.0.0.1:8787'] = process.argv.slice(2)
assert(database, 'Supply the local D1 SQLite path')
const query = (sql) =>
  JSON.parse(
    execFileSync('sqlite3', [database, '-json', sql], { encoding: 'utf8' }) ||
      '[]',
  )
const stamp = Date.now().toString()
async function request(parameters) {
  const url = new URL('/api/recommendations/skills', baseUrl)
  url.search = new URLSearchParams({ ...parameters, test: stamp }).toString()
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  assert.equal(response.status, 200)
  return (await response.json()).recommendations
}
const majors = query(
  `SELECT code, EXISTS(SELECT 1 FROM study_skill_map m WHERE m.major_code=major_option.code) matched FROM major_option`,
)
assert(majors.some((m) => m.matched))
assert(majors.some((m) => !m.matched))
for (const major of majors) {
  const items = await request({ majorCode: major.code })
  assert.equal(items.length > 0, Boolean(major.matched), major.code)
  assert(items.length <= 10)
  assert.equal(new Set(items.map((item) => item.code)).size, items.length)
  assert(items.every((item) => item.reason === 'education'))
}
const law = await request({ majorCode: '090999' })
assert(law.some((item) => item.label === 'Law and Government (knowledge)'))
assert.deepEqual(
  await request({ majorCode: '090999', targetRoleCode: '281331' }),
  law,
)
assert.deepEqual(await request({ majorCode: 'missing' }), [])
assert.deepEqual(await request({ targetRoleCode: '281331' }), [])
assert.deepEqual(
  await request({ degreeCode: 'missing', majorCode: '090999' }),
  [],
)
const course = query(
  `SELECT degree_code FROM degree_major_map WHERE major_code='090999' LIMIT 1`,
)[0]
assert(course)
assert((await request({ degreeCode: course.degree_code })).length > 0)
const unmapped = query(
  `SELECT code FROM degree_option d WHERE NOT EXISTS(SELECT 1 FROM degree_major_map dm JOIN study_skill_map s ON s.major_code=dm.major_code WHERE dm.degree_code=d.code) LIMIT 1`,
)[0]
assert.deepEqual(await request({ degreeCode: unmapped.code }), [])
console.log(
  `Passed ${majors.length} majors, law knowledge, course mapping, empty results and target-role independence.`,
)
