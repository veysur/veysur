// cspell:ignore msword wordprocessingml spreadsheetml presentationml
import { FieldError } from 'component/Form'
import { Label } from 'component/shadcn/label'
import { Input } from 'component/shadcn/input'
import { Checkbox } from 'component/shadcn/checkbox'
import { FileUploadOptions as FileUploadOptionsValue } from 'veysur-common'

import {
  ChangeEventHandler,
  AttributeConfig,
} from '../SurveyAttributesPanel/attributesConfig'
import { useValidatedInternalValue } from './useValidatedInternalValue'

const BYTES_PER_MB = 1024 * 1024

type FileTypeGroup = {
  label: string
  mimeTypes: string[]
}

// User-facing groupings over the flat ALLOWED_FILE_MIME_TYPES allowlist —
// admins pick a document category, not individual MIME strings.
const FILE_TYPE_GROUPS: FileTypeGroup[] = [
  {
    label: 'Images',
    mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  },
  { label: 'PDF', mimeTypes: ['application/pdf'] },
  {
    label: 'Word',
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  {
    label: 'Excel',
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  {
    label: 'PowerPoint',
    mimeTypes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
]

const EMPTY_VALUE: FileUploadOptionsValue = {
  maxFileSize: 10 * BYTES_PER_MB,
  allowedMimeTypes: FILE_TYPE_GROUPS.flatMap((group) => group.mimeTypes),
  maxFileCount: 1,
}

export const FileUploadOptions: AttributeConfig['component'] = function ({
  config,
  isValid,
  errors,
  value,
  onChange,
}) {
  const computeValue = (): FileUploadOptionsValue =>
    (value?.allowedMimeTypes && value) ||
    (config.initialValue as FileUploadOptionsValue) ||
    EMPTY_VALUE
  const [valueInternal, setValueInternal] = useValidatedInternalValue(
    value,
    isValid,
    computeValue,
  )

  const handleChange = (next: FileUploadOptionsValue) => {
    setValueInternal(next)
    onChange(next)
  }

  const handleChangeMaxSizeMb = (e: ChangeEventHandler) => {
    const mb = Number(e.target.value)
    handleChange({
      ...valueInternal,
      maxFileSize: Number.isFinite(mb) ? Math.round(mb * BYTES_PER_MB) : 0,
    })
  }

  const handleChangeMaxCount = (e: ChangeEventHandler) => {
    const count = parseInt(e.target.value, 10)
    handleChange({
      ...valueInternal,
      maxFileCount: Number.isFinite(count) && count > 0 ? count : 1,
    })
  }

  const toggleGroup = (group: FileTypeGroup, checked: boolean) => {
    const withoutGroup = valueInternal.allowedMimeTypes.filter(
      (mimeType: string) => !group.mimeTypes.includes(mimeType),
    )
    handleChange({
      ...valueInternal,
      allowedMimeTypes: checked
        ? [...withoutGroup, ...group.mimeTypes]
        : withoutGroup,
    })
  }

  const errorFor = (path: string) =>
    !isValid && errors?.[`${config.name}.${path}`]?.join(',')

  return (
    <div className="mb-4 space-y-4">
      <Label className="mb-2">{config.name}</Label>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="mb-1">Max File Size (MB)</Label>
          <Input
            type="number"
            min={0}
            step="0.1"
            onChange={handleChangeMaxSizeMb}
            value={valueInternal.maxFileSize / BYTES_PER_MB}
            className={errorFor('maxFileSize') ? 'border-red-500' : ''}
          />
          {errorFor('maxFileSize') && (
            <FieldError className="mt-1">{errorFor('maxFileSize')}</FieldError>
          )}
        </div>
        <div>
          <Label className="mb-1">Max Number of Files</Label>
          <Input
            type="number"
            min={1}
            step={1}
            onChange={handleChangeMaxCount}
            value={valueInternal.maxFileCount}
            className={errorFor('maxFileCount') ? 'border-red-500' : ''}
          />
          {errorFor('maxFileCount') && (
            <FieldError className="mt-1">{errorFor('maxFileCount')}</FieldError>
          )}
        </div>
      </div>

      <div>
        <Label className="mb-1">Allowed File Types</Label>
        <div className="grid grid-cols-2 gap-2">
          {FILE_TYPE_GROUPS.map((group) => {
            const checked = group.mimeTypes.every((mimeType) =>
              valueInternal.allowedMimeTypes.includes(mimeType),
            )
            return (
              <label
                key={group.label}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) => toggleGroup(group, next === true)}
                />
                {group.label}
              </label>
            )
          })}
        </div>
        {errorFor('allowedMimeTypes') && (
          <FieldError className="mt-1">
            {errorFor('allowedMimeTypes')}
          </FieldError>
        )}
      </div>
    </div>
  )
}
