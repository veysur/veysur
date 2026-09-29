import { Service } from '@datacapy/server'
import momentTimezone from 'moment-timezone'
import * as crypto from 'crypto'
import { User, UserAccessToken } from 'veysur-common'
import { PropsOf } from '@datacapy/schema'

import { Client, ConfigJwt, JwtAdmin, RepoUser, RepoUserClient } from 'model'
import { lookupIp } from 'model/common'
import { JWT_TYPE_ADMIN } from 'acl/util/constant'
import { Jwt } from 'acl/util/Jwt'

const EXPIRE_OLD_TOKEN_SECONDS = 60
const MAX_CLIENTS = 5
const MAX_TOKENS_PER_CLIENT = 2

export class ServiceAuthDirect extends Service {
  constructor() {
    super({
      name: 'authDirect',
    })
  }

  // Access token is a long lived token
  // - which can be used to refresh a JSON web token
  async generateAccessToken(user: User, clientData: Client) {
    const createdAt = new Date()
    const ttl = this.config.model.app.jwt.accessTokenTtlSeconds
    const expiresAt = new Date()
    expiresAt.setTime(expiresAt.getTime() + ttl * 1000)

    const randomLength = 1024
    const token = crypto
      .createHash('sha512')
      .update(
        user._id.toString() +
          new Date().toJSON() +
          crypto.randomBytes(randomLength).toString('base64'),
      )
      .digest('base64')

    const accessToken: PropsOf<UserAccessToken> = {
      token,
      ttl,
      createdAt,
      expiresAt,
      ip: clientData.ip || '',
    }

    return accessToken
  }

  async createJsonWebToken(user: User, clientId: string, jwtConfig: ConfigJwt) {
    const data: PropsOf<JwtAdmin> = {
      _id: user._id,
      clientId,
      type: JWT_TYPE_ADMIN,
      nameFirst: user.nameFirst,
      nameLast: user.nameLast,
      email: user.email,
      role: user.role || 'admin',
      twoFactorEnabled: user.twoFactorMeta?.enabled ?? false,
      project: {},
    }

    if (user.emailMeta?.verify?.status?.isVerified) {
      user.projectOwn?.forEach((project) => {
        data.project[project._id] = {
          owner: true,
        }
      })

      user.projectAdmin?.forEach((projectAdmin) => {
        data.project[projectAdmin.projectId] = {
          owner: false,
        }
      })
    }

    const expireSeconds: number = this.config.model.app.jwt.adminLifetimeSeconds
    const created = new Date()
    const token: string = await Jwt.create(data, jwtConfig, expireSeconds)

    return {
      token,
      created,
      expires: momentTimezone(created).add(expireSeconds, 'seconds'),
    }
  }

  async loginDirect(
    user: User,
    clientData: Client,
    jwtConfig: ConfigJwt,
    isRefresh: boolean,
  ) {
    const clientOld = user.client
      ? user.client.filter((client) => clientData._id == client._id).shift()
      : null
    let accessTokens = clientOld?.accessToken?.slice() || []
    let accessToken = accessTokens[0]

    let createNewAccessToken = !accessToken || !isRefresh
    if (
      !createNewAccessToken &&
      (!accessToken?.expiresAt ||
        momentTimezone(accessToken?.expiresAt).isBefore(
          momentTimezone().add(1, 'days'),
        ))
    ) {
      createNewAccessToken = true
    }

    if (createNewAccessToken) {
      const expiresOld = momentTimezone()
        .add(EXPIRE_OLD_TOKEN_SECONDS, 'seconds')
        .toDate()
      accessTokens = accessTokens.map((token) => {
        // We are adding a new access token which should be used
        // - for all future requests
        // Set all old tokens to expire giving some time for existing
        // - requests to complete
        token.expiresAt = new Date(expiresOld)
        return token
      })
      clientData.userId = user._id
      // Add new token to client
      // We generate a new token for each login but not for an auth refresh
      const accessTokenData = await this.generateAccessToken(user, clientData)
      accessToken = new UserAccessToken(accessTokenData)
      accessTokens.unshift(new UserAccessToken(accessToken))
      // Limit the number of tokens we keep
      clientData.accessToken = accessTokens.slice(0, MAX_TOKENS_PER_CLIENT)
    }

    // Unset data stored in client data
    const clientIp = clientData.ip
    delete clientData.ip
    delete clientData.geo

    const repoUserClient = this.getRepo<RepoUserClient>('userClient')
    if (clientOld) {
      clientData.updatedAt = new Date()
      await repoUserClient.updateOne(
        { _id: clientOld._id },
        { $set: clientData },
      )
    } else {
      // If its a new client add it
      clientData = await repoUserClient.schema.applyFilters(clientData)
      await repoUserClient.insertOne(clientData)

      // Best-effort geo lookup — must not block login response
      ;(async () => {
        try {
          const geo = await lookupIp(clientIp)
          if (geo) {
            await repoUserClient.updateOne(
              { _id: clientData._id },
              {
                $set: {
                  geo: {
                    country: geo.country,
                    countryCode: geo.countryCode,
                    region: geo.region,
                    regionCode: geo.regionCode,
                    city: geo.city,
                    location: {
                      type: 'Point',
                      coordinates: [geo.lon, geo.lat],
                    },
                    timezone: geo.timezone,
                  },
                },
              },
            )
          }
        } catch (e) {
          this.logger.warn('geo lookup for new client failed: ' + e)
        }
      })()
    }

    // Delete older above MAX_CLIENTS
    const sortedClients = user.client
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    const deleteClients = sortedClients?.slice(MAX_CLIENTS - 1) || []
    if (deleteClients.length) {
      await repoUserClient.deleteMany({
        userId: user._id,
        createdAt: { $lte: deleteClients[0].createdAt },
      })
    }

    const jwt = await this.createJsonWebToken(user, clientData._id, jwtConfig)

    // This method is not available via the api server - its for internal access only
    const repoUser = this.getRepo<RepoUser>('user')
    repoUser.schema.filterPrivate(user, 'read')

    return {
      client: {
        _id: clientData._id,
      },
      user,
      accessToken,
      jwt,
    }
  }
}

export default ServiceAuthDirect
