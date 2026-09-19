import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useCookieConsent } from '../hook/useCookieConsent'
import { cookieCatalog } from './cookieCatalog'

export default function CookieConsentBanner() {
  const { hasConsented, functional, analytics, acceptAll, acceptEssentialOnly, savePreferences } =
    useCookieConsent()
  const [showDetails, setShowDetails] = useState(false)
  const [functionalEnabled, setFunctionalEnabled] = useState(functional)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(analytics)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (id: string) =>
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

  if (hasConsented) return null

  return createPortal(
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background shadow-lg">
      {!showDetails ? (
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            We use cookies to improve your experience and analyse site usage.{' '}
            <a href="https://veysur.com/privacy" className="underline hover:text-foreground">
              Privacy policy
            </a>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowDetails(true)}
              className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              Manage Preferences
            </button>
            <button
              onClick={acceptEssentialOnly}
              className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              Essential Only
            </button>
            <button
              onClick={acceptAll}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
            >
              Accept All
            </button>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-6xl flex flex-col gap-4 px-4 py-4">
          <h3 className="text-sm font-semibold">Cookie Preferences</h3>
          <div className="flex flex-col gap-3">
            {cookieCatalog.map((category) => (
              <div key={category.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{category.label}</p>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                    {category.cookies.length > 0 && (
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="mt-1 text-xs text-muted-foreground underline hover:text-foreground"
                      >
                        {expandedCategories.has(category.id) ? 'Hide details' : 'Show details'}
                      </button>
                    )}
                    {expandedCategories.has(category.id) && (
                      <table className="mt-2 w-full text-xs">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-1 pr-3 font-medium">Name</th>
                            <th className="pb-1 pr-3 font-medium">Description</th>
                            <th className="pb-1 font-medium">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.cookies.map((cookie) => (
                            <tr key={cookie.name} className="border-b last:border-0">
                              <td className="py-1 pr-3 font-mono">{cookie.name}</td>
                              <td className="py-1 pr-3 text-muted-foreground">{cookie.description}</td>
                              <td className="py-1 text-muted-foreground">{cookie.duration}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {category.id === 'necessary' ? (
                    <span className="mt-1 text-xs text-muted-foreground">Always on</span>
                  ) : category.id === 'functional' ? (
                    <button
                      role="switch"
                      aria-checked={functionalEnabled}
                      onClick={() => setFunctionalEnabled((v) => !v)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${functionalEnabled ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span
                        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${functionalEnabled ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </button>
                  ) : (
                    <button
                      role="switch"
                      aria-checked={analyticsEnabled}
                      onClick={() => setAnalyticsEnabled((v) => !v)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${analyticsEnabled ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span
                        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${analyticsEnabled ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowDetails(false)}
              className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              Back
            </button>
            <button
              onClick={() => savePreferences(functionalEnabled, analyticsEnabled)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
