import { ServerAclRoleAssessor } from '@datacapy/server'
import { modelManager } from 'model-manager'

import { JWT_TYPE_ADMIN } from 'acl/util/constant'
import { Jwt } from 'acl/util/Jwt'

export class ServerAclRoleAssessorAuthedAdmin extends ServerAclRoleAssessor {
  constructor() {
    super('authedAdmin')
    this.priority = 100
  }

  async initContext(request, context, remoteObject) {
    // we must overwrite any initial context value since context is initialised from request args
    // - which could potentially be used to inject invalid ACL context
    let jwt = null
    let client
    let accessToken

    const accessTokenString = Jwt.parseRequest(request)

    if (accessTokenString) {
      if (Jwt.regex.test(accessTokenString)) {
        // jwt
        const config = remoteObject.config.server.model.app
        let jwtRaw = null
        try {
          jwtRaw = await Jwt.verify(accessTokenString, config.jwt)
        } catch (e) {
          // JWT verify failure should not
          // - prevent the request from completing
          // Todo: add server logging
          modelManager.logger.warn('JWT verification exception:', e)
        }
        if (jwtRaw && jwtRaw.type == JWT_TYPE_ADMIN) {
          const { isValid, errors } = await modelManager
            .getSchema('jwtAdmin')
            .validate(jwtRaw)
          if (isValid) {
            jwt = modelManager.getSchema('jwtAdmin').applyTransients(jwtRaw)
          } else {
            modelManager.logger.warn('Invalid JWT:' + JSON.stringify(errors))
            return
          }
        }
        context.jwt = jwt
        context.clientId = jwt?.clientId
      } else {
        client = await this.repos.userClient.findOne({
          _id: request.get('Client-Id'),
        })
        if (client) {
          if (client && client.accessToken) {
            accessToken = client.accessToken.find(
              (t) => t.token === accessTokenString,
            )
            if (accessToken && accessToken.isExpired()) {
              accessToken = null
            }
            context.accessToken = accessToken
            context.client = client
          }
        }
      }
    }
  }

  async hasRole({ jwt, client, accessToken }) {
    return (
      (!!jwt && !!jwt._id && jwt.type == JWT_TYPE_ADMIN) ||
      (!!client && !!accessToken)
    )
  }
}

export default ServerAclRoleAssessorAuthedAdmin
