# Cookie Consent — App

## Cookie Inventory

| Cookie          | Purpose                     | Max-age  | Category   | Set in                         |
| --------------- | --------------------------- | -------- | ---------- | ------------------------------ |
| `veysur-theme`  | Light/dark theme preference | 1 year   | Functional | `component/ThemeProvider.tsx`  |
| `sidebar_state` | Sidebar expanded/collapsed  | 7 days   | Functional | `component/shadcn/sidebar.tsx` |
| `_ga`           | GA — distinguishes users    | 6 months | Analytics  | Google Analytics (gtag.js)     |
| `_ga_*`         | GA — maintains session      | 6 months | Analytics  | Google Analytics (gtag.js)     |

## Persistence

Consent state is persisted via React Query + BrowserPersister (same pattern as `usePaginationPerPage`):

```ts
useQuery({
  queryKey: [KEY_STATE_COOKIE_CONSENT],
  staleTime: Infinity,
  meta: { persistence: { enabled: true, storageType: 'local' } },
})
```

`storageType: 'local'` pins consent to localStorage regardless of the user's "Remember me" setting.

## Architecture

```
User clicks "Accept All" / "Essential Only" / "Save Preferences"
          ↓
  useCookieConsent → queryClient.setQueryData → localStorage (via BrowserPersister)
          ↓
  ThemeProvider reads functional → setThemeCookie() only if true
  SidebarProvider reads functional → document.cookie only if true
  GoogleAnalytics reads analytics → gtag('consent', 'update', ...) only if true
```

## Google Analytics Integration

Configured via `PUBLIC_GA_TAG_ID_ACCOUNT` env var. When set, `GoogleAnalytics` loads `gtag.js` with consent mode `denied` by default and updates to `granted` only when the user accepts analytics cookies.

The component is mounted in `appAccount/App.tsx` inside `QueryClientProvider` (required for `useCookieConsent`).

## Integration

`CookieConsentBanner` is rendered in all four apps directly under `QueryClientProvider`:

```
QueryClientProvider → ThemeProvider → RouterProvider
                                    → Toaster
                                    → CookieConsentBanner
                                    → GoogleAnalytics
```

## Re-opening the Banner

When `hasConsented === true`, `CookieConsentBanner` renders a fixed cookie icon button (bottom-left corner) instead of the banner. Clicking it calls `resetConsent()`, which sets `hasConsented: false` and re-shows the full banner. No separate component or additional integration is needed.

## Key Source Files

- `src/component/CookieConsent/useCookieConsent.ts` — consent state, React Query persistence, mutations
- `src/component/CookieConsent/CookieConsentBanner.tsx` — banner UI and fixed cookie icon button (shadcn/ui)
- `src/component/CookieConsent/cookieCatalog.ts` — cookie catalog data (names, descriptions, durations)
- `src/component/GoogleAnalytics/GoogleAnalytics.tsx` — GA consent mode integration
- `src/component/ThemeProvider.tsx` — gates `veysur-theme` cookie
- `src/component/shadcn/sidebar.tsx` — gates `sidebar_state` cookie
- `src/common/keyState.ts` — `KEY_STATE_COOKIE_CONSENT` query key

## Env Vars

| Variable                   | Purpose                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| `PUBLIC_GA_TAG_ID_ACCOUNT` | GA4 measurement ID (e.g. `G-XXXXXXXXXX`); empty disables tracking |
