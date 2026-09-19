import React, { useMemo, useEffect, useState, useCallback } from 'react'
import { Menu } from 'lucide-react'
import {
  Survey as SurveyEntity,
  SettingSurvey,
  L10n,
  QUESTION_TYPE_SURVEY_LANG_SELECT,
  isSurveyContent,
  ConditionEvaluator,
  ExpressionContext,
  ExpressionContextBuilder,
  GroupInfo,
  QuestionInfo,
  ParticipantData,
  SurveyContent,
  SurveyQuestion,
  SurveySection,
  buildQuestionInfoBase,
  buildAnswerOptionsForQuestion,
  getChoiceOtherValue,
  resolveContentFormat,
} from 'veysur-common'

import { useLatestRef } from 'hook'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Button } from 'component/shadcn/button'
import { Separator } from 'component/shadcn/separator'
import { LanguageSelector } from 'component/LanguageSelector'
import { sanitizeHtml } from 'common/sanitizeHtml'

import { SurveyNavigation } from './SurveyNavigation'
import { SurveyProgressBar } from './SurveyProgressBar'
import { SurveyFormatAll } from './SurveyFormatAll'
import { SurveyFormatGroup } from './SurveyFormatGroup'
import { SurveyFormatQuestion } from './SurveyFormatQuestion'
import { SurveyWelcome } from './SurveyWelcome'
import { SurveyThankYou } from './SurveyThankYou'
import { SurveyIndex } from './SurveyIndex'
import { SurveyIndexMenu } from './SurveyIndexMenu'
import { useSurveyState } from './hook/useSurveyState'
import { useSurveyNavigation } from './hook/useSurveyNavigation'
import { useSurveyValidation } from './hook/useSurveyValidation'
import { createProgressUtils } from './surveyProgressUtils'
import { debug } from './debugUtils'
import { RandomisationContext } from './RandomisationContext'
import {
  isContentItem,
  isQuestionItem,
  type SurveyPresentationConfig,
  type SurveyContentFormatConfig,
  type SurveyPolicyConfig,
  type SurveyAnswers,
  type QuestionWithGroup,
  type SurveyRenderItem,
} from './SurveyTypes'

type Props = {
  settingSurvey?: SettingSurvey
  survey?: SurveyEntity
  authToken?: string
  initAnswers?: SurveyAnswers
  initSeeds?: Record<string, number>
  initLanguage?: string
  participantData?: ParticipantData
  onSaveResponse?: (
    answers: SurveyAnswers,
    completed?: boolean,
    seeds?: Record<string, number>,
    language?: string,
  ) => Promise<void>
  onLanguageChange?: (lang: string) => void
  onPrint?: () => void
  onComplete?: (answers: SurveyAnswers) => void
}

export const Survey: React.FC<Props> = ({
  settingSurvey,
  survey,
  authToken,
  initAnswers = {},
  initSeeds = {},
  initLanguage,
  participantData = {},
  onSaveResponse,
  onLanguageChange,
  onPrint,
  onComplete,
}) => {
  const [showIndexBurgerMenu, setShowIndexBurgerMenu] = React.useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [randomSeeds, setrandomSeeds] =
    useState<Record<string, number>>(initSeeds)
  settingSurvey = settingSurvey || new SettingSurvey(settingSurvey)

  const {
    langCurrent,
    setLangCurrent,
    langDefault,
    countdown,
    setCountdown,
    answers,
    handleAnswerChange,
  } = useSurveyState({
    survey,
    settingSurvey,
    initAnswers,
    initLanguage,
    participantLanguage:
      typeof participantData.language === 'string'
        ? participantData.language
        : undefined,
  })

  // Ref for synchronous access to latest answers when saving seeds
  const answersRef = useLatestRef(answers)

  const presentation: SurveyPresentationConfig = survey?.getPresentation(
    settingSurvey,
  ) || {
    format: 'all' as const,
    title: false,
    progressBar: false,
    questionCount: false,
    groupName: true,
    groupDesc: false,
    questionNum: false,
    questionCode: false,
    questionIndex: false,
    backNav: false,
    navDelay: 0,
    welcomeMessage: false,
  }

  const contentFormat: SurveyContentFormatConfig = useMemo(() => {
    const content = survey?.getContentFormat(settingSurvey) || {
      htmlAllowed: false,
      markdownAllowed: true,
      scriptTagsAllowed: false,
    }
    return {
      format: resolveContentFormat(content),
      scriptTagsAllowed: content.scriptTagsAllowed,
    }
  }, [survey, settingSurvey])

  const languageConfig = survey?.getLanguage(settingSurvey) || {
    default: 'en',
    options: ['en'],
  }
  const langOptions = languageConfig.options

  const dataPolicy: SurveyPolicyConfig = survey?.dataPolicy || {
    show: false,
    text: { getLang: () => '' },
  }
  const legalNotice: SurveyPolicyConfig = survey?.legalNotice || {
    show: false,
    text: { getLang: () => '' },
  }
  const format = presentation.format || 'all'

  // Use the survey's applySortOrder method to ensure groups and questions are sorted correctly.
  // Shared with SurveyProgressBar so its group-index lookups match allQuestions' group order.
  const sortedSurvey = useMemo(
    () =>
      typeof survey?.applySortOrder === 'function'
        ? survey.applySortOrder()
        : survey,
    [survey],
  )

  // The full ordered render list: questions and content elements interleaved in
  // `elementIds` order, each paired with its section. Falls back to a
  // questions-only list when the survey does not expose `elements` (older mock
  // shapes in tests).
  const orderedElements: SurveyRenderItem[] = useMemo(() => {
    if (!survey?.sections || !survey?.sectionIds) return []
    if (!sortedSurvey) return []

    const sectionMap = new Map<string, SurveySection>()
    Array.from(sortedSurvey.sections ?? []).forEach((g) => {
      sectionMap.set((g as SurveySection)._id, g as SurveySection)
    })

    const ordered = Array.from(sortedSurvey.elements ?? []) as Array<
      SurveyQuestion | SurveyContent
    >

    return ordered
      .map((el): SurveyRenderItem | null => {
        const section = el.sectionId ? sectionMap.get(el.sectionId) : undefined
        if (!section) return null
        return isSurveyContent(el)
          ? {
              kind: 'content',
              element: el,
              section,
            }
          : { kind: 'question', question: el as SurveyQuestion, group: section }
      })
      .filter((item): item is SurveyRenderItem => item !== null)
  }, [survey, sortedSurvey])

  const allQuestions = useMemo<QuestionWithGroup[]>(
    () =>
      orderedElements
        .filter(isQuestionItem)
        .map(({ question, group }) => ({ question, group })),
    [orderedElements],
  )

  // Build questions info for condition evaluation and expression resolution.
  // `text`/`detail`/`answerOptions`/`subquestions` are resolved for the live
  // language so `text.*` / `answerLabels.*` expression tokens have labels to
  // render; condition evaluation ignores those fields.
  const questionsInfo: QuestionInfo[] = useMemo(() => {
    return allQuestions.map(
      ({ question }: QuestionWithGroup, index: number) => ({
        ...buildQuestionInfoBase(question, index),
        choiceFormat: question.attributes?.choiceFormat,
        text: question.text?.getLang(langCurrent, langDefault),
        detail: question.detail?.getLang(langCurrent, langDefault),
        answerOptions: buildAnswerOptionsForQuestion(question, (ao) =>
          ao.label?.getLang(langCurrent, langDefault),
        ),
        choiceOtherValue: getChoiceOtherValue(question),
        subquestions: question.subquestions?.map((sq) => ({
          code: sq.code,
          text: sq.text?.getLang(langCurrent, langDefault),
          type: sq.type,
        })),
      }),
    )
  }, [allQuestions, langCurrent, langDefault])

  // Group metadata for `text.<groupCode>` resolution/validation. A group's
  // position is the position of its first question, so its text obeys the
  // same forward-reference rule as a question.
  const groupsInfo: GroupInfo[] = useMemo(() => {
    const firstIndexByGroup = new Map<string, number>()
    allQuestions.forEach(({ group }: QuestionWithGroup, index: number) => {
      if (!firstIndexByGroup.has(group._id)) {
        firstIndexByGroup.set(group._id, index)
      }
    })
    return (Array.from(sortedSurvey?.sections ?? []) as SurveySection[])
      .filter((group) => firstIndexByGroup.has(group._id))
      .map((group: SurveySection) => ({
        code: group.code,
        position: firstIndexByGroup.get(group._id) ?? 0,
        name: group.name?.getLang(langCurrent, langDefault),
        desc: group.desc?.getLang(langCurrent, langDefault),
      }))
  }, [sortedSurvey, allQuestions, langCurrent, langDefault])

  // Position-scoped expression context factory - built here so every
  // `ExpressionContextBuilder.build` call lives in one file and the format
  // components stay pass-through. Given only the answers/questions/groups
  // strictly before `priorCount` (index in allQuestions), so a later
  // `answers.*` / `answerLabels.*` / `text.*` reference is absent and its
  // token is left literal, matching the editor's variable-picker offer set.
  const buildScopedExpressionContext = useCallback(
    (priorCount: number): ExpressionContext => {
      const priorAnswers = allQuestions
        .slice(0, priorCount)
        .map(({ question }: QuestionWithGroup) => ({
          questionCode: question.code,
          value: answers[question.code],
        }))
      return ExpressionContextBuilder.build(
        participantData,
        priorAnswers,
        questionsInfo.filter((q) => q.position < priorCount),
        { language: langCurrent },
        groupsInfo.filter((g) => g.position < priorCount),
      )
    },
    [
      allQuestions,
      questionsInfo,
      groupsInfo,
      answers,
      participantData,
      langCurrent,
    ],
  )

  const getQuestionExpressionContext = useCallback(
    (questionId: string): ExpressionContext => {
      const index = allQuestions.findIndex(
        (item: QuestionWithGroup) => item.question._id === questionId,
      )
      return buildScopedExpressionContext(
        index < 0 ? allQuestions.length : index,
      )
    },
    [allQuestions, buildScopedExpressionContext],
  )

  const getGroupExpressionContext = useCallback(
    (groupId: string): ExpressionContext => {
      const index = allQuestions.findIndex(
        (item: QuestionWithGroup) => item.group._id === groupId,
      )
      return buildScopedExpressionContext(index < 0 ? 0 : index)
    },
    [allQuestions, buildScopedExpressionContext],
  )

  // A content element sees only the questions strictly before it in survey
  // order (its running question count), matching the forward-reference rule
  // applied to question text.
  const getContentExpressionContext = useCallback(
    (elementId: string): ExpressionContext => {
      const index = orderedElements.findIndex(
        (item) => isContentItem(item) && item.element._id === elementId,
      )
      const priorQuestions =
        index < 0
          ? allQuestions.length
          : orderedElements.slice(0, index).filter(isQuestionItem).length
      return buildScopedExpressionContext(priorQuestions)
    },
    [orderedElements, allQuestions.length, buildScopedExpressionContext],
  )

  // Filter the ordered render list by section + element conditions - questions
  // and content elements alike. Re-evaluate when answers change.
  const visibleElements = useMemo<SurveyRenderItem[]>(() => {
    if (!orderedElements.length) return []

    // Build condition context from current state.
    // For object-format answers, selectedOptionCodes is derived from object keys.
    const surveyAnswers = Object.entries(answers).map(([code, value]) => ({
      questionCode: code,
      value,
      selectedOptionCodes:
        typeof value === 'object' && value !== null && !Array.isArray(value)
          ? Object.keys(value).filter(
              (k) => (value as Record<string, unknown>)[k],
            )
          : value
            ? [value]
            : [],
    }))

    // participant.* always reflects the participant's stored profile data;
    // the live, currently-selected content language is exposed separately as
    // response.language (see ExpressionContextBuilder.build).
    const context = ExpressionContextBuilder.build(
      participantData,
      surveyAnswers,
      questionsInfo,
      { language: langCurrent },
    )

    // Forward-reference position of each entity = the running count of
    // questions strictly before it (content elements never consume a
    // position). A section's position is its first question's. An invalid
    // condition (unknown code, disallowed forward reference, bad syntax) fails
    // open - the gated element shows.
    const questionPositionById = new Map<string, number>()
    const contentPositionById = new Map<string, number>()
    const sectionPositions = new Map<string, number>()
    let questionCount = 0
    orderedElements.forEach((item) => {
      const sectionId =
        item.kind === 'question' ? item.group._id : item.section._id
      if (!sectionPositions.has(sectionId)) {
        sectionPositions.set(sectionId, questionCount)
      }
      if (item.kind === 'question') {
        questionPositionById.set(item.question._id, questionCount)
        questionCount += 1
      } else {
        contentPositionById.set(item.element._id, questionCount)
      }
    })

    const sectionConditionCache = new Map<string, boolean>()
    const sectionVisible = (section: SurveySection): boolean => {
      if (!section.condition) return true
      if (!sectionConditionCache.has(section._id)) {
        sectionConditionCache.set(
          section._id,
          ConditionEvaluator.evaluateIfValid(
            section.condition,
            context,
            questionsInfo,
            sectionPositions.get(section._id) ?? 0,
          ).shouldShow,
        )
      }
      return sectionConditionCache.get(section._id) as boolean
    }

    return orderedElements.filter((item) => {
      if (item.kind === 'question') {
        if (!sectionVisible(item.group)) return false
        if (!item.question.condition) return true
        return ConditionEvaluator.evaluateIfValid(
          item.question.condition,
          context,
          questionsInfo,
          questionPositionById.get(item.question._id) ?? 0,
        ).shouldShow
      }
      if (!sectionVisible(item.section)) return false
      if (!item.element.condition) return true
      return ConditionEvaluator.evaluateIfValid(
        item.element.condition,
        context,
        questionsInfo,
        contentPositionById.get(item.element._id) ?? 0,
      ).shouldShow
    })
  }, [orderedElements, questionsInfo, answers, participantData, langCurrent])

  const answerableQuestions = useMemo<QuestionWithGroup[]>(
    () =>
      visibleElements
        .filter(isQuestionItem)
        .map(({ question, group }) => ({ question, group })),
    [visibleElements],
  )

  const hasLangSelectQuestion = useMemo(() => {
    return answerableQuestions.some(
      ({ question }: QuestionWithGroup) =>
        question.type === QUESTION_TYPE_SURVEY_LANG_SELECT,
    )
  }, [answerableQuestions])

  // Full answers/participant/response scope for the thank-you message - no
  // forward-reference restriction applies since it renders after every
  // question has been answered.
  const expressionContext = useMemo(() => {
    const surveyAnswers = Object.entries(answers).map(([code, value]) => ({
      questionCode: code,
      value,
    }))
    return ExpressionContextBuilder.build(
      participantData,
      surveyAnswers,
      questionsInfo,
      { language: langCurrent },
      groupsInfo,
    )
  }, [answers, participantData, questionsInfo, groupsInfo, langCurrent])

  // Welcome message scope: participant.* / response.* / labels.* only. Built
  // with NO answers - the welcome screen renders before any question and
  // re-appears on resume with initAnswers already populated, so a
  // `{{answers.*}}` / `{{answerLabels.*}}` token must resolve to nothing here.
  const welcomeExpressionContext = useMemo(
    () =>
      ExpressionContextBuilder.build(
        participantData,
        [],
        questionsInfo,
        { language: langCurrent },
        groupsInfo,
      ),
    [participantData, questionsInfo, groupsInfo, langCurrent],
  )

  const {
    showWelcome,
    currentGroupIndex,
    currentQuestionIndex,
    canGoBack,
    isLastView,
    performNavigation,
    handleBack,
    handleWelcomeContinue: originalHandleWelcomeContinue,
    handleQuestionIndexContinue,
    handleQuestionIndexBack,
    canGoBackFromQuestionIndex,
    handleQuestionIndexClick,
    shouldShowWelcome,
    shouldShowQuestionIndex,
  } = useSurveyNavigation(
    format,
    presentation,
    dataPolicy,
    legalNotice,
    survey,
    visibleElements,
  )

  // `currentQuestionIndex` walks the full ordered list (content pages
  // included); this is the equivalent index into the answerable-only list, for
  // consumers (validation, progress, index menu) that count questions only.
  const answerableIndexOfCurrent = useMemo(
    () =>
      visibleElements.slice(0, currentQuestionIndex + 1).filter(isQuestionItem)
        .length - 1,
    [visibleElements, currentQuestionIndex],
  )

  const currentItemIsContent =
    visibleElements[currentQuestionIndex]?.kind === 'content'

  const handleWelcomeContinue = () => {
    saveResponseIfParticipant()
    originalHandleWelcomeContinue()
  }

  const {
    validationErrors,
    validateQuestion,
    validateCurrentView,
    validateAllAnswers,
    hasRequiredQuestionsInCurrentView,
  } = useSurveyValidation(answerableQuestions, langCurrent, langDefault)

  const { getTotalItems, getAnsweredCount, getProgressPercentage } = useMemo(
    () => createProgressUtils(answerableQuestions, answers),
    [answerableQuestions, answers],
  )

  useEffect(() => {
    const delay = presentation.navDelay || 0
    if (delay > 0) {
      setCountdown(delay)
    }
  }, [
    presentation.navDelay,
    currentGroupIndex,
    currentQuestionIndex,
    showWelcome,
    setCountdown,
  ])

  useEffect(() => {
    if (!isCompleted || !presentation.redirectEnd) return
    const linkUrl = survey?.thankYouSection?.config?.link?.url
    const redirectUrl = linkUrl
      ? new L10n(linkUrl).getLang(langCurrent, langDefault)
      : undefined
    if (redirectUrl) {
      window.location.href = redirectUrl
    }
  }, [isCompleted, presentation.redirectEnd, survey, langCurrent, langDefault])

  const titleText =
    survey != null && presentation.title && langCurrent
      ? survey.title?.getLang(langCurrent, langDefault) || survey.name || ''
      : ''

  const title = titleText ? (
    <h1
      className="survey-title"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(titleText) }}
    ></h1>
  ) : null

  const saveResponseIfParticipant = async (completed?: boolean) => {
    if (onSaveResponse && authToken) {
      try {
        setSaveError(null)
        await onSaveResponse(answers, completed, randomSeeds, langCurrent)
      } catch (error) {
        const fallbackMessage =
          'We were not able to save your answers. Please try again.'
        setSaveError(
          error instanceof Error && error.message
            ? error.message
            : fallbackMessage,
        )
      }
    }
  }

  const handleSeedRequired = useCallback(
    (key: string, seed: number) => {
      setrandomSeeds((prev) => {
        if (prev[key] !== undefined) return prev
        const updated = { ...prev, [key]: seed }
        // Fire-and-forget: persist seed immediately so it survives a browser close
        onSaveResponse?.(answersRef.current, false, updated, langCurrent)
        return updated
      })
    },
    [onSaveResponse, answersRef, langCurrent],
  )

  // In `question` format the validation helpers index the answerable-only list;
  // `currentQuestionIndex` spans content pages, so project it. A content page
  // has nothing to validate.
  const validationViewIndex =
    format === 'question' ? answerableIndexOfCurrent : currentQuestionIndex

  const handleContinue = () => {
    if (countdown > 0) return

    if (format === 'question' && currentItemIsContent) {
      saveResponseIfParticipant()
      performNavigation()
      return
    }

    const needsValidation = hasRequiredQuestionsInCurrentView(
      format,
      survey,
      currentGroupIndex,
      validationViewIndex,
    )

    if (needsValidation) {
      validateCurrentViewAndNavigate()
    } else {
      saveResponseIfParticipant()
      performNavigation()
    }
  }

  const validateCurrentViewAndNavigate = async () => {
    const isCurrentViewValid = await validateCurrentView(
      format,
      survey,
      currentGroupIndex,
      validationViewIndex,
      answers,
    )
    if (!isCurrentViewValid) {
      debug('Validation failed. Cannot navigate.')
      return
    }
    saveResponseIfParticipant()
    performNavigation()
  }

  const handleLanguageChange = (lang: string) => {
    setLangCurrent(lang)
    onLanguageChange?.(lang)
  }

  const enhancedHandleAnswerChange = async (
    questionCode: string,
    value: unknown,
  ) => {
    const question = Array.from(survey?.elements ?? []).find(
      (q) => q.code === questionCode,
    )

    if (
      question?.type === QUESTION_TYPE_SURVEY_LANG_SELECT &&
      typeof value === 'string' &&
      value
    ) {
      if (langOptions.includes(value)) {
        handleLanguageChange(value)
      }
    }

    handleAnswerChange(questionCode, value)
    await validateQuestion(questionCode, value)
  }

  const handleSubmit = async () => {
    if (countdown > 0) return

    const isValid = await validateAllAnswers(answers)
    if (!isValid) {
      debug('Validation failed. Errors:', validationErrors)
      return
    }

    await saveResponseIfParticipant(true)

    debug('Survey submitted with answers:', answers)

    setIsCompleted(true)
    onComplete?.(answers)
  }

  const availableLanguages = langOptions

  const renderContent = () => {
    if (isCompleted) {
      return (
        <SurveyThankYou
          survey={survey}
          contentFormat={contentFormat}
          lang={langCurrent}
          langDefault={langDefault}
          showLink={presentation.thankYouLink ?? false}
          showPrint={presentation.print ?? undefined}
          onPrint={onPrint}
          expressionContext={expressionContext}
        />
      )
    }

    if (shouldShowWelcome()) {
      return (
        <SurveyWelcome
          survey={survey}
          presentation={presentation}
          contentFormat={contentFormat}
          lang={langCurrent}
          langDefault={langDefault}
          expressionContext={welcomeExpressionContext}
          onContinue={handleWelcomeContinue}
          countdown={countdown}
        />
      )
    }

    if (shouldShowQuestionIndex()) {
      return (
        <SurveyIndex
          lang={langCurrent}
          langDefault={langDefault}
          allQuestions={answerableQuestions}
          onContinue={handleQuestionIndexContinue}
          onBack={handleQuestionIndexBack}
          canGoBack={canGoBackFromQuestionIndex()}
        />
      )
    }

    switch (format) {
      case 'group':
        return (
          <SurveyFormatGroup
            survey={survey}
            presentation={presentation}
            contentFormat={contentFormat}
            lang={langCurrent}
            langDefault={langDefault}
            langOptions={langOptions}
            allElements={visibleElements}
            currentGroupIndex={currentGroupIndex}
            answers={answers}
            participantData={participantData}
            onAnswerChange={enhancedHandleAnswerChange}
            getQuestionExpressionContext={getQuestionExpressionContext}
            getGroupExpressionContext={getGroupExpressionContext}
            getContentExpressionContext={getContentExpressionContext}
            validationErrors={validationErrors}
          />
        )
      case 'question':
        return (
          <SurveyFormatQuestion
            survey={survey}
            presentation={presentation}
            contentFormat={contentFormat}
            lang={langCurrent}
            langDefault={langDefault}
            langOptions={langOptions}
            allElements={visibleElements}
            currentQuestionIndex={currentQuestionIndex}
            answers={answers}
            participantData={participantData}
            onAnswerChange={enhancedHandleAnswerChange}
            getQuestionExpressionContext={getQuestionExpressionContext}
            getGroupExpressionContext={getGroupExpressionContext}
            getContentExpressionContext={getContentExpressionContext}
            validationErrors={validationErrors}
          />
        )
      case 'all':
      default:
        return (
          <SurveyFormatAll
            survey={survey}
            presentation={presentation}
            contentFormat={contentFormat}
            lang={langCurrent}
            langDefault={langDefault}
            langOptions={langOptions}
            allElements={visibleElements}
            answers={answers}
            participantData={participantData}
            onAnswerChange={enhancedHandleAnswerChange}
            getQuestionExpressionContext={getQuestionExpressionContext}
            getGroupExpressionContext={getGroupExpressionContext}
            getContentExpressionContext={getContentExpressionContext}
            validationErrors={validationErrors}
          />
        )
    }
  }

  const showMenuButton =
    !isCompleted &&
    !shouldShowWelcome() &&
    !shouldShowQuestionIndex() &&
    presentation.questionIndex

  const welcomeEnabled = !!(
    presentation.welcomeMessage ||
    dataPolicy.show ||
    legalNotice.show
  )

  const isFirstPage = welcomeEnabled
    ? shouldShowWelcome()
    : presentation.questionIndex
      ? shouldShowQuestionIndex()
      : format === 'all' ||
        (format === 'group' && currentGroupIndex === 0) ||
        (format === 'question' && currentQuestionIndex === 0)

  const showLangSelector =
    !isCompleted &&
    isFirstPage &&
    (shouldShowWelcome() ||
      shouldShowQuestionIndex() ||
      !hasLangSelectQuestion) &&
    availableLanguages?.length > 1

  const showProgressBar =
    !isCompleted && !shouldShowWelcome() && !shouldShowQuestionIndex()

  const showSurveyNavigation =
    !isCompleted && !shouldShowWelcome() && !shouldShowQuestionIndex()

  return (
    <RandomisationContext.Provider
      value={{ randomSeeds, onSeedRequired: handleSeedRequired }}
    >
      <>
        {(showMenuButton || title || showLangSelector) && (
          <>
            <div className="survey-header py-6 flex row justify-between items-center">
              <div className="flex items-center gap-3">
                {showMenuButton && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowIndexBurgerMenu(true)}
                    aria-label="Question Index Menu"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                )}
                <div>{title}</div>
              </div>
              {showLangSelector && (
                <LanguageSelector
                  availableLanguages={availableLanguages}
                  langEditing={langCurrent}
                  onLanguageChange={handleLanguageChange}
                />
              )}
            </div>
            <Separator className="mb-6" />
          </>
        )}

        <div className="survey-body pb-6">
          {saveError && (
            <Alert variant="destructive" className="mb-4 relative">
              <AlertDescription>{saveError}</AlertDescription>
              <button
                onClick={() => setSaveError(null)}
                className={
                  `absolute top-2 right-2 ` +
                  `text-destructive-foreground/50 hover:text-destructive-foreground`
                }
              >
                ✕
              </button>
            </Alert>
          )}

          {showProgressBar && (
            <div className="survey-progress-section mb-6">
              <SurveyProgressBar
                format={format}
                presentation={presentation}
                getAnsweredCount={getAnsweredCount}
                getTotalItems={getTotalItems}
                getProgressPercentage={getProgressPercentage}
                allQuestions={answerableQuestions}
                visibleElements={visibleElements}
                survey={sortedSurvey}
                currentGroupIndex={currentGroupIndex}
                currentQuestionIndex={currentQuestionIndex}
              />
            </div>
          )}

          <div className="survey-content-section">{renderContent()}</div>
        </div>

        {showSurveyNavigation && (
          <>
            <Separator className="mb-6" />
            <div className="survey-footer pb-8">
              <SurveyNavigation
                format={format}
                presentation={presentation}
                currentGroupIndex={currentGroupIndex}
                currentQuestionIndex={currentQuestionIndex}
                canGoBack={canGoBack()}
                isLastView={isLastView()}
                onContinue={handleContinue}
                onBack={handleBack}
                onSubmit={handleSubmit}
                countdown={countdown}
              />
            </div>
          </>
        )}

        <SurveyIndexMenu
          survey={survey}
          lang={langCurrent}
          langDefault={langDefault}
          allQuestions={answerableQuestions}
          currentQuestionIndex={answerableIndexOfCurrent}
          onQuestionClick={handleQuestionIndexClick}
          show={showIndexBurgerMenu}
          onHide={() => setShowIndexBurgerMenu(false)}
        />
      </>
    </RandomisationContext.Provider>
  )
}
