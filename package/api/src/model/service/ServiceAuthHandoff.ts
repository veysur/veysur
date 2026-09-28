import { Service, ServerErrorNotFound } from 'mzen-server'
import { DEFAULT_PROJECT_ID } from 'veysur-common'

import { Client, RepoUser, RepoUserClient, ServiceProject } from 'model'
import { attachProjectOwn } from 'model/common'
import { authHandoffStore } from 'service/auth-handoff/AuthHandoffStore'

import { ServiceAuthDirect } from './ServiceAuthDirect'

const userPopulate = {
  client: true,
  projectAdmin: true,
}

interface AuthHandoffPayload {
  auth: unknown
  rememberMe: boolean
}

/**
 * Mints and redeems the short-lived, single-use token that carries an
 * authenticated session across domains (account <-> project admin subdomain
 * <-> platform), replacing the popup/postMessage handoff. See
 * docs/plan/virtual-spinning-elephant.md and the ADR this change adds.
 */
export class ServiceAuthHandoff extends Service {
  constructor() {
    super({
      name: 'authHandoff',
    })
  }

  /**
   * Builds the handoff payload entirely from the current, already-authenticated
   * request context (the JWT/access-token client mzen-server's auth middleware
   * already resolved) - never from client-supplied input - so this is safe to
   * expose at role authedAdmin without letting a caller mint a token for
   * someone else's session.
   */
  async create(requestArgs) {
    const { aclContext, ip, jwtConfig, rememberMe } = requestArgs
    const { jwt, client: accessTokenClient } = aclContext

    const userId = accessTokenClient ? accessTokenClient.userId : jwt?._id
    if (!userId) {
      throw new ServerErrorNotFound()
    }

    const repoUser = this.getRepo<RepoUser>('user')
    const user = await repoUser.findOne(
      { _id: userId },
      { includeDeleted: true, populate: userPopulate },
    )
    if (!user) {
      throw new ServerErrorNotFound()
    }

    const project =
      await this.getService<ServiceProject>('project').getById(
        DEFAULT_PROJECT_ID,
      )
    attachProjectOwn(user, project)

    const clientId = accessTokenClient ? accessTokenClient._id : jwt?.clientId
    const existingClient =
      accessTokenClient ??
      (await this.getRepo<RepoUserClient>('userClient').findOne({
        _id: clientId,
      }))
    if (!existingClient) {
      throw new ServerErrorNotFound()
    }

    const clientData: Client = { ...existingClient, ip }
    const auth = await this.getService<ServiceAuthDirect>(
      'authDirect',
    ).loginDirect(user, clientData, jwtConfig, true)

    const { token, expiresAt } = await authHandoffStore.mint({
      auth,
      rememberMe: rememberMe ?? false,
    })

    return { token, expiresAt }
  }

  async redeem(requestArgs) {
    const { token } = requestArgs
    const payload = await authHandoffStore.redeem<AuthHandoffPayload>(token)
    if (!payload) {
      throw new ServerErrorNotFound()
    }

    return payload
  }
}

export default ServiceAuthHandoff
