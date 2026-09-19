import type { ModelConfig } from './config/types'

const modelManagerConfigs: ModelConfig[] = []

// composeModel.ts pulls in acl/role-assessor/AuthedAdmin.ts, which imports
// model-manager.ts at module scope — that module eagerly require()s the
// compiled commercial-only api-cloud package (unresolvable under this
// package's jest config), so it's stubbed out here rather than letting the
// real cross-package require() run during a unit test.
jest.mock('model-manager', () => ({ modelManager: {}, composition: {} }))

jest.mock('mzen-server', () => {
  const actual = jest.requireActual('mzen-server')
  class FakeModelManager {
    config: unknown
    constructor(config: unknown) {
      this.config = config
      modelManagerConfigs.push(config as ModelConfig)
    }
    addConstructors(): void {}
    addSchemas(): void {}
    addRepos(): void {}
    addServices(): void {}
    addInitialisers(): void {}
  }
  return { ...actual, ModelManager: FakeModelManager }
})

// composeModel imports config/default, which reads real env vars — fine here,
// we only inspect the dataSources/dynamicDataSource shape, not connect to anything.
import { composeModel } from './composeModel'

describe('composeModel', () => {
  beforeEach(() => {
    modelManagerConfigs.length = 0
  })

  it('passes only the self-hosted base dataSources when composition is empty', () => {
    composeModel({})

    const config = modelManagerConfigs[0]
    const names = (config.dataSources ?? []).map((ds) => ds.name)

    expect(names).toContain('account')
    expect(names).not.toContain('ipLocation')
    expect(names).not.toContain('project')
    expect(config.dynamicDataSource).toBeUndefined()
  })

  it('merges extraDataSources and dynamicDataSource from the composition', () => {
    composeModel({
      extraDataSources: [
        { name: 'ipLocation', type: 'mysql', config: {} },
        { name: 'project', type: 'dynamic', config: {} },
      ],
      dynamicDataSource: {
        enable: true,
        registry: { maxSize: 20, idleTimeout: 1800000 },
      },
    })

    const config = modelManagerConfigs[0]
    const names = (config.dataSources ?? []).map((ds) => ds.name)

    expect(names).toEqual(
      expect.arrayContaining(['account', 'ipLocation', 'project']),
    )
    expect(config.dynamicDataSource).toEqual({
      enable: true,
      registry: { maxSize: 20, idleTimeout: 1800000 },
    })
  })
})
