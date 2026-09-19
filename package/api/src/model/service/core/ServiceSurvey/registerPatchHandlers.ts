import { Patcher } from 'veysur-common'
import { PatchContext } from './PatchContext'
import { handleSectionCreate } from './handlers/sectionCreate'
import { handleSectionUpdate } from './handlers/sectionUpdate'
import { handleSectionDelete } from './handlers/sectionDelete'
import { handleQuestionCreate } from './handlers/questionCreate'
import { handleQuestionUpdate } from './handlers/questionUpdate'
import { handleQuestionDelete } from './handlers/questionDelete'
import { handleContentCreate } from './handlers/contentCreate'
import { handleContentUpdate } from './handlers/contentUpdate'
import { handleContentDelete } from './handlers/contentDelete'
import { handleSurveyUpdate } from './handlers/surveyUpdate'
import { handleAnswerOptionUpdate } from './handlers/answerOptionUpdate'
import { handleSubquestionUpdate } from './handlers/subquestionUpdate'
import { handleEmailTemplateUpdate } from './handlers/emailTemplateUpdate'

export function registerPatchHandlers(
  patcher: Patcher,
  ctx: PatchContext,
): void {
  patcher.addHandler('section', 'create', (p) => handleSectionCreate(p, ctx))
  patcher.addHandler('element', 'create', (p) => handleQuestionCreate(p, ctx))
  patcher.addHandler('survey', 'update', (p) => handleSurveyUpdate(p, ctx))
  patcher.addHandler('section', 'update', (p) => handleSectionUpdate(p, ctx))
  patcher.addHandler('element', 'update', (p) => handleQuestionUpdate(p, ctx))
  patcher.addHandler('section', 'delete', (p) => handleSectionDelete(p, ctx))
  patcher.addHandler('element', 'delete', (p) => handleQuestionDelete(p, ctx))
  patcher.addHandler('content', 'create', (p) => handleContentCreate(p, ctx))
  patcher.addHandler('content', 'update', (p) => handleContentUpdate(p, ctx))
  patcher.addHandler('content', 'delete', (p) => handleContentDelete(p, ctx))
  patcher.addHandler('answerOption', 'update', (p) =>
    handleAnswerOptionUpdate(p, ctx),
  )
  patcher.addHandler('subquestion', 'update', (p) =>
    handleSubquestionUpdate(p, ctx),
  )
  patcher.addHandler('emailTemplate', 'update', (p) =>
    handleEmailTemplateUpdate(p, ctx),
  )
}
