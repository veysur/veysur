# Authentication & Authorisation

## JSON Web Token (JWT)
When a user authenticates (via password or other method), we create a JSON Web Token which contains user data encrypted by the server's private key.

- The token is passed in the `Authorization` header of subsequent requests.
- The server verifies that it created the JWT using its public key.
- Since the JWT was created by the server, we can trust its contents and directly use the user data and permission information stored inside.

### JWT Lifetime
JWT’s should be short-lived because:
- There is no way to invalidate them once created.
- They can quickly become out of sync with the server's access permission rules.

Typically, a JWT will have a lifetime of **15 to 30 minutes**.

### JWT Types in Our Application
We use different types of JWT, differentiated by a `type` property. Types are defined in `acl/util/constant.ts` (`JWT_TYPE_ADMIN`, `JWT_TYPE_PARTICIPANT`, `JWT_TYPE_PRE_AUTH`) and signed/verified via the shared `acl/util/Jwt.ts` helper.

- **Admin JWT** (`type: 'admin'`, `SchemaJwtAdmin`): main session token for logged-in users (survey admins, account users). Carries `_id`, `clientId`, `email`, `nameFirst`/`nameLast`, `project` (map of `projectId` → owner flag), `role`, `twoFactorEnabled`. Issued by `ServiceAuthDirect.createJsonWebToken` after login, 2FA verification, or refresh. Verified by the `AuthedAdmin` role assessor.
- **Participant JWT** (`type: 'participant'`, `SchemaJwtParticipant`): anonymous session token for someone taking a survey. Carries `participantId`, `sessionId`, `surveyId`, `snapshotId`, `publicationId`, `projectId`. Issued by `ServiceAuthParticipant`; verified by the `Participant` role assessor. See [auth-participant.md](auth-participant.md).
- **Pre-auth JWT** (`type: 'pre-auth'`, `SchemaJwtPreAuth`): short-lived intermediate token issued after a correct password but before 2FA is verified. Carries `_id`, `clientId`, `ip`, `userAgent`, device/build info, `requiresTwoFactorSetup`. Issued by `ServiceTwoFactor.createPreAuthJwt`; verified by the `PreAuth` role assessor, then exchanged for a full Admin JWT once 2FA succeeds.

### Non-JWT Auth Tokens
Two other token-like mechanisms exist but are **not** JWTs:
- **Long-lived access token** (see below): an opaque random string, not a signed/decodable token.
- **Email verification / password reset codes**: numeric random codes stored in `emailMeta.verify.token` / `passwordMeta.reset.token` (`ServiceVerifyEmail`, `ServicePassword`), unrelated to the JWT/access-token system.

## Access Token
Each time a user logs in (via password or other method), we generate a time-limited access token. This is returned to the client along with a JWT.

- **Purpose**: The access token is used by the client to get a new JWT when the current JWT expires.
- **Lifetime**: The access token has a much longer lifetime (**1 year**).
- **Renewal**: An access token **cannot** be used to get a new access token. Only a new full login generates a new access token.
- **Content**: Unlike the JWT, the access token has **no user data encoded** within it. We must look up the access token in the database and create a JWT from the latest associated access permissions.

## User Client
Each time a user authorises a new client, we create a client record.

- Access tokens generated via this client are stored in the client record.
- This allows us to:
  - Know which client was used to log in.
  - Allow the user to remove access for specific clients by deleting the client, along with its associated access tokens.

## Cross-Domain Authentication
Our architecture involves:
- **Account Domain**: `account.veysur.com` – used for account management (account and project management).
- **Project Domains**: `project-1.veysur.com`, `project-2.veysur.com`, etc.

### Challenge
Authentication data is stored in browser local storage, which is domain-specific. Therefore, if you authenticate on `account.veysur.com`, browsing to `project-1.veysur.com` will not show you as authenticated.

### Solution
We use `account.veysur.com` for all authentication and redirect to the desired project site, passing along the required auth data.

#### Authentication Flow
1. **Opening a project from the account domain**:
   - We pass the `UserId`, `JWT`, and `Access Token` to the project site.
   - The project site uses this data to initialise the auth state.

2. **Landing on a project site without authentication**:
   - You are redirected to the account domain to log in.
   - After logging in, you are directed back to the original project (via a new tab) along with the `UserId`, `JWT`, and `Access Token` for authentication.

### Codebase
Currently, both account and project domains share the same codebase. The React application configures available routes and menu navigation based on whether it is on a domain with the prefix `"account.veysur."`.