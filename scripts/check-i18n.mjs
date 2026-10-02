import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const languages = ['en', 'zh', 'es', 'ja']
const failures = []
const resources = Object.fromEntries(languages.map((lang) => [lang, {}]))
const modules = new Map()

function placeholders(value) {
  return [...value.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)]
    .map((match) => match[1])
    .sort()
}

function checkDictionaries(dictionaries, errors) {
  const source = dictionaries.en
  for (const lang of languages) {
    const dictionary = dictionaries[lang]
    for (const key of Object.keys(source)) {
      if (!(key in dictionary)) errors.push(`${lang}: missing key ${key}`)
    }
    for (const [key, value] of Object.entries(dictionary)) {
      if (!(key in source)) errors.push(`${lang}: extra key ${key}`)
      if (typeof value !== 'string' || !value.trim()) {
        errors.push(`${lang}: ${key} must contain a nonempty string`)
      } else if (
        typeof source[key] === 'string' &&
        placeholders(value).join() !== placeholders(source[key]).join()
      ) {
        errors.push(`${lang}: interpolation parameters differ for ${key}`)
      }
    }
  }
}

function location(source, node) {
  const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1
  return `${path.relative(root, source.fileName)}:${line}`
}

function visit(node, callback) {
  callback(node)
  ts.forEachChild(node, (child) => visit(child, callback))
}

function readModule(file) {
  if (modules.has(file)) return modules.get(file)
  const input = fs.readFileSync(file, 'utf8')
  const source = ts.createSourceFile(file, input, ts.ScriptTarget.Latest, true)
  visit(source, (node) => {
    if (!ts.isObjectLiteralExpression(node)) return
    const keys = new Set()
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) continue
      const key = property.name.text
      if (key === undefined) continue
      if (keys.has(key)) {
        failures.push(`${location(source, property)}: duplicate key ${key}`)
      }
      keys.add(key)
    }
  })
  const { outputText } = ts.transpileModule(input, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  })
  const module = { exports: {} }
  modules.set(file, module.exports)
  vm.runInNewContext(
    outputText,
    {
      module,
      exports: module.exports,
      require: (specifier) => {
        if (!specifier.startsWith('.')) {
          throw new Error(`Locale modules must be local data: ${specifier}`)
        }
        const target = path.resolve(path.dirname(file), specifier)
        return readModule(target.endsWith('.ts') ? target : `${target}.ts`)
      },
    },
    { filename: file, timeout: 1000 },
  )
  return module.exports
}

function mergeDictionary(lang, dictionary, label) {
  for (const [key, value] of Object.entries(dictionary)) {
    if (key in resources[lang]) {
      failures.push(`${label}: duplicate ${lang} resource key ${key}`)
    }
    resources[lang][key] = value
  }
}

function unwrap(node) {
  while (
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isParenthesizedExpression(node) ||
    ts.isNonNullExpression(node)
  ) {
    node = node.expression
  }
  return node
}

// A typed union handles imported helpers; the initializer fallback also
// resolves older Record<SkillStatus, string> maps without hiding their keys.
function resolveKeys(node, checker, seen = new Set()) {
  node = unwrap(node)
  if (ts.isStringLiteralLike(node)) return [node.text]
  if (seen.has(node)) return null
  seen.add(node)
  const type = checker.getTypeAtLocation(node)
  const members = type.isUnion() ? type.types : [type]
  if (members.every((member) => member.isStringLiteral())) {
    return members.map((member) => member.value)
  }
  if (ts.isConditionalExpression(node)) {
    const yes = resolveKeys(node.whenTrue, checker, new Set(seen))
    const no = resolveKeys(node.whenFalse, checker, new Set(seen))
    return yes && no ? [...yes, ...no] : null
  }
  if (ts.isElementAccessExpression(node)) {
    const symbol = checker.getSymbolAtLocation(node.expression)
    const declaration = symbol?.valueDeclaration
    if (declaration && ts.isVariableDeclaration(declaration)) {
      const initializer =
        declaration.initializer && unwrap(declaration.initializer)
      if (initializer && ts.isObjectLiteralExpression(initializer)) {
        const values = initializer.properties.map((property) =>
          ts.isPropertyAssignment(property)
            ? resolveKeys(property.initializer, checker, new Set(seen))
            : null,
        )
        return values.every(Boolean) ? values.flat() : null
      }
    }
  }
  if (ts.isIdentifier(node)) {
    const declaration = checker.getSymbolAtLocation(node)?.valueDeclaration
    if (
      declaration &&
      ts.isVariableDeclaration(declaration) &&
      declaration.initializer
    ) {
      return resolveKeys(declaration.initializer, checker, seen)
    }
  }
  return null
}

function inspectSource(source, checker, dictionary, errors) {
  let calls = 0
  let dynamicCalls = 0
  visit(source, (node) => {
    if (ts.isStringLiteralLike(node) && /\{\s*t\s*\(/.test(node.text)) {
      errors.push(
        `${location(source, node)}: translation call is quoted as text`,
      )
    }
    if (
      !ts.isCallExpression(node) ||
      !(
        (ts.isIdentifier(node.expression) && node.expression.text === 't') ||
        (ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === 't')
      )
    )
      return
    calls += 1
    const argument = node.arguments[0]
    const keys = argument && resolveKeys(argument, checker)
    if (!keys?.length) {
      errors.push(
        `${location(source, node)}: cannot verify dynamic translation key; use a finite typed key map`,
      )
      return
    }
    if (!ts.isStringLiteralLike(unwrap(argument))) dynamicCalls += 1
    for (const key of new Set(keys)) {
      if (!(key in dictionary)) {
        errors.push(`${location(source, node)}: missing translation key ${key}`)
      }
    }
    // For a concrete key, verify the supplied interpolation parameters.
    // Dynamic wrappers may forward differently shaped parameter objects;
    // those remain covered by per-language placeholder parity above.
    if (keys.length !== 1 || typeof dictionary[keys[0]] !== 'string') return
    const expected = placeholders(dictionary[keys[0]])
    if (!expected.length) return
    const params = node.arguments[1]
    const supplied = params
      ? checker
          .getPropertiesOfType(checker.getTypeAtLocation(params))
          .map((property) => property.name)
      : []
    for (const parameter of new Set(expected)) {
      if (!supplied.includes(parameter)) {
        errors.push(
          `${location(source, node)}: ${keys[0]} requires parameter {${parameter}}`,
        )
      }
    }
  })
  return { calls, dynamicCalls }
}

function selfTest() {
  const valid = Object.fromEntries(
    languages.map((lang) => [lang, { 'test.key': '{n} items' }]),
  )
  const goodErrors = []
  checkDictionaries(valid, goodErrors)
  assert.deepEqual(goodErrors, [])
  for (const bad of [
    {},
    { 'test.key': '{other} items' },
    { 'test.key': '', extra: 'bad' },
  ]) {
    const errors = []
    checkDictionaries({ ...valid, zh: bad }, errors)
    assert.ok(errors.length > 0)
  }
  const file = path.join(root, 'i18n-check-fixture.ts')
  const text = `
    declare function t(key: string, vars?: Record<string, number>): string;
    const statusKeys: Record<string, string> = { ready: 'test.ready', bad: 'test.missing' };
    declare const status: string;
    t(statusKeys[status]);
    t('test.count');
    t('test.count', { n: 2 });
    const quoted = '{t("test.ready")}';
  `
  const host = ts.createCompilerHost({ noLib: true })
  host.getSourceFile = (name) =>
    name === file
      ? ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true)
      : undefined
  const program = ts.createProgram([file], { noLib: true }, host)
  const errors = []
  const stats = inspectSource(
    program.getSourceFile(file),
    program.getTypeChecker(),
    {
      'test.ready': 'Ready',
      'test.count': '{n} items',
    },
    errors,
  )
  assert.equal(stats.calls, 3)
  assert.equal(stats.dynamicCalls, 1)
  assert.equal(errors.length, 3)
  assert.ok(
    errors.some((error) =>
      error.includes('missing translation key test.missing'),
    ),
  )
  assert.ok(errors.some((error) => error.includes('requires parameter {n}')))
  assert.ok(errors.some((error) => error.includes('quoted as text')))
  console.log('i18n checker self-test passed.')
}

if (process.argv.includes('--self-test')) {
  selfTest()
} else {
  const localeDirectory = path.join(root, 'src/locales')
  for (const name of fs
    .readdirSync(localeDirectory)
    .filter((name) => name.endsWith('.ts'))
    .sort()) {
    const exports = readModule(path.join(localeDirectory, name))
    for (const [name, value] of Object.entries(exports)) {
      if (languages.includes(name)) {
        mergeDictionary(name, value, name)
      } else if (value && typeof value === 'object' && 'en' in value) {
        for (const lang of languages) {
          if (!value[lang]) failures.push(`${name}: missing ${lang} dictionary`)
          else mergeDictionary(lang, value[lang], name)
        }
      }
    }
  }
  checkDictionaries(resources, failures)
  const configPath = path.join(root, 'tsconfig.app.json')
  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  if (config.error)
    throw new Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, '\n'),
    )
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
  const program = ts.createProgram(parsed.fileNames, parsed.options)
  const checker = program.getTypeChecker()
  let calls = 0
  let dynamicCalls = 0
  for (const source of program.getSourceFiles()) {
    if (!source.fileName.startsWith(path.join(root, 'src') + path.sep)) continue
    if (source.fileName.startsWith(localeDirectory + path.sep)) continue
    const counts = inspectSource(source, checker, resources.en, failures)
    calls += counts.calls
    dynamicCalls += counts.dynamicCalls
  }
  if (failures.length) {
    console.error(
      `i18n check failed (${failures.length}):\n${failures.join('\n')}`,
    )
    process.exitCode = 1
  } else {
    console.log(
      `i18n check passed: ${languages.length} languages, ${Object.keys(resources.en).length} keys each, ${calls} calls (${dynamicCalls} dynamic).`,
    )
  }
}
