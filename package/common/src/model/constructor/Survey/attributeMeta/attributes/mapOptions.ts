import {
  AttributeMeta,
  SURVEY_ENTITY_TYPE_ELEMENT,
  QUESTION_TYPE_MAP,
  MapOptions,
} from '../types'
import { ATTRIBUTE_QUESTION_MAP_OPTIONS } from '../constants'
import { getNestedValue } from '../helpers'
import {
  MAP_PROVIDERS,
  MAP_PROVIDER_DEFAULT,
  MAP_PRECISIONS,
  MAP_PRECISION_EXACT,
  MAP_ZOOM_MIN,
  MAP_ZOOM_MAX,
  parseMapCountries,
} from 'model/service/MapAnswer'

const DEFAULT_MAP_OPTIONS: MapOptions = {
  provider: MAP_PROVIDER_DEFAULT,
  centerLat: null,
  centerLng: null,
  zoom: null,
  addressSearch: true,
  useMyLocation: false,
  countries: '',
  precision: MAP_PRECISION_EXACT,
}

const COUNTRY_CODE = /^[A-Z]{2}$/

export const mapOptionsMeta: AttributeMeta = {
  id: ATTRIBUTE_QUESTION_MAP_OPTIONS,
  entityTypes: [SURVEY_ENTITY_TYPE_ELEMENT],
  name: 'Map Options',
  description:
    'Map provider, starting view, address search, device location, country restriction and precision',
  typesLimit: [QUESTION_TYPE_MAP],
  initialValue: DEFAULT_MAP_OPTIONS,
  schemaSpec: {
    provider: {
      $type: String,
      $name: 'Map Provider',
      $validate: {
        required: true,
        inArray: { values: [...MAP_PROVIDERS] },
      },
    },
    centerLat: {
      $type: Number,
      $name: 'Start Latitude',
      $validate: {
        callback: {
          validator: (value: number | null) =>
            value === null ||
            (Number.isFinite(value) && value >= -90 && value <= 90)
              ? true
              : 'Start Latitude must be between -90 and 90',
        },
      },
    },
    centerLng: {
      $type: Number,
      $name: 'Start Longitude',
      $validate: {
        callback: {
          validator: (value: number | null) =>
            value === null ||
            (Number.isFinite(value) && value >= -180 && value <= 180)
              ? true
              : 'Start Longitude must be between -180 and 180',
        },
      },
    },
    zoom: {
      $type: Number,
      $name: 'Start Zoom',
      $validate: {
        callback: {
          validator: (value: number | null) =>
            value === null ||
            (Number.isInteger(value) &&
              value >= MAP_ZOOM_MIN &&
              value <= MAP_ZOOM_MAX)
              ? true
              : `Start Zoom must be a whole number from ${MAP_ZOOM_MIN} to ${MAP_ZOOM_MAX}`,
        },
      },
    },
    addressSearch: { $type: Boolean, $name: 'Address Search' },
    useMyLocation: { $type: Boolean, $name: 'Use My Location' },
    countries: {
      $type: String,
      $name: 'Countries',
      $validate: {
        callback: {
          validator: (value: string) =>
            parseMapCountries(value).every((code) => COUNTRY_CODE.test(code))
              ? true
              : 'Countries must be two-letter country codes',
        },
      },
    },
    precision: {
      $type: String,
      $name: 'Precision',
      $validate: {
        required: true,
        inArray: { values: [...MAP_PRECISIONS] },
      },
    },
  },
  getValue: (entity) => {
    return (
      getNestedValue(entity, `attributes.${ATTRIBUTE_QUESTION_MAP_OPTIONS}`) ||
      DEFAULT_MAP_OPTIONS
    )
  },
}
