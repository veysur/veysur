import { PropsOf } from 'mzen-schema'

import { L10n } from '../../L10n'
import { SettingSurveyData } from '../SettingSurveyBase'
import { Constructor } from '../../../type'
import { HasNewInstance } from './SettingSurveyMixinBase'

export function SettingSurveyCoreMethods<T extends Constructor<HasNewInstance>>(
  Base: T,
) {
  return class extends Base {
    update(data: Partial<PropsOf<SettingSurveyData>>): this {
      const Ctor = this.constructor as new (
        data: Partial<SettingSurveyData>,
      ) => this
      return new Ctor({ ...this, ...data })
    }

    /**
     * Generic helper function for setting properties on nested objects in an immutable way
     *
     * @param currentValue - The current nested object (e.g., this.participant)
     * @param defaultValue - The default object to use if currentValue is undefined
     * @param propertyName - The name of the nested property (e.g., 'participant')
     * @param key - The key within the nested object to update
     * @param value - The new value to set
     * @returns New instance if value changed, same instance otherwise
     *
     * @example
     * ```typescript
     * // Setting a single property on the access object
     * return this.setNestedProperty(
     *   this.access,
     *   defaultAccess,
     *   'access',
     *   'anonymous',
     *   true
     * )
     * ```
     */
    setNestedProperty(
      currentValue: Record<string, unknown> | undefined,
      defaultValue: Record<string, unknown>,
      propertyName: string,
      key: string,
      value: unknown,
    ): this {
      const current = currentValue || defaultValue
      const newObject = { ...current, [key]: value }
      return this.newInstance(
        current[key] === value ? {} : { [propertyName]: newObject },
      )
    }

    /**
     * Generic helper function for updating multiple properties on nested objects in an immutable way
     *
     * @param currentValue - The current nested object (e.g., this.participant)
     * @param defaultValue - The default object to use if currentValue is undefined
     * @param propertyName - The name of the nested property (e.g., 'participant')
     * @param updates - Object containing the updates to apply
     * @returns New instance if any changes occurred, same instance otherwise
     *
     * @example
     * ```typescript
     * // Updating multiple properties on the access object
     * return this.updateNestedProperty(
     *   this.access,
     *   defaultAccess,
     *   'access',
     *   { anonymous: true, open: false, multiple: true }
     * )
     * ```
     */
    updateNestedProperty(
      currentValue: Record<string, unknown> | undefined,
      defaultValue: Record<string, unknown>,
      propertyName: string,
      updates: Record<string, unknown>,
    ): this {
      const current = currentValue || defaultValue
      const newObject = { ...current, ...updates }
      const hasChanges = Object.keys(updates).some(
        (key) => current[key] !== updates[key],
      )
      return this.newInstance(hasChanges ? { [propertyName]: newObject } : {})
    }

    /**
     * Generic helper for updating L10n text properties in nested objects
     *
     * @param currentObject - The current nested object containing the L10n text property
     * @param propertyName - The name of the nested property (e.g., 'dataPolicy', 'legalNotice')
     * @param textPropertyPath - The path to the L10n text property (e.g., 'text')
     * @param text - The new text value
     * @param lang - The language code (defaults to 'en')
     * @returns New instance if text changed, same instance otherwise
     *
     * @example
     * ```typescript
     * // Simple case: updating data policy text
     * return this.updateL10nProperty(this.dataPolicy, 'dataPolicy', 'text', 'New policy', 'en')
     * ```
     */
    updateL10nProperty(
      currentObject: Record<string, unknown>,
      propertyName: string,
      textPropertyPath: string,
      text: string | null,
      lang: string = 'en',
    ): this {
      const pathParts = textPropertyPath.split('.')

      if (pathParts.length === 1) {
        // Simple case: direct L10n property (e.g., 'text')
        const textProp = pathParts[0]
        const currentText = currentObject[textProp] as Record<string, unknown>
        if (currentText[lang] === text) {
          return this
        }
        const newText = new L10n(currentText).setLang(text, lang)
        if (text === null) delete newText[lang]
        return this.newInstance({
          [propertyName]: {
            ...currentObject,
            [textProp]: newText,
          },
        })
      } else {
        // Nested case: nested L10n property (e.g., 'link.text')
        const [parentProp, textProp] = pathParts
        const parentObject = currentObject[parentProp] as Record<
          string,
          unknown
        >
        const currentText = parentObject[textProp] as Record<string, unknown>
        if (currentText[lang] === text) {
          return this
        }
        const newText = new L10n(currentText).setLang(text, lang)
        if (text === null) delete newText[lang]
        return this.newInstance({
          [propertyName]: {
            ...currentObject,
            [parentProp]: {
              ...parentObject,
              [textProp]: newText,
            },
          },
        })
      }
    }
  }
}
