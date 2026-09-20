import * as path from 'path'
import {
  composeModel,
  type ComposedModel,
  type ModelComposition,
} from './composeModel'

/**
 * Generic composition-extension seam. When API_COMPOSITION_MODULE names a module
 * (resolved relative to this file, so both relative and absolute values work),
 * core loads whatever ModelComposition it default-exports and merges it in via
 * composeModel(). Core only knows it can be extended by an externally
 * configured module. A deployment that adds an extension points this at that
 * extension's compiled composition module; otherwise it is left unset and the
 * plain self-hosted composition ({}) is used.
 */
const compositionModulePath = process.env.API_COMPOSITION_MODULE

export let composition: ModelComposition = {}
if (compositionModulePath) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const extension = require(path.resolve(__dirname, compositionModulePath)) as {
    default: ModelComposition
  }
  composition = extension.default
}

export const composed: ComposedModel = composeModel(composition)
export const modelManager = composed.modelManager

export default modelManager
