import { ReactNode, useId, useState } from 'react'
import { MapOptions as MapOptionsValue } from 'veysur-common'

import { cn } from 'common/cn'
import { FieldError } from 'component/Form'
import { Button } from 'component/shadcn/button'
import { Checkbox } from 'component/shadcn/checkbox'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { Separator } from 'component/shadcn/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'

import {
  ChangeEventHandler,
  AttributeConfig,
} from '../SurveyAttributesPanel/attributesConfig'
import { CountryMultiSelect } from './CountryMultiSelect'
import { useValidatedInternalValue } from './useValidatedInternalValue'

const EMPTY_VALUE: MapOptionsValue = {
  provider: 'default',
  centerLat: null,
  centerLng: null,
  zoom: null,
  addressSearch: true,
  useMyLocation: false,
  countries: '',
  precision: 'exact',
}

const PROVIDERS: Record<string, string> = {
  default: 'Project default',
  osm: 'OpenStreetMap',
  google: 'Google Maps',
}

const PRECISIONS: Record<string, string> = {
  exact: 'Exact location',
  coarse: 'Approximate (about 11 km)',
}

const SectionHeading = ({ children }: { children: ReactNode }) => (
  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
    {children}
  </h3>
)

const HelpText = ({ children }: { children: ReactNode }) => (
  <p className="text-xs text-muted-foreground">{children}</p>
)

const Section = ({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) => (
  <section className="space-y-3">
    <Separator />
    <SectionHeading>{title}</SectionHeading>
    {children}
  </section>
)

export const MapOptions: AttributeConfig['component'] = function ({
  entity,
  config,
  isValid,
  errors,
  value,
  onChange,
}) {
  const idPrefix = useId()
  const computeValue = (): MapOptionsValue => ({
    ...EMPTY_VALUE,
    ...((config.initialValue as Partial<MapOptionsValue>) ?? {}),
    ...(value ?? {}),
  })
  const [valueInternal, setValueInternal] = useValidatedInternalValue(
    value,
    isValid,
    computeValue,
  )

  const handleChange = (next: MapOptionsValue) => {
    setValueInternal(next)
    onChange(next)
  }

  const handleNumber =
    (field: 'centerLat' | 'centerLng' | 'zoom') => (e: ChangeEventHandler) =>
      handleChange({
        ...valueInternal,
        [field]: e.target.value === '' ? null : Number(e.target.value),
      })

  const [startingViewFixed, setStartingViewFixed] = useState(
    valueInternal.centerLat !== null || valueInternal.centerLng !== null,
  )

  const chooseStartingView = (fixed: boolean) => {
    setStartingViewFixed(fixed)
    if (!fixed) {
      handleChange({
        ...valueInternal,
        centerLat: null,
        centerLng: null,
        zoom: null,
      })
    }
  }

  const onlyOneCoordinate =
    (valueInternal.centerLat === null) !== (valueInternal.centerLng === null)

  const errorFor = (path: string) =>
    !isValid && errors?.[`${config.name}.${path}`]?.join(',')

  const numberField = (
    field: 'centerLat' | 'centerLng' | 'zoom',
    label: string,
    step: string,
  ) => (
    <div className="min-w-0">
      <Label htmlFor={`${idPrefix}-${field}`} className="mb-1">
        {label}
      </Label>
      <Input
        id={`${idPrefix}-${field}`}
        type="number"
        step={step}
        value={valueInternal[field] ?? ''}
        placeholder="Automatic"
        onChange={handleNumber(field)}
        className={errorFor(field) ? 'border-destructive' : ''}
      />
      {errorFor(field) && (
        <FieldError className="mt-1">{errorFor(field)}</FieldError>
      )}
    </div>
  )

  const selectField = (
    field: 'provider' | 'precision',
    label: string,
    choices: Record<string, string>,
  ) => (
    <div>
      <Label className="mb-1">{label}</Label>
      <Select
        value={valueInternal[field]}
        onValueChange={(next) =>
          handleChange({ ...valueInternal, [field]: next })
        }
      >
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(choices).map(([key, text]) => (
            <SelectItem key={key} value={key}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  const startingViewOption = (fixed: boolean, label: string) => (
    <Button
      type="button"
      variant={startingViewFixed === fixed ? 'default' : 'outline'}
      aria-pressed={startingViewFixed === fixed}
      className={cn(fixed ? 'rounded-l-none' : 'rounded-r-none')}
      onClick={() => chooseStartingView(fixed)}
    >
      {label}
    </Button>
  )

  return (
    <div className="mb-4 space-y-4">
      <SectionHeading>{config.name}</SectionHeading>

      <div className="space-y-2">
        {selectField('provider', 'Map provider', PROVIDERS)}
        {valueInternal.provider === 'google' && (
          <HelpText>
            Needs a Google Maps key in the project settings, otherwise
            OpenStreetMap is used.
          </HelpText>
        )}
      </div>

      <Section title="Starting view">
        <div role="group" aria-label="Starting view">
          {startingViewOption(false, 'Automatic')}
          {startingViewOption(true, 'Fixed point')}
        </div>
        {startingViewFixed ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {numberField('centerLat', 'Latitude', '0.1')}
              {numberField('centerLng', 'Longitude', '0.1')}
            </div>
            {onlyOneCoordinate && (
              <FieldError>
                Set both latitude and longitude, or leave both blank.
              </FieldError>
            )}
            {numberField('zoom', 'Zoom (1 to 18)', '1')}
          </div>
        ) : (
          <HelpText>
            Opens near the participant&apos;s country or city.
          </HelpText>
        )}
      </Section>

      <Section title="Participant tools">
        <div className="grid gap-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={valueInternal.addressSearch}
              onCheckedChange={(next) =>
                handleChange({ ...valueInternal, addressSearch: next === true })
              }
            />
            Address search
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={valueInternal.useMyLocation}
              onCheckedChange={(next) =>
                handleChange({ ...valueInternal, useMyLocation: next === true })
              }
            />
            &ldquo;Use my location&rdquo; button
          </label>
        </div>
      </Section>

      <Section title="Restrictions">
        <CountryMultiSelect
          entity={entity}
          config={{ ...config, name: 'Allowed countries' }}
          isValid={isValid}
          errors={undefined}
          value={valueInternal.countries}
          onChange={(next) =>
            handleChange({ ...valueInternal, countries: String(next ?? '') })
          }
        />
        <div className="space-y-2">
          {selectField('precision', 'Precision', PRECISIONS)}
          <HelpText>
            Anonymous surveys always use approximate locations and hide the
            device location button.
          </HelpText>
        </div>
      </Section>
    </div>
  )
}
