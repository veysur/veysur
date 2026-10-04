import { Jwt } from 'acl/util/Jwt'
import { JWT_TYPE_ADMIN } from 'acl/util/constant'

export interface RealtimeIdentity {
  userId: string
  /** Token expiry, epoch milliseconds. */
  expiresAtMs: number
  /** Projects the user administers, from the token's `project` map. */
  projectIds: string[]
}

interface JwtConfig {
  key: string
  algorithm: string
}

interface JwtAdminSchemaLike {
  validate(data: unknown): Promise<{ isValid: boolean }>
}

/** Verifies an admin JWT string (not a Request) for the realtime handshake. */
export class RealtimeAuthenticator {
  constructor(
    private readonly jwtConfig: JwtConfig,
    private readonly jwtAdminSchema: JwtAdminSchemaLike,
  ) {}

  async authenticate(token: unknown): Promise<RealtimeIdentity | null> {
    if (typeof token !== 'string' || !Jwt.regex.test(token)) {
      return null
    }
    let raw: {
      _id?: string
      type?: string
      exp?: number
      project?: Record<string, unknown>
    } | null
    try {
      raw = await Jwt.verify(token, this.jwtConfig)
    } catch {
      return null
    }
    if (!raw || raw.type !== JWT_TYPE_ADMIN || !raw._id || !raw.exp) {
      return null
    }
    const { isValid } = await this.jwtAdminSchema.validate(raw)
    if (!isValid) {
      return null
    }
    return {
      userId: raw._id,
      expiresAtMs: raw.exp * 1000,
      projectIds: Object.keys(raw.project ?? {}),
    }
  }
}
