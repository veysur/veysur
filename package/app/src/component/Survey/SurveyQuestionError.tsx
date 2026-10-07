import React from 'react'
import { useTranslation } from 'react-i18next'
import type { ValidationMessage } from 'veysur-common'

import { cn } from 'common/cn'
import { FieldError } from 'component/Form'

interface Props {
  errors: ValidationMessage[]
  className?: string
}

export const SurveyQuestionError: React.FC<Props> = ({ errors, className }) => {
  const { t } = useTranslation('app-survey')

  if (errors.length === 0) return null

  return (
    <FieldError
      className={cn('mt-6', className)}
      errors={errors.map((error) => t(error.key, error.params))}
    />
  )
}
