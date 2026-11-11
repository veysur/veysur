import { SurveyContent } from 'veysur-common'

export interface ContentTypeEditProps {
  element: SurveyContent
  /** Marks the element focused in the editor; call when the user interacts */
  onFocus: () => void
}
