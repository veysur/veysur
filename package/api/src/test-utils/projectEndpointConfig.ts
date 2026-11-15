// What an endpoint config means to the request parser and ACL, independent of
// how it is spelled, so a hand-written and a generated config can be compared.
const DEFAULT_ERROR_CODES: Record<string, number> = {
  Error: 500,
  ServerErrorInternal: 500,
  ServerErrorBadRequest: 400,
  ServerErrorUnauthorized: 401,
  ServerErrorForbidden: 403,
  ServerErrorNotFound: 404,
  ServerErrorMethodNotAllowed: 405,
  ServerErrorTooManyRequests: 429,
}

interface ConfigEntry {
  src?: string
  srcPath?: string
  required?: boolean
  defaultValue?: unknown
}

interface ConfigEndpoint {
  method: string
  verbs: string[]
  path?: string
  enable?: boolean
  acl?: { rules: object[] }
  data?: Record<string, ConfigEntry>
  response?: { error?: Record<string, { http: { code: number } }> }
}

interface Config {
  service: string
  path?: string
  enable?: boolean
  acl?: { rules: object[] }
  endpoints: Record<string, ConfigEndpoint>
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    )
  }
  return value
}

export function projectEndpointConfig(config: Config): unknown {
  return sortKeys({
    service: config.service,
    path: config.path,
    enable: config.enable ?? true,
    endpoints: Object.fromEntries(
      Object.entries(config.endpoints).map(([key, ep]) => [
        key,
        {
          method: ep.method,
          verbs: ep.verbs,
          path: ep.path,
          enable: ep.enable ?? true,
          acl: ep.acl?.rules ?? config.acl?.rules,
          errors: Object.fromEntries(
            Object.entries(ep.response?.error ?? {})
              .filter(([name, v]) => DEFAULT_ERROR_CODES[name] !== v.http.code)
              .map(([name, v]) => [name, v.http.code]),
          ),
          data: Object.fromEntries(
            Object.entries(ep.data ?? {}).map(([name, d]) => [
              name,
              {
                src: d.src ?? 'query',
                srcPath: d.srcPath === name ? undefined : d.srcPath,
                required: d.required === true,
                defaultValue: d.defaultValue,
              },
            ]),
          ),
        },
      ]),
    ),
  })
}
