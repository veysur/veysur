import React, { useState } from 'react'
import { Button } from 'component/shadcn/button'
import { Switch } from 'component/shadcn/switch'

import { cookieCatalog } from './cookieCatalog'
import { useCookieConsent } from './useCookieConsent'

export const CookieConsentBanner: React.FC = () => {
  const {
    hasConsented,
    functional,
    analytics,
    acceptAll,
    acceptEssentialOnly,
    savePreferences,
  } = useCookieConsent()
  const [showDetails, setShowDetails] = useState(false)
  const [functionalEnabled, setFunctionalEnabled] = useState(functional)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(analytics)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  )

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

  if (hasConsented) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-lg">
      {!showDetails ? (
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            We use cookies to improve your experience and analyse app usage.{' '}
            <a href="#" className="underline hover:text-foreground">
              Privacy policy
            </a>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDetails(true)}
            >
              Manage Preferences
            </Button>
            <Button size="sm" variant="outline" onClick={acceptEssentialOnly}>
              Essential Only
            </Button>
            <Button size="sm" onClick={acceptAll}>
              Accept All
            </Button>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-4">
          <h3 className="mb-3 text-sm font-semibold">Cookie Preferences</h3>
          <div className="mb-4 space-y-3">
            {cookieCatalog.map((category) => (
              <div key={category.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{category.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.description}
                    </p>
                    {category.cookies.length > 0 && (
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="mt-1 text-xs text-muted-foreground underline hover:text-foreground"
                      >
                        {expandedCategories.has(category.id)
                          ? 'Hide details'
                          : 'Show details'}
                      </button>
                    )}
                    {expandedCategories.has(category.id) && (
                      <table className="mt-2 w-full text-xs">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-1 pr-3 font-medium">Name</th>
                            <th className="pb-1 pr-3 font-medium">
                              Description
                            </th>
                            <th className="pb-1 font-medium">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.cookies.map((cookie) => (
                            <tr
                              key={cookie.name}
                              className="border-b last:border-0"
                            >
                              <td className="py-1 pr-3 font-mono">
                                {cookie.name}
                              </td>
                              <td className="py-1 pr-3 text-muted-foreground">
                                {cookie.description}
                              </td>
                              <td className="py-1 text-muted-foreground">
                                {cookie.duration}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {category.id === 'necessary' ? (
                    <Switch checked disabled />
                  ) : category.id === 'functional' ? (
                    <Switch
                      checked={functionalEnabled}
                      onCheckedChange={setFunctionalEnabled}
                    />
                  ) : (
                    <Switch
                      checked={analyticsEnabled}
                      onCheckedChange={setAnalyticsEnabled}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDetails(false)}
            >
              Back
            </Button>
            <Button
              size="sm"
              onClick={() =>
                savePreferences(functionalEnabled, analyticsEnabled)
              }
            >
              Save Preferences
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
