#!/usr/bin/env node
// Debug-only script: mints a valid session for an existing user in the local
// dev cluster via the internal ServiceAuthDirect.loginDirect, bypassing the
// public login+2FA endpoint entirely. Useful for scripting authenticated
// browser sessions (e.g. Playwright) against platform.veysur.local without
// re-running the interactive login/2FA flow each time.
//
// `authDirect` has no endpoint config under src/endpoint/ — mzen-server only
// exposes methods explicitly declared there, so loginDirect is not reachable
// over HTTP. This script only works via direct process access (e.g.
// `kubectl exec` into the API pod), never wired into package.json scripts to
// avoid accidental CI/automated invocation.
//
// Refuses to run anywhere except the local dev domain as a second safeguard.
import { modelManager } from '../model-manager'
import configDefault from '../config/default'
import { ServiceAuthDirect } from '../model/service/ServiceAuthDirect'
import { ServiceProject } from '../model/service/ServiceProject'
import { attachProjectOwn } from '../model/common/attachProjectOwn'
import { DEFAULT_PROJECT_ID, User } from 'veysur-common'
import { genUniqueId } from 'mzen-id'

async function main() {
  if (!configDefault.model.app.webDomain.endsWith('.veysur.local')) {
    throw new Error(
      `Refusing to run: webDomain is "${configDefault.model.app.webDomain}", ` +
        `not a *.veysur.local dev domain. This script must never run against ` +
        `stage or production.`,
    )
  }

  await modelManager.init()

  const repoUser = modelManager.getRepo('user')
  const email = process.argv[2]
  if (!email) throw new Error('usage: debug-mint-token.js <email>')

  const user = (await repoUser.findOne(
    { email },
    { populate: { client: true, projectAdmin: true } },
  )) as User
  if (!user) throw new Error('user not found')

  const serviceProject = modelManager.getService(
    'project',
  ) as unknown as ServiceProject
  attachProjectOwn(user, await serviceProject.getById(DEFAULT_PROJECT_ID))

  const clientData = {
    _id: genUniqueId(),
    name: 'debug-script',
    ip: '127.0.0.1',
  }

  const authService = modelManager.getService(
    'authDirect',
  ) as unknown as ServiceAuthDirect
  const result = await authService.loginDirect(
    user,
    clientData,
    configDefault.model.app.jwt,
    false,
  )

  console.log('===AUTH_JSON_START===')
  console.log(JSON.stringify(result))
  console.log('===AUTH_JSON_END===')

  await modelManager.shutdown()
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
