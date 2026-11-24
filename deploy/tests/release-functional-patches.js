// Runs inside the api container (node, with veysur-common installed). Reads GET /api/survey/:id
// from stdin and prints {patches, questionCode, questionId}: the patches the survey editor would
// send to add one text question to the auto-seeded group and open the survey to participants.
const {
  Survey,
  BUFFERED_PATCH_ACTION_CREATE,
  BUFFERED_PATCH_ACTION_UPDATE,
  QUESTION_TYPE_TEXT,
} = require('veysur-common')

let input = ''
process.stdin.on('data', (chunk) => (input += chunk))
process.stdin.on('end', () => {
  const body = JSON.parse(input)
  const survey = new Survey(body.survey ?? body)
  const group = survey.sections.groups().find((g) => g.code === 'G001') ?? survey.sections.groups()[0]
  if (!group) throw new Error('survey has no auto-seeded group')

  const questionId = Survey.genElementId()
  let next = survey.addQuestion(group._id, { _id: questionId })
  next = next.updateQuestion(questionId, { type: QUESTION_TYPE_TEXT, text: { en: 'Release test question' } })
  const question = next.elements.questions().getById(questionId)
  const { detail: _detail, ...structural } = { ...question }

  process.stdout.write(
    JSON.stringify({
      questionId,
      questionCode: question.code,
      patches: [
        { type: 'element', action: BUFFERED_PATCH_ACTION_CREATE, id: questionId, data: structural },
        { type: 'survey', action: BUFFERED_PATCH_ACTION_UPDATE, id: survey._id, data: { elementIds: next.elementIds } },
        { type: 'survey', action: BUFFERED_PATCH_ACTION_UPDATE, id: survey._id, data: { 'access.open': true } },
      ],
    }),
  )
})
