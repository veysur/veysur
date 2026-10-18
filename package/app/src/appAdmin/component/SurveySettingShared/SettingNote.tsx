import React from 'react'

import { Alert } from 'component/shadcn/alert'

export const SettingNote: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Alert variant="info" className="max-w-md">
    {children}
  </Alert>
)
