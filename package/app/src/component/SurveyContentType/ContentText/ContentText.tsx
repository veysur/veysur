import React from 'react'

import { SurveyContent } from '../../Survey/SurveyContent'
import { ContentTypeProps } from '../ContentTypeProps'

export const ContentText: React.FC<ContentTypeProps> = ({
  resolvedText,
  contentFormat,
}) => (
  <SurveyContent
    raw={resolvedText}
    format={contentFormat.format}
    scriptTagsAllowed={contentFormat.scriptTagsAllowed}
    className="survey-content html-content"
  />
)
