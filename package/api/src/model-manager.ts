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
 * composeModel(). Core has no built-in notion of "cloud" — it only knows it can
 * be extended by an externally configured module. The commercial edition's
 * deployment config points this at its own compiled composition module;
 * self-hosted deployments leave it unset and get the plain self-hosted
 * composition ({}).
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
