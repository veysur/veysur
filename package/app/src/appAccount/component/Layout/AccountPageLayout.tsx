import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { cn } from 'common/cn'
import { KEY_STATE_2FA_PROMPTED } from 'common/keyState'
import { useTrackNavigationHistory } from 'common'
import { Container } from 'component/shadcn/container'
import { NavbarBrandAccount } from 'appAccount/component/Navbar'
import { TwoFactorPromptModal } from 'component/TwoFactorPromptModal'
import { AccountFooter } from 'appAccount/component/Footer'
import { useAuth } from 'hook'
import { useUserTwoFactor } from 'appAccount/hook'

interface AccountPageLayoutProps {
  children: React.ReactNode
  nav?: React.ReactNode
  fluid?: boolean
  className?: string
  suppressTwoFactorPrompt?: boolean
}

export const AccountPageLayout: React.FC<AccountPageLayoutProps> = ({
  children,
  nav,
  fluid = true,
  className,
  suppressTwoFactorPrompt = false,
}) => {
  useTrackNavigationHistory()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { auth } = useAuth()
  const { dismissPrompt } = useUserTwoFactor()
  const [showTwoFactorPrompt, setShowTwoFactorPrompt] = useState(false)

  const { data: hasBeenPrompted } = useAuthdQuery<boolean>({
    queryKey: [KEY_STATE_2FA_PROMPTED],
    queryFn: () => false,
    staleTime: Infinity,
    gcTime: Infinity,
    meta: { persistence: { storageType: 'session' } },
  })

  const isTwoFactorEnabled = auth?.user?.twoFactorMeta?.enabled === true
  const isPromptDismissed =
    auth?.user?.twoFactorMeta?.prompt?.dismissed === true

  useEffect(() => {
    if (suppressTwoFactorPrompt) return
    if (
      !isTwoFactorEnabled &&
      !isPromptDismissed &&
      hasBeenPrompted === false
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to hasBeenPrompted resolving from persisted query cache, paired with an imperative queryClient write that can't happen during render
      setShowTwoFactorPrompt(true)
      queryClient.setQueryData([KEY_STATE_2FA_PROMPTED], true)
    }
  }, [
    suppressTwoFactorPrompt,
    isTwoFactorEnabled,
    isPromptDismissed,
    hasBeenPrompted,
    queryClient,
  ])

  const handleDismissPrompt = async () => {
    setShowTwoFactorPrompt(false)
    await dismissPrompt()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TwoFactorPromptModal
        open={showTwoFactorPrompt}
        onEnable={() => {
          setShowTwoFactorPrompt(false)
          navigate('/profile/security')
        }}
        onLater={() => setShowTwoFactorPrompt(false)}
        onDismiss={handleDismissPrompt}
      />
      {nav === undefined && <NavbarBrandAccount />}
      <Container fluid={fluid} className={cn('flex-1 pt-8 pb-12', className)}>
        {children}
      </Container>
      <AccountFooter />
    </div>
  )
}
