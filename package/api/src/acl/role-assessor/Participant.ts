import { ServerAclRoleAssessor } from 'mzen-server'
import { modelManager } from 'model-manager'

import { JWT_TYPE_PARTICIPANT } from 'acl/util/constant'
import { Jwt } from 'acl/util/Jwt'

export class ServerAclRoleAssessorParticipant extends ServerAclRoleAssessor {
  constructor() {
    super('participant')
  }

  async hasRole({ jwt }) {
    if (
      !jwt ||
      jwt?.type !== JWT_TYPE_PARTICIPANT ||
      !jwt?.surveyId ||
      !jwt?.snapshotId ||
      !jwt?.publicationId ||
      !jwt?.projectId ||
      (!jwt?.participantId && !jwt?.sessionId)
    ) {
      return false
    }
    return {
      surveyId: jwt.surveyId,
      projectId: jwt.projectId,
    }
  }

  async initContext(request, context, remoteObject) {
    let jwt
    const accessTokenString = Jwt.parseRequest(request)

    if (accessTokenString) {
      if (Jwt.regex.test(accessTokenString)) {
        // jwt
        const config = remoteObject.config.server.model.app
        let jwtRaw
        try {
          jwtRaw = await Jwt.verify(accessTokenString, config.jwt)
          if (jwtRaw && jwtRaw.type === JWT_TYPE_PARTICIPANT) {
            const schema = modelManager.getSchema('jwtParticipant')
            const { isValid, errors } = await schema.validate(jwtRaw)
            if (isValid) {
              jwt = schema.applyTransients(jwtRaw)
            } else {
              modelManager.logger.warn('Invalid JWT:' + JSON.stringify(errors))
              return
            }
            if (!jwt.participantId && !jwt.sessionId) {
              modelManager.logger.warn(
                'Participant JWT must have an _id or a sessionId',
              )
              return
            }
            context.jwt = jwt
            context.participantId = jwt.participantId || null
            context.sessionId = jwt.sessionId || null
            context.snapshotId = jwt.snapshotId
            context.publicationId = jwt.publicationId
            context.surveyId = jwt.surveyId
            context.projectId = jwt.projectId
          }
        } catch (e) {
          // JWT verify failure should not
          // - prevent the request from completing
          // Todo: add server logging
          modelManager.logger.warn('JWT verification exception:', e)
        }
      }
    }
  }
}

export default ServerAclRoleAssessorParticipant
