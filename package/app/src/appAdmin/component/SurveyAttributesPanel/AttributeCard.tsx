import React, { useMemo, useState } from 'react'
import { SurveyEntity, isEqual } from 'veysur-common'
import { Schema } from 'mzen-schema'

import { useSurveyEditorStore } from 'appAdmin/component/SurveyEditor'

import { AttributeConfig } from './attributesConfig'

interface AttributeCardProps {
  attributeConfig: AttributeConfig
  entity: SurveyEntity
  onChangeValue: (value: unknown) => void
  getValue: (entity: SurveyEntity, langEditing?: string) => unknown
  langEditing?: string
}

export const AttributeCard: React.FC<AttributeCardProps> = ({
  attributeConfig,
  entity,
  onChangeValue,
  getValue,
  langEditing,
}) => {
  const initialValue = getValue(entity, langEditing)
  const [value, setValue] = useState(initialValue)
  const [validationResult, setValidationResult] =
    useState<Awaited<ReturnType<typeof Schema.prototype.validate>>>()
  const survey = useSurveyEditorStore((state) => state.survey)
  const defaults = useSurveyEditorStore((state) => state.defaults)

  // Compute default value if the attribute config supports it
  const hasDefaults = !!attributeConfig.getDefaultValue
  const defaultValue = hasDefaults
    ? attributeConfig.getDefaultValue!(defaults)
    : undefined

  const entityValue = getValue(entity, langEditing)

  // Re-sync value from the entity when it actually changes (deep equality),
  // and clear stale validation errors — done at render time (React's
  // "adjusting state when a prop changes" pattern) rather than in an effect,
  // so there's no extra render showing the stale value first.
  const [prevEntityValue, setPrevEntityValue] = useState(entityValue)
  if (!isEqual(prevEntityValue, entityValue)) {
    setPrevEntityValue(entityValue)
    setValue(entityValue)
    setValidationResult(undefined)
  }

  const schema = useMemo(() => {
    if (attributeConfig?.getSchemaSpec && survey) {
      return new Schema({
        [attributeConfig.name]: attributeConfig.getSchemaSpec(entity, survey),
      })
    } else if (attributeConfig?.schemaSpec) {
      return new Schema({
        [attributeConfig.name]: attributeConfig.schemaSpec,
      })
    }
  }, [survey, attributeConfig, entity])

  const handleOnChange = async (newValue: unknown) => {
    // Update the displayed value immediately (synchronously with the
    // triggering keystroke) so controlled inputs keep the caret position.
    // Awaiting validation before this setValue call defers it to a later
    // microtask, which forces the browser to treat the eventual value write
    // as an out-of-band update and reset the cursor to the end.
    setValue(newValue)

    const container = { [attributeConfig.name]: newValue }
    let validationResultNext = undefined
    if (schema) {
      validationResultNext = await schema.validate(container)
    }

    const isValid =
      validationResultNext == undefined || validationResultNext.isValid

    if (isValid) {
      setValidationResult(undefined)
      return onChangeValue(container[attributeConfig.name])
    } else {
      // Keep the (invalid) typed value displayed, but show errors
      setValidationResult(validationResultNext)
      return false
    }
  }

  const isValidProp =
    validationResult == undefined || !!validationResult.isValid
  const errorsProp: { [path: string]: string[] } = {}
  for (const path in validationResult?.errors) {
    const pathErrors = validationResult?.errors?.[path]
    if (Array.isArray(pathErrors)) {
      errorsProp[path] = pathErrors
    }
  }

  return (
    <div>
      <attributeConfig.component
        config={attributeConfig}
        onChange={handleOnChange}
        entity={entity}
        isValid={isValidProp}
        errors={errorsProp}
        value={value}
        hasDefaults={hasDefaults}
        defaultValue={defaultValue}
      />
    </div>
  )
}
