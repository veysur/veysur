import { Service, ServerErrorNotFound } from '@datacapy/server'
import type { tagsEndpoint as e } from '@datacapy/server'

import type { AclContext } from 'model/entity/AclContext'
import type { ConfigJwt } from 'model/entity/ConfigJwt'
import { Client, RepoUser, RepoUserClient, ServiceProject } from 'model'

import { ServiceAuthDirect } from './ServiceAuthDirect'

const userPopulate = {
  client: true,
  projectAdmin: true,
}

interface RefreshRequest {
  ip: string & e.Request<'ip'>
  jwtConfig: ConfigJwt & e.Config<'model.app.jwt'>
  aclContext: AclContext & e.AclContext
}

interface DeleteRequest {
  aclContext: AclContext & e.AclContext
}

/** @endpoints auth */
export class ServiceAuth extends Service {
  constructor() {
    super({
      name: 'auth',
    })
  }

  /**
   * @route post /refresh
   * @endpoint postRefresh
   * @acl authedAdmin
   */
  async refresh(requestArgs: RefreshRequest) {
    const { aclContext, ip, jwtConfig } = requestArgs
    const { client, accessToken } = aclContext

    const repoUser = this.getRepo<RepoUser>('user')

    const user = await repoUser.findOne(
      { _id: client.userId },
      {
        includeDeleted: true,
        populate: userPopulate,
      },
    )
    await this.getService<ServiceProject>('project').attachOwnership(user)

    // Always generate a new JWT with latest user data (projects, etc.)
    if (accessToken) {
      const clientData: Client = { ...client, ip }
      return await this.getService<ServiceAuthDirect>('authDirect').loginDirect(
        user,
        clientData,
        jwtConfig,
        true,
      )
    }

    repoUser.schema.filterPrivate(user, 'read')

    return { user, accessToken: null }
  }

  /**
   * @route delete /
   * @acl authedAdmin
   */
  async delete(requestArgs: DeleteRequest) {
    const { aclContext } = requestArgs
    const { client } = aclContext

    if (!client) {
      // User not found
      throw new ServerErrorNotFound()
    }

    // Expire all tokens
    const now = new Date()
    client.accessToken.forEach((token) => {
      if (token.expiresAt > now) {
        token.expiresAt = now
      }
    })
    client.notificationToken = null
    client.updatedAt = now

    const repoUserClient = this.getRepo<RepoUserClient>('userClient')
    await repoUserClient.updateOne({ _id: client._id }, { $set: client })

    await this.modelManager.services.eventLog.log({
      action: 'user.logout',
      userId: String(client.userId),
    })

    return true
  }

  /**
   * Revoke every session (UserClient) belonging to a user - used by account
   * deletion, which must invalidate all access immediately. Applies the same
   * token-expiry + notificationToken mutation delete() applies to a single
   * client, to every client the user has.
   */
  async revokeAllForUser(userId: string): Promise<void> {
    const repoUserClient = this.getRepo<RepoUserClient>('userClient')
    const clients = await repoUserClient.find({ userId })

    const now = new Date()
    for (const client of clients) {
      client.accessToken.forEach((token) => {
        if (token.expiresAt > now) {
          token.expiresAt = now
        }
      })
      client.notificationToken = null
      client.updatedAt = now

      await repoUserClient.updateOne({ _id: client._id }, { $set: client })
    }

    await this.modelManager.services.eventLog.log({
      action: 'user.sessionsRevoked',
      userId: String(userId),
    })
  }
}

export default ServiceAuth
