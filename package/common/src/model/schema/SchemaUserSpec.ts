import { SchemaSpec, sb } from 'mzen-schema'

export const specVerifyStatus: SchemaSpec = {
  isVerified: sb.boolean().required().default(false),
  isVerifiedAt: sb.date().required().default(null),
}

export const specMetaHistory: SchemaSpec = {
  history: sb
    .array()
    .private()
    .of(
      sb.object({
        prevValue: sb.string().required().trim(),
        verifyStatus: specVerifyStatus,
        clientId: sb.string().required().trim().privateValue(),
        createdAt: sb.date().default('now'),
      }),
    ),
}

export const specVerifyTokenArray: SchemaSpec = sb
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
  .build()

export const specMetaVerify: SchemaSpec = {
  verify: {
    status: specVerifyStatus,
    token: specVerifyTokenArray,
  },
}

export const specMetaHistoryVerifiable: SchemaSpec = {
  ...specMetaVerify,
  ...specMetaHistory,
}
