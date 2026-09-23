// cspell:ignore JDOC msword wordprocessingml spreadsheetml presentationml

export const SCHEMA_LENGTH_MAX_INPUT = 255
// A survey element's `text` L10n value per language. Covers a question prompt
// and a content element's body (`kind: 'content'`), so it is well above the
// generic input cap while still bounded.
export const SCHEMA_LENGTH_MAX_ELEMENT_TEXT = 5000
// Internal ids are genUniqueId()/randomSessionId() output: base62, <=17 chars.
// Matches mzen-om's CHAR(17) generated-column sizing (JDOC_ID_SIZE) for *Id
// fields, so validation fails a bad id before the INSERT does.
export const SCHEMA_LENGTH_MAX_INTERNAL_ID = 17

// Third-party ids stored in fields that carry an explicit
// index typeHint (VARCHAR(255) column, not the CHAR(17) default).
export const SCHEMA_LENGTH_MAX_EXTERNAL_ID = 64
export const SCHEMA_LENGTH_MAX_LANG = 2
export const SCHEMA_LENGTH_MAX_TEXT = 100000
export const SCHEMA_LENGTH_MAX_ENTITY_NAME = 255
export const SCHEMA_LENGTH_MAX_PARTICIPANT_ATTRIBUTE_VALUE = 256
export const SCHEMA_LENGTH_MAX_ATTRIBUTE_NAME = 64

/**
 * Pattern for validating entity codes (questions, groups, answer options)
 * - Must start with a letter (upper or lower case)
 * - Can contain letters, digits, and underscores
 * - Used for schema validation and condition parsing
 */
export const ENTITY_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/

/**
 * Pattern for extracting question code references (answers.Q001) from conditions.
 * Requires the `answers.` container root. Global flag for use with matchAll().
 */
export const ENTITY_CODE_IDENTIFIER_PATTERN =
  /\banswers\.([A-Za-z][A-Za-z0-9_]*)\b/g

/**
 * Pattern for extracting answer option references with dot notation
 * (answers.Q001.A002) from conditions. Requires the `answers.` container root.
 * Global flag for use with matchAll()
 */
export const ENTITY_CODE_ANSWER_OPTION_DOT_PATTERN =
  /\banswers\.([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z][A-Za-z0-9_]*)\b/g

/**
 * Pattern for extracting matrix cell references (answers.Q001.S001.A001) from
 * conditions. Requires the `answers.` container root. Must be matched before
 * ENTITY_CODE_ANSWER_OPTION_DOT_PATTERN to prevent partial matches.
 * Global flag for use with matchAll()
 */
export const ENTITY_CODE_MATRIX_CELL_PATTERN =
  /\banswers\.([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z][A-Za-z0-9_]*)\b/g

/**
 * Pattern for extracting participant variable references (participant.email)
 * from conditions. Requires the `participant.` container root.
 * Global flag for use with matchAll()
 */
export const ENTITY_CODE_PARTICIPANT_PATTERN =
  /\bparticipant\.([A-Za-z][A-Za-z0-9_]*)\b/g

/**
 * Pattern for extracting response-metadata references (response.language)
 * from conditions. Requires the `response.` container root - deliberately
 * separate from `answers.` (question-code-keyed answers) so a question can
 * never be coded the same as a metadata field and collide with it.
 * Global flag for use with matchAll()
 */
export const ENTITY_CODE_RESPONSE_PATTERN =
  /\bresponse\.([A-Za-z][A-Za-z0-9_]*)\b/g

/**
 * Pattern for extracting bare (unprefixed) identifiers from a condition once
 * answers./participant. references have been replaced with placeholders.
 * What remains is either an answer-option-code literal (e.g. A001) or a JS
 * keyword/built-in. Global flag for use with matchAll()
 */
export const ENTITY_CODE_BARE_IDENTIFIER_PATTERN =
  /\b([A-Za-z][A-Za-z0-9_]*)\b/g

/**
 * Every MIME type an uploaded file is allowed to declare. Enforced server-side
 * (client-side `accept`/type checks are a UX convenience only, never a
 * security boundary) so a browser can never be served a stored upload as
 * executable content (`text/html`, `image/svg+xml`, etc.) - the class of
 * upload this list must never contain, regardless of what gets added to it.
 *
 * `application/octet-stream` covers survey import/export formats
 * (.vsst/.vssa/.vssp) that have no browser-registered MIME type of their
 * own; browsers report it (or an empty `file.type`, normalised to it by the
 * uploader) for those. It is safe here because browsers do not render
 * `application/octet-stream` as HTML/SVG.
 */
export const ALLOWED_FILE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'text/csv',
  'application/octet-stream',
  // Documents allowed for participant file-upload question answers. PDF and
  // Office formats are not browser-executable (unlike text/html or
  // image/svg+xml), so they don't violate the constraint documented above.
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]
