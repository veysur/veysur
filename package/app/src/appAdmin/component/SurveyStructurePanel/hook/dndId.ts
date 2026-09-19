const GROUP_ID_PREFIX = 'group:'
const QUESTION_ID_PREFIX = 'question:'
const GROUP_CONTAINER_ID_PREFIX = 'group-container:'

export const toGroupDndId = (groupId: string): string =>
  `${GROUP_ID_PREFIX}${groupId}`

export const toQuestionDndId = (questionId: string): string =>
  `${QUESTION_ID_PREFIX}${questionId}`

export const toGroupContainerDndId = (groupId: string): string =>
  `${GROUP_CONTAINER_ID_PREFIX}${groupId}`

export const fromGroupDndId = (id: string): string | null =>
  id.startsWith(GROUP_ID_PREFIX) ? id.slice(GROUP_ID_PREFIX.length) : null

export const fromQuestionDndId = (id: string): string | null =>
  id.startsWith(QUESTION_ID_PREFIX) ? id.slice(QUESTION_ID_PREFIX.length) : null

export const fromGroupContainerDndId = (id: string): string | null =>
  id.startsWith(GROUP_CONTAINER_ID_PREFIX)
    ? id.slice(GROUP_CONTAINER_ID_PREFIX.length)
    : null
