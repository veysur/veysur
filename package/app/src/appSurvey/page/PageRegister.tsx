import React from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { RegistrationForm } from '../component/RegistrationForm'
import { usePageTitle } from 'hook'

export const PageRegister: React.FC = () => {
  const { t } = useTranslation('app-survey')
  usePageTitle(t('page.register.title'), { suffix: 'Veysur' })
  const { surveyId } = useParams<{ surveyId: string }>()

  return <RegistrationForm surveyId={surveyId!} />
}

export default PageRegister
