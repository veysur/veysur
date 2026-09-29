import { Schema, sb } from '@datacapy/schema'

import type { ModelConfig } from './config/types'

const modelManagerConfigs: ModelConfig[] = []
const addedSchemas: Schema[][] = []

// composeModel.ts pulls in acl/role-assessor/AuthedAdmin.ts, which imports
// model-manager.ts at module scope — that module eagerly require()s the
// compiled extension package (unresolvable under this
// package's jest config), so it's stubbed out here rather than letting the
// real cross-package require() run during a unit test.
jest.mock('model-manager', () => ({ modelManager: {}, composition: {} }))

jest.mock('@datacapy/server', () => {
  const actual = jest.requireActual('@datacapy/server')
  class FakeModelManager {
    config: unknown
    constructor(config: unknown) {
      this.config = config
      modelManagerConfigs.push(config as ModelConfig)
    }
    addConstructors(): void {}
    addSchemas(schemas: Schema[]): void {
      addedSchemas.push(schemas)
    }
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
    addedSchemas.length = 0
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
  it('registers extraSchemas after core schemas so an extension schema replaces a core one by name', () => {
    // @datacapy/om's ModelManager.addSchema assigns `schemas[name] = schema`, so the
    // last registration under a name wins. An extension that supplies its own
    // `user` schema therefore overrides core's without a dedicated seam.
    class ExtensionUserSchema extends Schema {
      constructor() {
        super(sb.schema('user').shape({ _id: sb.string() }).build())
      }
    }

    composeModel({ extraSchemas: [ExtensionUserSchema] })

    const registered = addedSchemas[0]
    const userIndexes = registered
      .map((schema, index) => (schema.getName() === 'user' ? index : -1))
      .filter((index) => index >= 0)

    expect(userIndexes.length).toBeGreaterThan(1)
    expect(registered[userIndexes[userIndexes.length - 1]]).toBeInstanceOf(
      ExtensionUserSchema,
    )
  })
})
