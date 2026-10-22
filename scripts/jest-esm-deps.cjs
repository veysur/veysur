// sanitize-html >=2.18 depends on ESM-only htmlparser2@12 and its ESM-only
// dependencies, which Jest's CommonJS loader cannot require. Transform them.
const ESM_DEPS = ['htmlparser2', 'domhandler', 'domutils', 'domelementtype', 'dom-serializer', 'entities']

module.exports = {
  transform: {
    '.*\\.(ts|tsx)$': 'ts-jest',
    '.*/node_modules/.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true, esModuleInterop: true } }],
  },
  transformIgnorePatterns: [`/node_modules/(?!.*(${ESM_DEPS.join('|')})[@/])`],
}
