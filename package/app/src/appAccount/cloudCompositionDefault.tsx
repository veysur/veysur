import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'

// Self-hosted-safe default. `Router.tsx` imports the generated
// `./cloudComposition.tsx` (gitignored — see package/app/.gitignore), which is
// materialised from this file before every dev/build run: a byte copy of
// this default in a standalone self-hosted checkout or build, or an
// extension's route/registration set in a build that includes it. This is the
// "Composition gate": `scripts/generate-cloud-composition.mjs` decides at
// build time which one lands at `./cloudComposition.tsx`.
//
// Deliberately generic (`extraRouteObjects`, not named per feature): this
// file is committed public source, so its export names must not disclose
// which extension features exist. Self-hosted has no runtime-editable
// multi-tenancy concept, so its one route redirects `/` to `/profile`.
export const isGenerated = false

export const extraRouteObjects: RouteObject[] = [
  { path: '/', element: <Navigate to="/profile" replace /> },
]
