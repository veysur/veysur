import * as util from 'util'
import * as jwt from 'jsonwebtoken'

const sign = util.promisify(jwt.sign)
const verify = util.promisify(jwt.verify)

export class Jwt {
  static regex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/

  static async create(data, jwtConfig, expireSeconds) {
    const token: string = await sign(data, jwtConfig.key, {
      algorithm: jwtConfig.algorithm,
      expiresIn: expireSeconds,
    })
    return token
  }

  static async verify(tokenString: string, jwtConfig) {
    const jwtRaw = await verify(tokenString, jwtConfig.key, {
      algorithms: [jwtConfig.algorithm],
    })
    return jwtRaw
  }

  static parseRequest(request): string | undefined {
    const authorizationHeader = request.get('Authorization')
    // Authorization: Bearer ABC123
    const [headerAuthType] = authorizationHeader
      ? authorizationHeader.trim().split(' ')
      : [null]
    const headerAuthAccessToken = authorizationHeader
      ? authorizationHeader.substring(headerAuthType.length).trim()
      : null
    let accessTokenString = null
    if (headerAuthType == 'Bearer' && headerAuthAccessToken) {
      accessTokenString = headerAuthAccessToken
    } else if (request.query.access_token) {
      accessTokenString = request.query.access_token
    }
    return accessTokenString
  }
}
