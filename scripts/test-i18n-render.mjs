import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(path.join(root, 'package.json'))

// Bundle application code in memory, sharing the installed React instance.
// SSR never runs effects: this suite checks reviewed local terms and UI text,
// not browser interaction, asynchronous catalogue loading, or visual layout.
const bundle = await build({
  stdin: {
    contents: `
      export { default as i18next } from 'i18next';
      export { resources } from './src/lib/i18n';
      export { glossaryText } from './src/lib/catalogueText';
      export { localizeMessage } from './src/lib/localizedErrors';
      export { LocalizedText } from './src/components/LocalizedText';
      export { OverviewPage } from './src/components/app/OverviewPage';
      export { MatchesPage } from './src/components/app/MatchesPage';
      export { AnalysisPage } from './src/components/app/AnalysisPage';
      export { RoleDetailsPage } from './src/components/app/RoleDetailsPage';
      export { PathwaysPage } from './src/components/app/PathwaysPage';
      export { MyProfilePage } from './src/components/app/MyProfilePage';
      export { MarketingLanding } from './src/components/landing/MarketingLanding';
      export { EducationLevelSelect, EducationLevelText } from './src/components/EducationLevelSelect';
    `,
    resolveDir: root,
    sourcefile: 'i18n-render-fixtures.ts',
    loader: 'ts',
  },
  absWorkingDir: root,
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  jsx: 'automatic',
  packages: 'external',
  loader: { '.css': 'empty' },
  logLevel: 'silent',
})
const module = { exports: {} }
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(
  require,
  module,
  module.exports,
)
const app = module.exports

const noop = () => {}
const saved = async () => ({ ok: true })
const profile = {
  code: 'TEST-RECOVERY',
  qualification: 'Master of Data Science',
  qualificationCode: null,
  degreeCode: 'fixture-degree',
  majorCode: null,
  educationLevel: 'Master',
  currentRole: '',
}
const targetRole = {
  code: 'fixture-role',
  title: 'Data Scientist',
  description: 'Data Science',
}
const skills = [
  { id: 1, name: 'Python', skillCode: 'tool-python', status: 'current' },
  {
    id: 2,
    name: 'Critical Thinking',
    skillCode: '2.A.2.a',
    status: 'upcoming',
  },
]
const suggestion = {
  code: targetRole.code,
  title: targetRole.title,
  matchScore: 81,
  reasons: ['This legacy sentence must not replace structured reasons.'],
  reasonDetails: [
    { code: 'skills', skills: ['Python', 'Critical Thinking'] },
    { code: 'growth', percentile: 78 },
    { code: 'educationAligned' },
  ],
  factors: { skill: 12, growth: 11.7, education: 25 },
  change5yPercent: 12.5,
  medianWeeklyEarnings: 2345,
  growthPercentile: 0.78,
}
const requirements = {
  targetRole,
  skills: [
    {
      code: '2.A.2.a',
      name: 'Critical Thinking',
      description: 'Critical Thinking',
      score: 85,
      priority: 'essential',
    },
    {
      code: '2.A.1.c',
      name: 'Writing',
      description: 'Writing',
      score: 77,
      priority: 'recommended',
    },
    {
      code: 'tool-python',
      name: 'Python',
      description: 'Python',
      score: 96,
      priority: 'bonus',
    },
  ],
  qualifications: [
    {
      code: 'fixture-degree',
      title: profile.qualification,
      qualificationLevel: 'Master',
      relationship: 'Data Science',
      specialConditions: '',
      specialConditionsDescription: '',
    },
  ],
  tasks: ['Critical Thinking'],
  sources: [
    {
      name: 'O*NET',
      publisher: 'ABS',
      url: 'https://example.invalid/source',
      licence: 'CC BY 4.0',
    },
  ],
  market: {
    employedMay2025: 10000,
    employedMay2030: 11250,
    employedMay2035: 12500,
    change5yPercent: 12.5,
    change10yPercent: 25,
    medianWeeklyEarnings: 2345,
    outlook: 'Growing strongly',
    outlookCode: 'strong',
    vacancies: [
      { state: 'VIC', vacancies: 321 },
      { state: 'NSW', vacancies: 654 },
    ],
  },
}
const common = {
  profile,
  skills,
  targetRole,
  suggestions: [suggestion],
  requirements,
  busy: false,
}
const cases = [
  {
    name: 'Overview',
    component: app.OverviewPage,
    props: {
      ...common,
      onEditTargetRole: noop,
      onPlan: noop,
      onGoMatches: noop,
      onGoWizard: noop,
      onGoPage: noop,
    },
    en: [
      'Your target role',
      'Data Scientist',
      'Master of Data Science',
      'Python',
    ],
    zh: ['你的目标职业', '数据科学家', '数据科学硕士', 'Python'],
  },
  {
    name: 'Matches',
    component: app.MatchesPage,
    props: { ...common, hint: null, skillsCount: skills.length, onPlan: noop },
    en: ['Career matches for you', 'Data Scientist', 'Python'],
    zh: [
      '为你匹配的职业',
      '数据科学家',
      '批判性思维',
      'Python',
      '预计就业增长超过 78%',
    ],
  },
  {
    name: 'Analysis',
    component: app.AnalysisPage,
    props: {
      ...common,
      onAddSkill: noop,
      onSkillStatus: noop,
      onRemoveSkill: saved,
      onGoMatches: noop,
      onEditTargetRole: noop,
    },
    en: ['Overall readiness', 'Data Scientist', 'Critical Thinking', 'Python'],
    zh: [
      '整体就绪度',
      '数据科学家',
      '批判性思维',
      'Python',
      '已覆盖 0/1 项',
      '缺少 1 项',
      '预计就业增长超过 78%',
    ],
  },
  {
    name: 'RoleDetails',
    component: app.RoleDetailsPage,
    props: { ...common, onAddSkill: saved, onGoPathways: noop },
    en: ['Australian outlook', 'Data Scientist', 'Growing strongly', 'Python'],
    zh: [
      '澳大利亚就业前景',
      '数据科学家',
      '强劲增长',
      '批判性思维',
      '数据科学硕士',
      'Python',
    ],
  },
  {
    name: 'Pathways',
    component: app.PathwaysPage,
    props: { ...common, onGoRole: noop },
    en: [
      'Learning roadmap towards Data Scientist',
      'Training routes',
      'Python',
    ],
    zh: [
      '通往数据科学家的学习路线图',
      '培训路径',
      '数据科学硕士',
      '现有或已完成：50%',
      '批判性思维',
      'Python',
    ],
  },
  {
    name: 'MyProfile',
    component: app.MyProfilePage,
    props: {
      ...common,
      recoveryCode: profile.code,
      onAddSkill: noop,
      onRemoveSkill: saved,
      onSkillStatus: noop,
      onEditBackground: noop,
      onEditTargetRole: noop,
      promptSkill: null,
      onDeclineSkill: noop,
    },
    en: [
      'Manage your profile',
      'Data Scientist',
      'Master of Data Science',
      'Python',
    ],
    zh: [
      '管理你的档案',
      '数据科学家',
      '数据科学硕士',
      '硕士学位',
      '批判性思维',
      'Python',
    ],
  },
  {
    name: 'MarketingLanding',
    component: app.MarketingLanding,
    props: {
      recoveryCode: '',
      busy: false,
      message: 'Profile not found.',
      failed: true,
      hasProfile: true,
      onCodeChange: noop,
      onContinue: noop,
      onStart: noop,
      onOpenProfile: noop,
    },
    en: [
      'Build my profile',
      'Coming back?',
      'Could not load a profile with that code.',
      'Python',
    ],
    zh: [
      '创建我的档案',
      '回来继续？',
      '打开我的工作台',
      '无法使用此恢复码加载档案。',
      'Python',
    ],
  },
  {
    name: 'EducationLevelSelect',
    component: app.EducationLevelSelect,
    props: { value: 'Master', onChange: noop, invalid: false },
    en: ['Master&#x27;s degree'],
    zh: ['硕士学位'],
  },
]

const failures = []
let checks = 0
function check(label, assertion) {
  checks += 1
  try {
    assertion()
  } catch (error) {
    failures.push(`${label}: ${error.message}`)
  }
}
function cleanMarkup(html, label) {
  assert.doesNotMatch(
    html,
    /\b(?:nav|landing|entry|wizard|analysis|role|pathways|profile|profileUi|workspace|catalogue)\.[A-Za-z][\w.]*/,
    `${label}: raw translation key`,
  )
  assert.doesNotMatch(
    html,
    /\{\s*t\s*\(/,
    `${label}: quoted translation expression`,
  )
  assert.doesNotMatch(
    html,
    /\{(?:role|name|n|m|skills|covered|total|course|skill|start|end|startYear|endYear)\}/,
    `${label}: unresolved interpolation`,
  )
}

let networkCalls = 0
const originalFetch = globalThis.fetch
globalThis.fetch = async () => {
  networkCalls += 1
  throw new Error('Rendering must not call a real endpoint')
}
try {
  // Switching back to English catches dictionaries or components pinned to zh.
  for (const lang of ['en', 'zh', 'en']) {
    await app.i18next.changeLanguage(lang)
    for (const fixture of cases) {
      check(`${lang}/${fixture.name}`, () => {
        const html = renderToStaticMarkup(
          createElement(fixture.component, fixture.props),
        )
        cleanMarkup(html, fixture.name)
        for (const expected of fixture[lang]) {
          assert.ok(
            html.includes(expected),
            `missing ${JSON.stringify(expected)}`,
          )
        }
        if (lang === 'zh') {
          assert.doesNotMatch(
            html,
            /Data Scientist|Master of Data Science|Critical Thinking/,
          )
        }
        assert.ok(
          !html.includes(
            'This legacy sentence must not replace structured reasons.',
          ),
        )
      })
    }
  }

  await app.i18next.changeLanguage('zh')
  for (const [value, expected] of [
    ['', '选择你的学历等级'],
    ['High School', '高中'],
    ['Diploma / Certificate', '文凭 / 证书'],
    ['Bachelor', '学士学位'],
    ['Master', '硕士学位'],
    ['Doctorate', '博士学位'],
    ['Other', '其他'],
  ]) {
    check(`zh/education/${value || 'placeholder'}`, () => {
      const html = renderToStaticMarkup(
        createElement(app.EducationLevelSelect, {
          value,
          onChange: noop,
          invalid: false,
        }),
      )
      cleanMarkup(html, value)
      assert.ok(html.includes(expected), `missing ${expected}`)
    })
  }
  for (const fixture of cases.filter((fixture) =>
    ['Analysis', 'RoleDetails', 'Pathways'].includes(fixture.name),
  )) {
    check(`zh/${fixture.name}/empty`, () => {
      const html = renderToStaticMarkup(
        createElement(fixture.component, {
          ...fixture.props,
          targetRole: null,
          requirements: null,
          skills: [],
          suggestions: [],
        }),
      )
      cleanMarkup(html, fixture.name)
      assert.ok(/[\u4e00-\u9fff]/.test(html))
      assert.doesNotMatch(
        html,
        /Choose a target role|No current skills|Nothing planned yet/,
      )
    })
  }
  check('zh/legacy market outlook', () => {
    const html = renderToStaticMarkup(
      createElement(app.RoleDetailsPage, {
        ...cases.find((fixture) => fixture.name === 'RoleDetails').props,
        requirements: {
          ...requirements,
          market: { ...requirements.market, outlookCode: undefined },
        },
      }),
    )
    assert.ok(html.includes('强劲增长'))
    assert.ok(!html.includes('Growing strongly'))
  })
  check('legacy error and key language switching', () => {
    const translate = (key, params) => app.i18next.t(key, params)
    assert.equal(
      app.localizeMessage('Profile not found.', translate),
      app.resources.zh.translation['profileUi.error.profileNotFound'],
    )
    assert.equal(
      app.localizeMessage('profileUi.error.connection', translate),
      app.resources.zh.translation['profileUi.error.connection'],
    )
    assert.equal(
      app.localizeMessage('profileUi.unregistered', translate),
      'profileUi.unregistered',
    )
  })
  for (const lang of ['zh', 'es', 'ja']) {
    for (const term of [
      'Python',
      'SQL',
      'Microsoft Excel',
      'Power BI',
      'O*NET',
      'HireWay',
    ]) {
      check(`${lang}/protected/${term}`, () =>
        assert.equal(app.glossaryText(term, lang), term),
      )
    }
  }
  check('unknown catalogue text stays explicitly unresolved', () => {
    assert.equal(
      app.glossaryText('Unlisted fixture occupation', 'zh'),
      undefined,
    )
    const html = renderToStaticMarkup(
      createElement(app.LocalizedText, {
        text: 'Unlisted fixture occupation',
      }),
    )
    assert.ok(html.includes('lang="en"'))
    assert.ok(html.includes('Unlisted fixture occupation'))
  })
  check('protected brand names survive surrounding text translation', () => {
    assert.equal(
      app.glossaryText('Microsoft Excel software', 'zh'),
      'Microsoft Excel 软件',
    )
    assert.equal(
      app.glossaryText('Python software', 'ja'),
      'Python ソフトウェア',
    )
  })
  check('no endpoint requests during SSR', () => assert.equal(networkCalls, 0))
} finally {
  globalThis.fetch = originalFetch
}

if (failures.length) {
  console.error(
    `i18n render tests failed (${failures.length}/${checks}):\n${failures.join('\n')}`,
  )
  process.exitCode = 1
} else {
  console.log(
    `i18n render tests passed: ${checks} checks, 8 components, en → zh → en, no network requests.`,
  )
}
