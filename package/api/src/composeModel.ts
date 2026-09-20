import {
  ModelManager,
  Service,
  Repo,
  Schema,
  ServerAclRoleAssessor,
} from 'mzen-server'
import { SchemaEncryptionServiceRsa } from 'mzen-om'

import configDefault, { encryption } from './config/default'
import type { ModelConfig } from './config/types'
import { classArrayInstantiate } from './model/classArrayInstantiate'

import * as coreServiceMap from './model/service'
import * as coreRepoMap from './model/repo'
import * as coreSchemaMapLocal from './model/schema'
import * as coreConstructorMap from './model/constructor'
import * as coreEndpointMap from './endpoint'
import { roleAssessors as coreRoleAssessors } from './acl/role-assessor/index'
import * as schemasCommon from 'veysur-common/model/schema'
import { Collection } from 'mzen-schema'

import coreModelInitFinal from './model/init/99-final'
import coreInit00 from './init/00-init'
import coreInit01 from './init/01-model-initialised'
import coreInit04 from './init/04-router-mounted'
import coreInit99 from './init/99-final'

/** Init phases — the four server phases plus the model-manager's own final phase. */
export type ServerInitPhase =
  '00-init' | '01-model-initialised' | '04-router-mounted' | '99-final'
export type InitPhase = ServerInitPhase | 'model-99-final'

type Initialiser = (...args: never[]) => unknown
type ServiceClass = new () => Service
type RepoClass = new () => Repo<unknown>
type SchemaClass = new () => Schema

/**
 * WS5 — the seam an extension composes the API model through. Core registers
 * the self-hosted set; an extension's entrypoint passes its additions.
 */
export interface ModelComposition {
  extraServices?: Array<new () => unknown>
  extraRepos?: Array<new () => unknown>
  extraSchemas?: Array<new () => unknown>
  extraConstructors?: Record<string, unknown>
  extraEndpoints?: unknown[]
  extraInit?: Partial<Record<InitPhase, Initialiser[]>>
  /** core service name → replacement class (WS4 guarded decorators). */
  serviceOverrides?: Map<string, ServiceClass>
  /**
   * core repo name → replacement class. Needed because repos (unlike
   * services) are deduped by name with core's entry winning ties (core is
   * spread first into the merged array) — an extension repo sharing a name with a
   * core repo (e.g. both 'project') would otherwise be silently discarded.
   */
  repoOverrides?: Map<string, RepoClass>
  /** Extension role assessors appended to core's ACL set. */
  extraRoleAssessors?: ServerAclRoleAssessor[]
  /**
   * Extra dataSource entries appended after core's base list (e.g. an
   * `ipLocation` mysql datasource and a `project` dynamic datasource — see
   * `config/default.ts`'s WS6 comment for why self-hosted has neither).
   */
  extraDataSources?: ModelConfig['dataSources']
  /**
   * Dynamic (per-project) datasource registry config. Absent in self-hosted,
   * which has no dynamic datasources at all to register.
   */
  dynamicDataSource?: {
    enable: boolean
    registry: { maxSize: number; idleTimeout: number }
  }
  /**
   * Second migration pass — an extension's patch directory and context
   * resolver, run against its own meta table (see `script/migrate.ts`).
   */
  migrate?: {
    patchDirectory: string
    metaTableName: string
    ContextResolverProject: new (
      accountDataSource: unknown,
    ) => { resolve(pattern: string): Promise<Array<Record<string, string>>> }
  }
}

export interface ComposedModel {
  modelManager: ModelManager
  serverInit: Record<ServerInitPhase, Initialiser[]>
  endpoints: unknown[]
  roleAssessors: ServerAclRoleAssessor[]
}

const isClass = (v: unknown): v is new () => unknown => typeof v === 'function'

const buildEncryptionService = () =>
  encryption.publicKey
    ? new SchemaEncryptionServiceRsa({
        publicKey: Buffer.from(encryption.publicKey, 'base64').toString('utf8'),
        privateKey: encryption.privateKey
          ? Buffer.from(encryption.privateKey, 'base64').toString('utf8')
          : undefined,
        privateKeyPassword: encryption.privateKeyPassword || undefined,
      })
    : undefined

export function composeModel(c: ModelComposition = {}): ComposedModel {
  const encryptionService = buildEncryptionService()

  const modelManager = new ModelManager({
    ...configDefault.model,
    dataSources: [
      ...(configDefault.model.dataSources ?? []),
      ...(c.extraDataSources ?? []),
    ],
    ...(c.dynamicDataSource ? { dynamicDataSource: c.dynamicDataSource } : {}),
    ...(encryptionService ? { encryptionService } : {}),
  })

  // --- constructors ---
  modelManager.addConstructors({
    Collection,
    ...coreConstructorMap,
    ...(c.extraConstructors ?? {}),
  })

  // An extension's composition may feed in barrels, which re-export the
  // core barrel — dedupe by mzen name so a re-exported core class registered
  // once as core is not registered again as an "extra".
  const dedupeByName = <T extends { getName?: () => string }>(
    items: T[],
  ): T[] => {
    const seen = new Set<string>()
    return items.filter((item) => {
      const name =
        typeof item?.getName === 'function' ? item.getName() : undefined
      if (name === undefined) return true
      if (seen.has(name)) return false
      seen.add(name)
      return true
    })
  }

  // --- schemas (object spread dedupes common vs local by key, as before) ---
  const schemaClasses = [
    ...Object.values({
      ...schemasCommon,
      ...coreSchemaMapLocal,
    }).filter(isClass),
    ...(c.extraSchemas ?? []),
  ] as SchemaClass[]
  modelManager.addSchemas(classArrayInstantiate(Schema, schemaClasses))

  // --- repos (with core-name overrides applied after dedup, mirroring services) ---
  const repoClasses = [
    ...Object.values(coreRepoMap).filter(isClass),
    ...(c.extraRepos ?? []),
  ] as RepoClass[]
  const repoInstances = dedupeByName(
    classArrayInstantiate(Repo<unknown>, repoClasses),
  )
  if (c.repoOverrides) {
    for (const [name, Cls] of c.repoOverrides) {
      const index = repoInstances.findIndex(
        (r) => typeof r.getName === 'function' && r.getName() === name,
      )
      if (index >= 0) repoInstances[index] = new Cls()
      else repoInstances.push(new Cls())
    }
  }
  modelManager.addRepos(repoInstances)

  // --- services (with WS4 overrides applied before wiring) ---
  const serviceClasses = [
    ...Object.values(coreServiceMap).filter(isClass),
    ...(c.extraServices ?? []),
  ] as ServiceClass[]
  const serviceInstances = dedupeByName(
    classArrayInstantiate(Service, serviceClasses),
  )
  if (c.serviceOverrides) {
    for (const [name, Cls] of c.serviceOverrides) {
      const index = serviceInstances.findIndex(
        (s) => typeof s.getName === 'function' && s.getName() === name,
      )
      if (index >= 0) serviceInstances[index] = new Cls()
      else serviceInstances.push(new Cls())
    }
  }
  modelManager.addServices(serviceInstances)

  // --- model-manager's own final init phase ---
  modelManager.addInitialisers(
    [...coreModelInitFinal, ...(c.extraInit?.['model-99-final'] ?? [])],
    '99-final',
  )

  const phase = (name: ServerInitPhase, core: Initialiser[]): Initialiser[] => [
    ...core,
    ...(c.extraInit?.[name] ?? []),
  ]

  return {
    modelManager,
    serverInit: {
      '00-init': phase('00-init', coreInit00),
      '01-model-initialised': phase('01-model-initialised', coreInit01),
      '04-router-mounted': phase('04-router-mounted', coreInit04),
      '99-final': phase('99-final', coreInit99),
    },
    endpoints: [...Object.values(coreEndpointMap), ...(c.extraEndpoints ?? [])],
    roleAssessors: [...coreRoleAssessors, ...(c.extraRoleAssessors ?? [])],
  }
}

export default composeModel
