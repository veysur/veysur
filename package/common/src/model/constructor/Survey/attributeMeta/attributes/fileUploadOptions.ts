import {
  AttributeMeta,
  SURVEY_ENTITY_TYPE_ELEMENT,
  QUESTION_TYPE_FILE_UPLOAD,
  FileUploadOptions,
} from '../types'
import {
  ATTRIBUTE_QUESTION_FILE_UPLOAD_OPTIONS,
  FILE_UPLOAD_MAX_FILE_SIZE_CEILING,
  FILE_UPLOAD_DEFAULT_MAX_FILE_SIZE,
} from '../constants'
import { getNestedValue } from '../helpers'
import { ALLOWED_FILE_MIME_TYPES } from '../../../../schema/constant'

const DEFAULT_FILE_UPLOAD_OPTIONS: FileUploadOptions = {
  maxFileSize: FILE_UPLOAD_DEFAULT_MAX_FILE_SIZE,
  allowedMimeTypes: [...ALLOWED_FILE_MIME_TYPES],
  maxFileCount: 1,
}

export const fileUploadOptionsMeta: AttributeMeta = {
  id: ATTRIBUTE_QUESTION_FILE_UPLOAD_OPTIONS,
  entityTypes: [SURVEY_ENTITY_TYPE_ELEMENT],
  name: 'File Upload Options',
  description: 'Maximum file size, allowed file types, and maximum file count',
  typesLimit: [QUESTION_TYPE_FILE_UPLOAD],
  initialValue: DEFAULT_FILE_UPLOAD_OPTIONS,
  schemaSpec: {
    maxFileSize: {
      $type: Number,
      $name: 'Max File Size',
      $validate: {
        required: true,
        callback: {
          validator: (value: number) => {
            if (value <= 0) return 'Max File Size must be greater than 0'
            if (value > FILE_UPLOAD_MAX_FILE_SIZE_CEILING) {
              return `Max File Size cannot exceed ${FILE_UPLOAD_MAX_FILE_SIZE_CEILING} bytes`
            }
            return true
          },
        },
      },
    },
    allowedMimeTypes: {
      $type: Array,
      $name: 'Allowed File Types',
      $validate: {
        required: true,
        callback: {
          validator: (value: string[]) => {
            if (!Array.isArray(value) || value.length === 0) {
              return 'At least one file type must be allowed'
            }
            const invalid = value.filter(
              (mimeType) => !ALLOWED_FILE_MIME_TYPES.includes(mimeType),
            )
            return invalid.length === 0
              ? true
              : `Unsupported file type(s): ${invalid.join(', ')}`
          },
        },
      },
    },
    maxFileCount: {
      $type: Number,
      $name: 'Max File Count',
      $validate: {
        required: true,
        callback: {
          validator: (value: number) => {
            return Number.isInteger(value) && value >= 1
              ? true
              : 'Max File Count must be a whole number of at least 1'
          },
        },
      },
    },
  },
  getValue: (entity) => {
    return (
      getNestedValue(
        entity,
        `attributes.${ATTRIBUTE_QUESTION_FILE_UPLOAD_OPTIONS}`,
      ) || DEFAULT_FILE_UPLOAD_OPTIONS
    )
  },
}
