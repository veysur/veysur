/**
 * Fixed placeholder written to every timestamp field on a response to an
 * anonymous survey, so no real time is recorded that could be correlated with
 * an external record of when a participant took the survey. Deliberately not
 * the Unix epoch or the MySQL zero date, both of which usually signal a
 * timestamp-processing bug rather than an intentional value.
 */
export const ANONYMISED_TIMESTAMP_ISO = '1971-01-01T00:00:01.000Z'

const ANONYMISED_TIMESTAMP_MS = Date.parse(ANONYMISED_TIMESTAMP_ISO)

/**
 * Fresh Date instance set to the anonymised-timestamp sentinel. Returns a new
 * object each call so no mutable Date is shared between call sites.
 */
export const anonymisedTimestamp = (): Date =>
  new Date(ANONYMISED_TIMESTAMP_ISO)

/** True when a date value is the anonymised-timestamp sentinel. */
export const isAnonymisedTimestamp = (
  value: Date | string | number | null | undefined,
): boolean =>
  value != null && new Date(value).getTime() === ANONYMISED_TIMESTAMP_MS

/**
 * User role constants
 */
export const USER_ROLE_CUSTOMER = 'customer'
export const USER_ROLE_PLATFORM_ADMIN = 'platformAdmin'

// The attachment file-validation limits below stay here.

/**
 * S3 file storage constants
 */
export const S3_DEFAULT_BUCKET = 'veysur-files'

/**
 * S3 private bucket for sensitive files (imports/exports)
 */
export const S3_PRIVATE_BUCKET = 'veysur-private'

/**
 * S3 bucket name prefix requirement for nginx proxy compatibility
 * All custom bucket names must start with this prefix
 */
export const S3_BUCKET_PREFIX = 'veysur-files'

/**
 * Maximum size for a support ticket attachment (50MB)
 */
export const SUPPORT_TICKET_ATTACHMENT_MAX_SIZE = 52428800

/**
 * Maximum number of attachments allowed on a single support ticket message
 */
export const SUPPORT_TICKET_MAX_ATTACHMENTS_PER_MESSAGE = 5

/**
 * File extensions allowed for support ticket attachments
 */
export const SUPPORT_TICKET_ATTACHMENT_ALLOWED_EXTENSIONS = [
  '.zip',
  '.tar.gz',
  '.jpg',
  '.jpeg',
  '.png',
  '.vsst',
  '.vssa',
  '.vssp',
  '.json',
  '.csv',
]

/**
 * MIME types allowed for support ticket attachments
 * .vsst/.vssa/.vssp survey export formats and .csv are uploaded as application/octet-stream
 * or text/csv depending on the browser, so both are accepted
 */
export const SUPPORT_TICKET_ATTACHMENT_ALLOWED_MIME_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'application/gzip',
  'application/x-gzip',
  'application/x-tar',
  'image/jpeg',
  'image/png',
  'application/json',
  'text/csv',
  'application/vnd.ms-excel',
  'application/octet-stream',
]
