# Endpoints and init middleware

## Endpoints and URL prefixes

Endpoint configs are generated, not written. A service class carries `@endpoints <name>`; each exposed
method carries `@route <verb> <path>` and `@acl <role>` (or `@acl public`); the endpoint key is the method name; each parameter is tagged with `e.Param`, `e.Query`, `e.Body`,
`e.Header<'X-Project-Id'>`, `e.AclContext` and so on (`import type { tagsEndpoint as e } from '@datacapy/server'`).
`pnpm gen` writes `<Service>.endpoints.ts` beside the service, `pnpm lint` fails if one is stale (`gen:check`),
and `src/endpoint/{core,shared}/index.ts` re-exports it. Never edit a `*.endpoints.ts` file. Reference:
datacapy `package/codegen/docs/endpoints.md`; rationale: `docs/decisions/2026/2026-11-14_generated-endpoint-configs.md`.

- One method serves one route; add a thin wrapper for a second route.
- Type every parameter. `unknown & e.Body` collapses to `e.Body` and loses the type; a property whose type resolves to `any` (a bad import) is rejected by the generator, because its tags would be lost.
- Declare routes in the class in the order the server should register them: a `/:id` route before a literal sibling is rejected by the generator.
- Anything that is not a request input (a transaction `context`) belongs on an internal method, not in the tagged parameter type.
- `src/endpoint/shared/project.ts` stays hand-written because it is edition-conditional. A hand-written config remains valid.
- A generated config does not change the URL: core and shared services have no root `path`, so @datacapy/server derives it from the service name.

**Project-scoped endpoints**: for any endpoint operating on a single project's data, use `role: 'projectOwner'`/`'projectAdmin'` ACL rules, not a generic role plus a manual ownership check in the service. See `docs/datacapy-acl.md`.

## Init middleware and the server adaptor (`src/init/`)

`@datacapy/server` runs on an HTTP adaptor (Express today), so init code is written against the neutral types and never against Express. Lint enforces it: no `express` import, no `server.app` / `server.router`.

- Register with `server.use(stage, [path], handler)`, `server.route(stage, method, path, ...handlers)`, `server.static(...)` and `server.trustProxy([...])`. Stage `app` runs before datacapy's router is mounted (storage routes, webhooks), stage `router` inside it. Type handlers with `Handler`, `HttpRequest` and `HttpResponse` from `@datacapy/server`.
- Read a raw body from `req.node` (the Node request), as the multipart, storage upload and Stripe handlers do.
- Stream with `res.stream(readable, { headers })`, never `res.write`/`res.end` on a stream. `res.header(name, value)` sets the value verbatim.
- A trailing `/*name` path wildcard arrives as one string; in a path-scoped `use`, `req.path` is relative to that path.
- Test init code over real HTTP: build `new Server({ path: '/api', port: 0 }, new ModelManager())`, call the init function, `await server.init()`, then `server.adaptor.listen(0)`. Add fake services or repos after `init()`. See `src/init/init-http.test.ts`. The API's global fake timers stall streams and formidable, so such a test calls `jest.useRealTimers()`.

The adaptor is chosen by `API_HTTP_ADAPTOR` (`express`, the default, or `hono`), read in `config/default.ts`. Init tests that run over HTTP use `describe.each(['express', 'hono'])` so both stay covered; a new init step must pass on both.

Contract and conformance rules: datacapy `package/server/docs/http-adaptor.md`.
