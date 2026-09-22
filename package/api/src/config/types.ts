
export interface RateLimitRule {
  /** Regex pattern string matched against req.path (case-insensitive). */
  pattern: string
  /**
   * Short key used in the Redis counter (e.g. 'auth').
   * Defaults to 'r{index}' when omitted.
   */
  tierKey?: string
  /** When true, matching paths are excluded from rate limiting entirely. */
  skip?: boolean
  /** Max requests per window. Required when skip is not set. */
  limit?: number
  /** Window duration in seconds. Required when skip is not set. */
  windowSeconds?: number
}

/**
 * Veysur App Configuration
 * This defines the structure of the app property within the model configuration
 */
export interface AppConfig {
  /** Deployment mode, read via DEPLOYMENT_MODE. */
  edition: 'self-hosted' | 'cloud'
  brandName: string
  companyName: string
  webDomain: string
  accountDomain: string
  accountBasePath: string
  platformDomain: string
  platformBasePath: string
  envType: string
  exposeErrorDetails: boolean
  jwt: {
    key: string
    algorithm: string
    participantLifetimeSeconds: number
    adminLifetimeSeconds: number
    accessTokenTtlSeconds: number
    preAuthTtlSeconds: number
  }
  bcryptSaltRounds: number
  passwordResetTokenTtlSeconds: number
  emailVerifyTokenTtlSeconds: number
  upload: {
    maxFileSize: number
  }
  pagination: {
    maxPerPage: number
  }
  mail: {
    logOnly: boolean
    sendOptions: {
      from: string | { name: string; email: string }
    }
    transport: {
      type: string
      smtp: {
        host: string
        port: string | number
        secure: boolean
        auth: {
          user: string
          pass: string
        }
      }
      sendmail: {
        sendmail: boolean
        newline: string
        path: string
      }
    }
    queue: {
      processBatchSize: number
    }
  }
  sms: {
    logOnly: boolean
  }
  userNetwork: {
    facebook: {
      appId: string
      appSecret: string
      timeout: number
    }
  }
  aws: {
    region: string
    s3: {
      bucket: string
      bucketSecure: string
    }
  }
  s3: {
    type: string // 'local' | 's3'
    region: string
    publicBucket: string
    privateBucket: string
    accessKeyId: string
    secretAccessKey: string
    publicBaseUrl: string
    uploadSecret: string // HMAC secret for upload tokens
    localPath: string // filesystem path for local mode
    maxUploadSize: number
    endpoint?: string
    forcePathStyle?: boolean
  }
  tmpDir?: string // Base directory for temporary files (defaults to os.tmpdir())
  google: {
    firebase: {
      enable: boolean
    }
  }
  asset: {
    dir: string
    html: Record<string, unknown>
  }
  cors: {
    /** Base domains (without scheme) that may make cross-origin requests.
     *  Subdomains are allowed automatically. Set via API_CORS_ALLOWED_DOMAINS (comma-separated). */
    allowedDomains: string[]
  }
  rateLimit: {
    enabled: boolean
    /** Ordered rules — first match wins. */
    rules: RateLimitRule[]
    /** Applied to paths not matched by any rule. */
    default: {
      limit: number
      windowSeconds: number
    }
  }
}

/**
 * Veysur Model Configuration
 * This defines the model property structure with our app configuration
 */
export interface ModelConfig {
  dataSources?: Array<{
    name?: string
    type?: string
    config?: Record<string, unknown>
  }>
  /** Dynamic (per-project) datasource registry — absent in self-hosted. */
  dynamicDataSource?: {
    enable: boolean
    registry: { maxSize: number; idleTimeout: number }
  }
  app?: AppConfig
  [key: string]: unknown
}

/**
 * Veysur Service Configuration
 * This is what Service classes receive in their this.config
 */
export interface ServiceConfig {
  model?: ModelConfig
  name?: string
  repos?: Record<string, unknown>
  services?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * Veysur Server Configuration
 * This is the full server configuration including path and port
 */
export interface ServerConfig {
  path: string
  port: number
  model: ModelConfig
  [key: string]: unknown
}
