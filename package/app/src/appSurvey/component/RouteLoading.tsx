import React from 'react'

import { Spinner } from 'component/shadcn/spinner'

export const RouteLoading: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Spinner size="lg" />
  </div>
)
