import { useMemo, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

import { COUNTRIES, getCountryName } from 'common/countries'
import { FieldError } from 'component/Form'
import { Badge } from 'component/shadcn/badge'
import { Button } from 'component/shadcn/button'
import { Checkbox } from 'component/shadcn/checkbox'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'component/shadcn/popover'

import { AttributeConfig } from '../SurveyAttributesPanel/attributesConfig'

function parseCodes(value: unknown): string[] {
  return String(value || '')
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
}

export const CountryMultiSelect: AttributeConfig['component'] = function ({
  config,
  isValid,
  errors,
  value,
  onChange,
}) {
  const [search, setSearch] = useState('')
  const selected = useMemo(() => parseCodes(value), [value])
  const attributeErrors =
    !!errors && !!errors[config.name] && errors[config.name].join(',')

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term
      ? COUNTRIES.filter(
          ({ label, value: code }) =>
            label.toLowerCase().includes(term) || code.toLowerCase() === term,
        )
      : COUNTRIES
  }, [search])

  const update = (codes: string[]) => onChange(codes.join(','))
  const toggle = (code: string) =>
    update(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code],
    )

  return (
    <div className="mb-4">
      <Label className="mb-2">{config.name}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={`w-full justify-between font-normal ${!isValid ? 'border-destructive' : ''}`}
          >
            {selected.length
              ? `${selected.length} selected`
              : 'Any country'}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-2">
          <Input
            placeholder="Search countries"
            aria-label="Search countries"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-64 overflow-y-auto" role="listbox">
            {matches.map(({ label, value: code }) => (
              <label
                key={code}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={selected.includes(code)}
                  onCheckedChange={() => toggle(code)}
                  aria-label={label}
                />
                {label}
              </label>
            ))}
            {!matches.length && (
              <p className="px-2 py-1 text-sm text-muted-foreground">
                No countries found
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selected.map((code) => (
            <Badge key={code} variant="secondary" className="gap-1">
              {getCountryName(code)}
              <button
                type="button"
                aria-label={`Remove ${getCountryName(code)}`}
                onClick={() => toggle(code)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {!isValid && attributeErrors && (
        <FieldError className="mt-1">{attributeErrors}</FieldError>
      )}
    </div>
  )
}
