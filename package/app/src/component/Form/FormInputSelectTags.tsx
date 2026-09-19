import React, { useState } from 'react'
import { X } from 'lucide-react'

import { Label } from 'component/shadcn/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'
import { Badge } from 'component/shadcn/badge'

export interface FormInputSelectTagsProps {
  options: { value: string; label: string }[]
  value?: string[]
  onChange?: (selectedTags: string[]) => void
  placeholder?: string
  label?: string
  disabled?: boolean
}

export const FormInputSelectTags: React.FC<FormInputSelectTagsProps> = ({
  options,
  value = [],
  onChange,
  placeholder = 'Select an option...',
  label,
  disabled = false,
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>(value)

  const handleSelectChange = (newValue: string) => {
    if (newValue && !selectedTags.includes(newValue)) {
      const updatedTags = [...selectedTags, newValue]
      setSelectedTags(updatedTags)
      onChange?.(updatedTags)
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = selectedTags.filter((tag) => tag !== tagToRemove)
    setSelectedTags(updatedTags)
    onChange?.(updatedTags)
  }

  const availableOptions = options.filter(
    (option) => !selectedTags.includes(option.value),
  )

  const getOptionLabel = (value: string) => {
    const option = options.find((opt) => opt.value === value)
    return option?.label || value
  }

  React.useEffect(() => {
    setSelectedTags(value)
  }, [value])

  return (
    <div className="mb-3">
      {label && <Label className="mb-2">{label}</Label>}

      <Select
        onValueChange={handleSelectChange}
        disabled={disabled || availableOptions.length === 0}
        value=""
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              availableOptions.length === 0
                ? 'No more options available'
                : placeholder
            }
          />
        </SelectTrigger>
        <SelectContent>
          {availableOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="default"
              className="flex items-center gap-1 text-sm"
            >
              {getOptionLabel(tag)}
              <X
                className="h-3.5 w-3.5 cursor-pointer"
                onClick={() => handleRemoveTag(tag)}
                role="button"
                aria-label={`Remove ${getOptionLabel(tag)}`}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
