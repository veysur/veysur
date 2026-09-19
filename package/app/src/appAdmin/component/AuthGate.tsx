import React, { ReactNode } from 'react'

import { AuthGate as SharedAuthGate } from 'component/AuthGate'

export const AuthGate: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <SharedAuthGate loginPath="/login">{children}</SharedAuthGate>
}
