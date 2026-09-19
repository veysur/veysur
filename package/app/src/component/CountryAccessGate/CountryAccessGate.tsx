import React from 'react'
import { Globe } from 'lucide-react'

import { GoldenCentered } from 'component/GoldenCentered'
import { Card, CardContent } from 'component/shadcn/card'
import { useCountryAccess } from 'hook'

interface Props {
  children: React.ReactNode
}

export const CountryAccessGate: React.FC<Props> = ({ children }) => {
  const { blocked, isLoading } = useCountryAccess()

  if (isLoading) {
    return null
  }

  if (blocked) {
    return (
      <GoldenCentered
        className="min-h-screen"
        topOffset="0"
        maxWidth="max-w-sm"
      >
        <Card>
          <CardContent className="flex flex-col items-center text-center py-10 px-8">
            <img
              src="/image/veysur-logo-light.svg"
              alt="VeySur"
              className="h-12 w-auto dark:hidden mb-6"
            />
            <img
              src="/image/veysur-logo-dark.svg"
              alt="VeySur"
              className="h-12 w-auto hidden dark:block mb-6"
            />
            <div className="inline-flex items-center justify-center rounded-full bg-muted p-4 mb-4">
              <Globe className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              Service Unavailable in Your Country
            </h2>
            <p className="text-muted-foreground">
              VeySur does not currently provide service to customers in your
              country.
            </p>
          </CardContent>
        </Card>
      </GoldenCentered>
    )
  }

  return <>{children}</>
}
