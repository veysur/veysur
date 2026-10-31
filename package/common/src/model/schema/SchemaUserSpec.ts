import { SchemaBuilder as sb } from '@datacapy/schema'

export const verifyStatusShape = {
  isVerified: sb.boolean().required().default(false),
  isVerifiedAt: sb.date().required().default(null),
}

export const metaHistoryShape = {
  history: sb
    .array()
    .private()
    .of(
      sb.object({
        prevValue: sb.string().required().trim(),
        verifyStatus: sb.object(verifyStatusShape),
        clientId: sb.string().required().trim().privateValue(),
        createdAt: sb.date().default('now'),
      }),
    ),
}

export const verifyTokenArray = sb
  .array()
  .construct('Collection')
  .of(
    sb.object({
      token: sb.string().privateValue(),
      ttl: sb.number(),
      createdAt: sb.date(),
      expiresAt: sb.date(),
      failCount: sb.number(),
    }),
  )

export const metaVerifyShape = {
  verify: sb.object({
    status: sb.object(verifyStatusShape),
    token: verifyTokenArray,
  }),
}

export const metaHistoryVerifiableShape = {
  ...metaVerifyShape,
  ...metaHistoryShape,
}
