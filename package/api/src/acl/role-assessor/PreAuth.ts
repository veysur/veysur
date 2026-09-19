import { ServerAclRoleAssessor } from 'mzen-server'
import { modelManager } from 'model-manager'

import { JWT_TYPE_PRE_AUTH } from 'acl/util/constant'
import { Jwt } from 'acl/util/Jwt'

export class ServerAclRoleAssessorPreAuth extends ServerAclRoleAssessor {
  constructor() {
    super('preAuth')
    this.priority = 95
  }

  async initContext(request, context, remoteObject) {
    const accessTokenString = Jwt.parseRequest(request)
    if (!accessTokenString || !Jwt.regex.test(accessTokenString)) return

    const config = remoteObject.config.server.model.app
    let jwtRaw
    try {
      jwtRaw = await Jwt.verify(accessTokenString, config.jwt)
    } catch (e) {
      modelManager.logger.warn('PreAuth JWT verification exception:', e)
      return
    }

    if (jwtRaw && jwtRaw.type === JWT_TYPE_PRE_AUTH) {
      const { isValid, errors } = await modelManager
        .getSchema('jwtPreAuth')
        .validate(jwtRaw)
      if (isValid) {
        const jwtParsed = modelManager
          .getSchema('jwtPreAuth')
          .applyTransients(jwtRaw)
        context.jwt = jwtParsed
        context.clientId = jwtParsed?.clientId
      } else {
        modelManager.logger.warn(
          'Invalid pre-auth JWT: ' + JSON.stringify(errors),
        )
      }
    }
  }

  async hasRole({ jwt }) {
    return !!jwt && !!jwt._id && jwt.type === JWT_TYPE_PRE_AUTH
  }
}

export default ServerAclRoleAssessorPreAuth
