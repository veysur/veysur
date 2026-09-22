import { Server } from 'mzen-server'

import { app as appConfig } from 'config/default'

// A JWT signing key must be a real secret, not merely "truthy". An empty or
// short key would let anyone forge admin/participant/pre-auth tokens by
// computing an HS512 signature over a known value - fail fast at startup
// rather than silently accepting requests signed/verified with a forgeable
// key. 32 bytes (64 hex chars) matches what this repo's own deploy tooling
// already generates (see deploy/scripts/config-generate.sh).
const MIN_JWT_KEY_LENGTH = 32

export function assertJwtKeyIsConfigured(key: string): void {
  if (!key || key.length < MIN_JWT_KEY_LENGTH) {
    throw new Error(
      `API_JWT_KEY must be set to a random secret of at least ${MIN_JWT_KEY_LENGTH} characters ` +
        '(e.g. via `openssl rand -hex 64`) - refusing to start with a missing or weak JWT signing key.',
    )
  }
}

export const initValidateJwtConfig = function (_server: Server) {
  assertJwtKeyIsConfigured(appConfig.jwt.key)
}

export default initValidateJwtConfig
