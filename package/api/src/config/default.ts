const dirname = __dirname ? __dirname : ''
const env: NodeJS.ProcessEnv = process && process.env ? process.env : {}

import { S3_DEFAULT_BUCKET, S3_PRIVATE_BUCKET } from 'veysur-common'
import { setDomainSubdomain } from '../common/domainUtils'
import { getEdition, isSelfHosted } from './edition'
import { ServerConfig } from './types'

const {
  API_BRAND_NAME,
  API_COMPANY_NAME,
  // webDomain
  // - with subdomain e.g `www` which may be replaced with
  // - `account` or `platform` where needed
  API_WEB_DOMAIN,
  // accountDomain override — defaults to a subdomain swap of webDomain, or
  // webDomain itself (same origin) in self-hosted
  API_ACCOUNT_DOMAIN,
  // accountBasePath override — path prefix for account app links (password reset,
  // email verify, team invite). Defaults to '' outside self-hosted, '/account' in self-hosted,
  // matching the frontend's PUBLIC_BASE_ACCOUNT basename convention
  API_BASE_ACCOUNT,
  // platformDomain / platformBasePath overrides — mirrors accountDomain/
  // accountBasePath above, for links added by an extension
  API_PLATFORM_DOMAIN,
  API_BASE_PLATFORM,
  API_SERVER_PORT,
  // Static, config-sourced Project (self-hosted is single-project — see
  // model/service/ServiceProject.ts)
  API_PROJECT_NAME,
  API_PROJECT_TIMEZONE,
  API_PROJECT_OWNER_ID,
  // JWT
  API_JWT_KEY,
  API_JWT_PARTICIPANT_LIFETIME_SECONDS,
  API_JWT_ADMIN_LIFETIME_SECONDS,
  API_JWT_ACCESS_TOKEN_TTL_SECONDS,
  API_JWT_PRE_AUTH_TTL_SECONDS,
  // Bcrypt
  API_BCRYPT_SALT_ROUNDS,
  // Token TTLs
  API_PASSWORD_RESET_TOKEN_TTL_SECONDS,
  API_EMAIL_VERIFY_TOKEN_TTL_SECONDS,
  // Limits
  API_UPLOAD_MAX_FILE_SIZE,
  API_PAGINATION_MAX_PER_PAGE,
  // Email
  API_MAIL_ADDRESS_FROM,
  API_MAIL_FROM_NAME,
  API_MAIL_ADDRESS_CONTACT,
  API_MAIL_TRANSPORT_TYPE,
  API_MAIL_HOST,
  API_MAIL_PORT,
  API_MAIL_SECURE,
  API_MAIL_AUTH_USER,
  API_MAIL_AUTH_PASS,
  API_MAIL_BOUNCE_DOMAIN,
  // IMAP (bounce/FBL mailboxes)
  API_MAIL_IMAP_HOST,
  API_MAIL_IMAP_PORT,
  API_MAIL_IMAP_BOUNCE_USER,
  API_MAIL_IMAP_BOUNCE_PASS,
  API_MAIL_IMAP_ABUSE_USER,
  API_MAIL_IMAP_ABUSE_PASS,
  API_MAIL_IMAP_CA_CERT,
  // IMAP (deliverability canary mailbox)
  API_MAIL_IMAP_CANARY_USER,
  API_MAIL_IMAP_CANARY_PASS,
  API_MAIL_CANARY_TO,
  API_MAIL_CANARY_TIMEOUT_SECONDS,
  API_MAIL_CANARY_POLL_INTERVAL_SECONDS,
  // Email suppression expiry
  API_EMAIL_SUPPRESSION_HARD_BOUNCE_EXPIRY_DAYS,
  API_EMAIL_SUPPRESSION_SOFT_BOUNCE_EXPIRY_DAYS,
  // Bulk mail queue pacing (see docs/mail-queue-pacing.md)
  API_MAIL_QUEUE_PROCESS_BATCH_SIZE,
  // Sendmail (fallback transport)
  API_MAIL_SENDMAIL_PATH,
  API_MAIL_SENDMAIL_NEWLINE,
  // SMS
  API_SMS_LOG_ONLY,
  // Facebook
  API_FACEBOOK_APP_ID,
  API_FACEBOOK_APP_SECRET,
  // AWS
  API_AWS_REGION,
  API_AWS_S3_BUCKET,
  API_AWS_S3_BUCKET_SECURE,
  // Temp directory
  API_TMPDIR,
  // S3 Storage Configuration
  API_S3_TYPE,
  API_S3_REGION,
  API_S3_BUCKET,
  API_S3_PUBLIC_BUCKET,
  API_S3_PRIVATE_BUCKET,
  API_S3_ACCESS_KEY_ID,
  API_S3_SECRET_ACCESS_KEY,
  API_S3_PUBLIC_BASE_URL,
  API_S3_LOCAL_SECRET,
  API_S3_LOCAL_PATH,
  API_S3_MAX_UPLOAD_SIZE,
  API_S3_ENDPOINT,
  API_S3_FORCE_PATH_STYLE,
  // CORS
  API_CORS_ALLOWED_DOMAINS,
  // Google
  API_GOOGLE_FIREBASE_ENABLE,
  // MySQL
  MYSQL_HOST,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_ENSURE_DATABASE,
  // Redis
  REDIS_ENABLED,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  // Encryption
  API_ENCRYPTION_PUBLIC_KEY,
  API_ENCRYPTION_PRIVATE_KEY,
  API_ENCRYPTION_PRIVATE_KEY_PASSWORD,
  // Rate Limiting
  RATE_LIMIT_ENABLED,
  RATE_LIMIT_AUTH_REFRESH_LIMIT,
  RATE_LIMIT_AUTH_REFRESH_WINDOW_SECONDS,
  RATE_LIMIT_AUTH_LIMIT,
  RATE_LIMIT_AUTH_WINDOW_SECONDS,
  RATE_LIMIT_GEO_COUNTRY_LIMIT,
  RATE_LIMIT_GEO_COUNTRY_WINDOW_SECONDS,
  RATE_LIMIT_GENERAL_LIMIT,
  RATE_LIMIT_GENERAL_WINDOW_SECONDS,
  // Event Log
  MEMORY_FLUSH_INTERVAL_MS,
  MEMORY_BATCH_SIZE,
  REDIS_FLUSH_INTERVAL_MS,
  REDIS_BATCH_SIZE,
  MAX_MEMORY_BUFFER_SIZE_PER_PROJECT,
  REDIS_BACKUP_TTL_SECONDS,
  MAX_RETRIES_BEFORE_DLQ,
  GLOBAL_MAX_EVENTS,
  MAX_BACKLOG_QUEUE_SIZE,
  MEMORY_WARNING_THRESHOLD,
} = env

const webDomain = API_WEB_DOMAIN ? API_WEB_DOMAIN : 'www.mydomain.com'

export const app = {
  // Deployment mode, read via DEPLOYMENT_MODE. Exposed here for discoverability.
  edition: getEdition(),
  brandName: API_BRAND_NAME ? API_BRAND_NAME : 'VeySur',
  companyName: API_COMPANY_NAME ? API_COMPANY_NAME : 'MyCompany',
  webDomain,
  accountDomain:
    API_ACCOUNT_DOMAIN ||
    (isSelfHosted() ? webDomain : setDomainSubdomain(webDomain, 'account')),
  accountBasePath: API_BASE_ACCOUNT ?? (isSelfHosted() ? '/account' : ''),
  platformDomain:
    API_PLATFORM_DOMAIN ||
    (isSelfHosted() ? webDomain : setDomainSubdomain(webDomain, 'platform')),
  platformBasePath: API_BASE_PLATFORM ?? (isSelfHosted() ? '/platform' : ''),
  project: {
    name: API_PROJECT_NAME ? API_PROJECT_NAME : 'My Project',
    timezone: API_PROJECT_TIMEZONE ? API_PROJECT_TIMEZONE : 'Etc/UTC',
    ownerId: API_PROJECT_OWNER_ID ? API_PROJECT_OWNER_ID : '',
  },
  envType: 'development', // development, test or production
  jwt: {
    key: API_JWT_KEY ? API_JWT_KEY : '',
    algorithm: 'HS512',
    participantLifetimeSeconds: API_JWT_PARTICIPANT_LIFETIME_SECONDS
      ? Number(API_JWT_PARTICIPANT_LIFETIME_SECONDS)
      : 60 * 60 * 3, // 3 hours
    adminLifetimeSeconds: API_JWT_ADMIN_LIFETIME_SECONDS
      ? Number(API_JWT_ADMIN_LIFETIME_SECONDS)
      : 60 * 10, // 10 minutes
    accessTokenTtlSeconds: API_JWT_ACCESS_TOKEN_TTL_SECONDS
      ? Number(API_JWT_ACCESS_TOKEN_TTL_SECONDS)
      : 86400 * 180, // 180 days
    preAuthTtlSeconds: API_JWT_PRE_AUTH_TTL_SECONDS
      ? Number(API_JWT_PRE_AUTH_TTL_SECONDS)
      : 300, // 5 minutes
  },
  bcryptSaltRounds: API_BCRYPT_SALT_ROUNDS
    ? Number(API_BCRYPT_SALT_ROUNDS)
    : 12,
  passwordResetTokenTtlSeconds: API_PASSWORD_RESET_TOKEN_TTL_SECONDS
    ? Number(API_PASSWORD_RESET_TOKEN_TTL_SECONDS)
    : 5400, // 1.5 hours
  emailVerifyTokenTtlSeconds: API_EMAIL_VERIFY_TOKEN_TTL_SECONDS
    ? Number(API_EMAIL_VERIFY_TOKEN_TTL_SECONDS)
    : 172800, // 48 hours
  emailSuppression: {
    hardBounceExpiryDays: API_EMAIL_SUPPRESSION_HARD_BOUNCE_EXPIRY_DAYS
      ? Number(API_EMAIL_SUPPRESSION_HARD_BOUNCE_EXPIRY_DAYS)
      : 30,
    softBounceExpiryDays: API_EMAIL_SUPPRESSION_SOFT_BOUNCE_EXPIRY_DAYS
      ? Number(API_EMAIL_SUPPRESSION_SOFT_BOUNCE_EXPIRY_DAYS)
      : 2, // 48 hours
  },
  upload: {
    maxFileSize: API_UPLOAD_MAX_FILE_SIZE
      ? Number(API_UPLOAD_MAX_FILE_SIZE)
      : 100 * 1024 * 1024, // 100MB
  },
  pagination: {
    maxPerPage: API_PAGINATION_MAX_PER_PAGE
      ? Number(API_PAGINATION_MAX_PER_PAGE)
      : 100,
  },
  mail: {
    logOnly: false,
    sendOptions: {
      from: (() => {
        const email = API_MAIL_ADDRESS_FROM ?? 'support@mycompany.com'
        return API_MAIL_FROM_NAME ? { name: API_MAIL_FROM_NAME, email } : email
      })(),
    },
    contactAddress:
      API_MAIL_ADDRESS_CONTACT ?? API_MAIL_ADDRESS_FROM ?? 'hello@veysur.com',
    bounceAddress: API_MAIL_BOUNCE_DOMAIN || null,
    imap: {
      host: API_MAIL_IMAP_HOST || null,
      port: API_MAIL_IMAP_PORT ? Number(API_MAIL_IMAP_PORT) : 993,
      bounce: {
        user: API_MAIL_IMAP_BOUNCE_USER || null,
        pass: API_MAIL_IMAP_BOUNCE_PASS || null,
      },
      abuse: {
        user: API_MAIL_IMAP_ABUSE_USER || null,
        pass: API_MAIL_IMAP_ABUSE_PASS || null,
      },
      caCert: API_MAIL_IMAP_CA_CERT || null,
    },
    canary: {
      to: API_MAIL_CANARY_TO || null,
      user: API_MAIL_IMAP_CANARY_USER || null,
      pass: API_MAIL_IMAP_CANARY_PASS || null,
      timeoutSeconds: API_MAIL_CANARY_TIMEOUT_SECONDS
        ? Number(API_MAIL_CANARY_TIMEOUT_SECONDS)
        : 180,
      pollIntervalSeconds: API_MAIL_CANARY_POLL_INTERVAL_SECONDS
        ? Number(API_MAIL_CANARY_POLL_INTERVAL_SECONDS)
        : 10,
    },
    transport: {
      type: API_MAIL_TRANSPORT_TYPE ? API_MAIL_TRANSPORT_TYPE : 'smtp',
      smtp: {
        host: API_MAIL_HOST ? API_MAIL_HOST : 'smtp.mycompany.com',
        port: API_MAIL_PORT ? API_MAIL_PORT : 587,
        secure: API_MAIL_SECURE ? API_MAIL_SECURE == 'true' : false,
        auth: {
          user: API_MAIL_AUTH_USER ? API_MAIL_AUTH_USER : 'none',
          pass: API_MAIL_AUTH_PASS ? API_MAIL_AUTH_PASS : 'invalid',
        },
        connectionTimeout: 10000,
        socketTimeout: 10000,
      },
      sendmail: {
        sendmail: false,
        newline: API_MAIL_SENDMAIL_NEWLINE ?? 'unix',
        path: API_MAIL_SENDMAIL_PATH ?? '/usr/sbin/sendmail',
      },
    },
    queue: {
      processBatchSize: API_MAIL_QUEUE_PROCESS_BATCH_SIZE
        ? Number(API_MAIL_QUEUE_PROCESS_BATCH_SIZE)
        : 200,
    },
  },
  sms: {
    logOnly: API_SMS_LOG_ONLY ? API_SMS_LOG_ONLY == 'true' : true,
  },
  userNetwork: {
    facebook: {
      appId: API_FACEBOOK_APP_ID ? API_FACEBOOK_APP_ID : '',
      appSecret: API_FACEBOOK_APP_SECRET ? API_FACEBOOK_APP_SECRET : '',
      timeout: 5000,
    },
  },
  aws: {
    region: API_AWS_REGION ? API_AWS_REGION : 'eu-west-1', // EU (Ireland)
    s3: {
      bucket: API_AWS_S3_BUCKET ? API_AWS_S3_BUCKET : 's3bucket',
      bucketSecure: API_AWS_S3_BUCKET_SECURE
        ? API_AWS_S3_BUCKET_SECURE
        : 's3bucketsecure',
    },
  },
  tmpDir: API_TMPDIR || undefined,
  s3: {
    type: API_S3_TYPE || 's3',
    region: API_S3_REGION || 'us-east-1',
    publicBucket: API_S3_PUBLIC_BUCKET || API_S3_BUCKET || S3_DEFAULT_BUCKET,
    privateBucket: API_S3_PRIVATE_BUCKET || S3_PRIVATE_BUCKET,
    accessKeyId: API_S3_ACCESS_KEY_ID || '',
    secretAccessKey: API_S3_SECRET_ACCESS_KEY || '',
    publicBaseUrl: API_S3_PUBLIC_BASE_URL || '',
    uploadSecret: API_S3_LOCAL_SECRET || '',
    localPath: API_S3_LOCAL_PATH || '/data/files',
    maxUploadSize: API_S3_MAX_UPLOAD_SIZE
      ? Number(API_S3_MAX_UPLOAD_SIZE)
      : 50 * 1024 * 1024, // 50 MB default
    endpoint: API_S3_ENDPOINT || undefined,
    forcePathStyle: API_S3_FORCE_PATH_STYLE === 'true',
  },
  google: {
    firebase: {
      enable: API_GOOGLE_FIREBASE_ENABLE
        ? API_GOOGLE_FIREBASE_ENABLE == 'true'
        : false,
    },
  },
  cors: {
    allowedDomains: API_CORS_ALLOWED_DOMAINS
      ? API_CORS_ALLOWED_DOMAINS.split(',')
          .map((d: string) => d.trim())
          .filter(Boolean)
      : [],
  },
  taskManager: {
    maxConcurrency: 5, // Max concurrent task manager instances
  },
  asset: {
    dir: dirname + '/../model/asset/',
    html: {},
  },
  rateLimit: {
    enabled: RATE_LIMIT_ENABLED !== 'false',
    rules: [
      // Auth refresh — fires before every authenticated request; low risk,
      // legitimately high volume (multi-tab, long sessions, retry backoff).
      // Short window so a burst clears quickly rather than locking a user
      // out for a full 15 minutes.
      {
        pattern: '^/auth/refresh$',
        tierKey: 'auth-refresh',
        limit: Number(RATE_LIMIT_AUTH_REFRESH_LIMIT ?? 40),
        windowSeconds: Number(RATE_LIMIT_AUTH_REFRESH_WINDOW_SECONDS ?? 300), // 5 minutes
      },
      // Login / signup — brute-force sensitive endpoints
      {
        pattern: '^/(auth-email-password|signup)/',
        tierKey: 'auth',
        limit: Number(RATE_LIMIT_AUTH_LIMIT ?? 30),
        windowSeconds: Number(RATE_LIMIT_AUTH_WINDOW_SECONDS ?? 900), // 15 minutes
      },
      // Geo country
      {
        pattern: '^/geo/detect-country$',
        tierKey: 'geo-country',
        limit: Number(RATE_LIMIT_GEO_COUNTRY_LIMIT ?? 30),
        windowSeconds: Number(RATE_LIMIT_GEO_COUNTRY_WINDOW_SECONDS ?? 3600), // 1 hour
      },
    ],
    default: {
      limit: Number(RATE_LIMIT_GENERAL_LIMIT ?? 300),
      windowSeconds: Number(RATE_LIMIT_GENERAL_WINDOW_SECONDS ?? 60), // 1 minute
    },
  },
  eventLog: {
    memoryFlushIntervalMs: Number(MEMORY_FLUSH_INTERVAL_MS || 1000),
    memoryBatchSize: Number(MEMORY_BATCH_SIZE || 50),
    redisFlushIntervalMs: Number(REDIS_FLUSH_INTERVAL_MS || 5000),
    redisBatchSize: Number(REDIS_BATCH_SIZE || 200),
    maxMemoryBufferSizePerProject: Number(
      MAX_MEMORY_BUFFER_SIZE_PER_PROJECT || 100,
    ),
    redisBackupTtlSeconds: Number(REDIS_BACKUP_TTL_SECONDS || 86400),
    maxRetriesBeforeDlq: Number(MAX_RETRIES_BEFORE_DLQ || 5),
    globalMaxEvents: Number(GLOBAL_MAX_EVENTS || 10000),
    maxBacklogQueueSize: Number(MAX_BACKLOG_QUEUE_SIZE || 500),
    memoryWarningThreshold: Number(MEMORY_WARNING_THRESHOLD || 0.7),
  },
}

const mysqlAccountConfig = {
  host: MYSQL_HOST,
  user: MYSQL_USER,
  database: MYSQL_DATABASE,
  password: MYSQL_PASSWORD,
  ensureDatabase: MYSQL_ENSURE_DATABASE === 'true',
}

const cacheDbDataSource =
  REDIS_ENABLED !== 'false' && REDIS_HOST && REDIS_PORT
    ? [
        {
          name: 'cacheDb',
          type: 'redis',
          config: {
            host: REDIS_HOST,
            port: parseInt(REDIS_PORT, 10),
            password: REDIS_PASSWORD,
            db: 0,
            keyPrefix: 'vs:',
            trackIds: false,
          },
        },
      ]
    : []

/**
 * WS6 — the self-hosted deployment is one database, initialised at install time by
 * `pnpm migrate`. There is no `'project'` datasource at all — self-hosted has no
 * `RepoProject` (the single project is a static config value, see
 * `model/service/ServiceProject.ts`), no `type: 'dynamic'` entry, no
 * `dynamicDataSource` registry, and no `ipLocation` datasource. An extension can add all
 * of these back (database-per-project) via `composeModel()`'s
 * `extraDataSources`/`dynamicDataSource` composition fields (see `composeModel.ts`),
 * alongside the `extraRepos`/`extraInit` that register its own `RepoProject` plus
 * the lookup + ip-lookup steps.
 */
const dataSources = [
  { name: 'account', type: 'mysql', config: mysqlAccountConfig },
  ...cacheDbDataSource,
]

export const server: ServerConfig = {
  path: '/api',
  port: API_SERVER_PORT ? Number(API_SERVER_PORT) : 3838,
  model: {
    dataSources,
    app,
  },
}

export const encryption = {
  publicKey: API_ENCRYPTION_PUBLIC_KEY || '',
  privateKey: API_ENCRYPTION_PRIVATE_KEY || '',
  privateKeyPassword: API_ENCRYPTION_PRIVATE_KEY_PASSWORD || '',
}

export default server
