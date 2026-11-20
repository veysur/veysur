// Prints the full, untruncated member list of a class or type, grouped by the
// file that declares each member. Hover in the editor truncates long types.
// Usage: pnpm show-type [<exportName> [<file>]]   (default: Survey)
import path from 'node:path'
import ts from 'typescript'

const TARGETS = {
  Survey: 'src/model/constructor/Survey.ts',
  SettingSurvey: 'src/model/constructor/SettingSurvey.ts',
}

const [name = 'Survey', fileArg] = process.argv.slice(2)
const file = path.resolve(fileArg ?? TARGETS[name] ?? '')
if (!fileArg && !TARGETS[name]) {
  console.error(
    `Unknown name "${name}". Known: ${Object.keys(TARGETS).join(', ')}, or pass a file as the second argument.`,
  )
  process.exit(1)
}

const configPath = path.resolve('tsconfig.json')
const config = ts.getParsedCommandLineOfConfigFile(
  configPath,
  {},
  {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (d) => {
      throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'))
    },
  },
)
const program = ts.createProgram(config.fileNames, config.options)
const checker = program.getTypeChecker()

const source = program.getSourceFile(file)
if (!source) {
  console.error(`${file} is not part of the tsconfig program.`)
  process.exit(1)
}
const moduleSymbol = checker.getSymbolAtLocation(source)
const exported = checker
  .getExportsOfModule(moduleSymbol)
  .find((s) => s.name === name)
if (!exported) {
  console.error(`${file} has no export named "${name}".`)
  process.exit(1)
}

const symbol =
  exported.flags & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(exported)
    : exported
const type = checker.getDeclaredTypeOfSymbol(symbol)
const flags = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias
const root = process.cwd() + path.sep

const groups = new Map()
for (const prop of checker.getPropertiesOfType(type)) {
  const decl = prop.valueDeclaration ?? prop.declarations?.[0]
  const origin = decl
    ? decl
        .getSourceFile()
        .fileName.replace(root, '')
        .replace(/^src\//, '')
    : '(no declaration: built by a mixin factory)'
  const propType = checker.getTypeOfSymbol(prop)
  const isMethod = propType.getCallSignatures().length > 0
  const text = isMethod
    ? propType
        .getCallSignatures()
        .map(
          (sig) =>
            `${prop.name}${checker.signatureToString(sig, undefined, flags)}`,
        )
        .join('\n')
    : `${prop.name}: ${checker.typeToString(propType, undefined, flags)}`
  if (!groups.has(origin)) groups.set(origin, [])
  groups.get(origin).push(text)
}

let count = 0
for (const [origin, members] of [...groups].sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  console.log(`\n// ${origin}`)
  for (const m of members) {
    console.log(m)
    count++
  }
}
console.log(`\n${count} members in ${groups.size} files`)
