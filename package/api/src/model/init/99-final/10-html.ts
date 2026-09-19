import { ModelManager } from 'mzen-server'
import * as path from 'path'
import * as nodeDir from 'node-dir'
import * as Handlebars from 'handlebars'

// This init script loads the contents of html assets into the model config object
// - for quick in memory access when model services need to render them later

function setHtml(
  filepath: string,
  html: string,
  configObject: Record<string, unknown>,
) {
  const pathElements = path
    .dirname(filepath)
    .split(path.sep)
    .filter((value) => value != '')
  const filename = path.basename(filepath, '.html')
  let parent = configObject
  for (let x = 0; x < pathElements.length; x++) {
    const pathElement = pathElements[x]
    if (!parent[pathElement]) parent[pathElement] = {}
    parent = parent[pathElement] as Record<string, unknown>
    if (x == pathElements.length - 1) {
      // Final element
      parent[filename] = Handlebars.compile(html)
    }
  }
}

/**
 * Recursively loads every `.html` file under `assetDir` into `htmlConfig`,
 * keyed by its path relative to `assetDir` (see `setHtml`), and registers any
 * files under a `partial/` directory as Handlebars partials.
 *
 * Exported so the cloud composition (`api-cloud`) can call it a second time
 * against its own asset directory, merging platform-only templates into the
 * same `htmlConfig` object without core needing to know about them.
 */
export const scanHtmlAssets = function (
  assetDir: string,
  htmlConfig: Record<string, unknown>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const directoryPath = path.resolve(assetDir)
    nodeDir.readFiles(
      directoryPath,
      { match: /.html$/ },
      (err, content, filename, next) => {
        if (err) {
          reject(err)
          return
        }
        const shortPath = filename.substring(directoryPath.length)
        setHtml(shortPath, content, htmlConfig)
        next()
      },
      (err) => {
        if (err) {
          reject(err)
          return
        }
        const partials = htmlConfig.partial as
          Record<string, Handlebars.TemplateDelegate> | undefined
        if (partials) {
          // registered partials
          Object.keys(partials).forEach((partialName) => {
            Handlebars.registerPartial(partialName, partials[partialName])
          })
        }
        resolve()
      },
    )
  })
}

export const initHtml = function (modelManager: ModelManager): Promise<void> {
  const htmlConfig = modelManager.config.app.asset.html as Record<
    string,
    unknown
  >
  const assetDir = modelManager.config.app.asset.dir + '/html'
  return scanHtmlAssets(assetDir, htmlConfig)
}

export default initHtml
