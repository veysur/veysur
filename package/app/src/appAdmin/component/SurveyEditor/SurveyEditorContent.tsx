import React, { useMemo, useRef, useEffect, useState } from 'react'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import {
  isSurveyContent,
  isSurveyQuestion,
  SurveyContent,
  SurveyElementBase,
  SurveyQuestion,
  SurveySection,
} from 'veysur-common'

import { useSurveyEditorStore } from 'appAdmin/component/SurveyEditor'

import { SurveyEditorEmpty } from './SurveyEditorEmpty'
import { QuestionView } from './QuestionView'
import { ContentView } from './ContentView'
import { SurveyLanguageSelector } from './SurveyLanguageSelector'
import { AddElementPanel } from './AddElementPanel'
import { SurveyTitleInput } from './SurveyTitleInput'
import { SurveyWelcomeMessage } from './SurveyWelcomeMessage'
import { SurveyThankYouMessage } from './SurveyThankYouMessage'
import { QuestionGroupView } from './QuestionGroupView'

type SurveyItem =
  | { type: 'title' }
  | { type: 'welcome' }
  | {
      type: 'group-header'
      group: SurveySection
      index: number
      isLast: boolean
    }
  | {
      type: 'question'
      question: SurveyQuestion
      sectionId: string
      isFirst: boolean
      isLast: boolean
    }
  | {
      type: 'content'
      element: SurveyContent
      sectionId: string
      isFirst: boolean
      isLast: boolean
    }
  | { type: 'add-panel'; sectionId: string; prevElementId?: string }
  | { type: 'thank-you-footer' }

export const SurveyEditorContent: React.FC = () => {
  const survey = useSurveyEditorStore((state) => state.survey)
  const settingSurvey = useSurveyEditorStore((state) => state.defaults)

  const presentation = useMemo(
    () =>
      (settingSurvey && survey?.getPresentation(settingSurvey)) || undefined,
    [settingSurvey, survey],
  )

  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const setVirtuosoRef = useSurveyEditorStore((state) => state.setVirtuosoRef)
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null)

  const handleVirtuosoRef = (ref: VirtuosoHandle | null) => {
    virtuosoRef.current = ref
    setVirtuosoRef(ref)
  }

  useEffect(() => {
    return () => setVirtuosoRef(null)
  }, [setVirtuosoRef])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const findScrollParent = () => {
      const container = document.getElementById('survey-container')
      if (container) {
        const rect = container.getBoundingClientRect()
        if (rect.height > 0 && rect.width > 0) {
          setScrollParent(container)
        }
      }
    }

    const rafId = requestAnimationFrame(() => {
      // Add a small timeout to ensure layout is complete on page reload
      setTimeout(findScrollParent, 50)
    })

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [])

  const surveyItems = useMemo((): SurveyItem[] => {
    if (!survey?.sections) return []

    const items: SurveyItem[] = []
    const groupSections = survey.sections.groups()

    // Pre-compute element indices for O(1) lookup instead of O(n) findIndex
    const elementIndexMap = new Map(
      survey.elementIds.map((id, index) => [id, index]),
    )
    const totalElements = survey.elementIds.length

    // Pre-compute elements (questions + content) by section, in element order
    const elementsBySection = new Map<string, SurveyElementBase[]>()
    groupSections.forEach((group) => {
      elementsBySection.set(
        group._id,
        survey.elements.getBySectionId(group._id),
      )
    })

    if (presentation?.title === true) {
      items.push({ type: 'title' })
    }
    if (presentation?.welcomeMessage) {
      items.push({ type: 'welcome' })
    }

    groupSections.forEach((group, groupIndex) => {
      const isLastGroup = groupIndex === groupSections.length - 1
      items.push({
        type: 'group-header',
        group,
        index: groupIndex,
        isLast: isLastGroup,
      })

      const elements = elementsBySection.get(group._id) || []
      elements.forEach((entity) => {
        const idx = elementIndexMap.get(entity._id) ?? -1
        const isFirst = idx === 0 && groupIndex === 0
        const isLast = idx === totalElements - 1 && isLastGroup
        if (isSurveyContent(entity)) {
          items.push({
            type: 'content',
            element: entity,
            sectionId: group._id,
            isFirst,
            isLast,
          })
        } else if (isSurveyQuestion(entity)) {
          items.push({
            type: 'question',
            question: entity,
            sectionId: group._id,
            isFirst,
            isLast,
          })
        }
      })

      const lastElement = elements[elements.length - 1]
      items.push({
        type: 'add-panel',
        sectionId: group._id,
        prevElementId: lastElement?._id,
      })
    })

    items.push({
      type: 'thank-you-footer',
    })

    return items
  }, [survey, presentation])

  return (
    <>
      <div className="flex justify-between items-center mt-6 mx-14 pr-4">
        <div className="flex-grow" />
        <SurveyLanguageSelector />
      </div>

      <div className="survey-content-wrapper mt-6 mb-40 mx-14">
        <section className="survey-main-section">
          {survey?.sections.groups() && survey.sections.groups().length > 0 ? (
            <>
              {scrollParent && (
                <Virtuoso
                  ref={handleVirtuosoRef}
                  customScrollParent={scrollParent}
                  data={surveyItems}
                  increaseViewportBy={{ top: 200, bottom: 200 }}
                  defaultItemHeight={150}
                  itemContent={(_index, item) => {
                    if (item.type === 'title') {
                      return (
                        <section
                          key="title"
                          className="survey-header-section mb-10"
                        >
                          <SurveyTitleInput />
                        </section>
                      )
                    }

                    if (item.type === 'welcome') {
                      return (
                        <section key="welcome" className="mb-10">
                          <SurveyWelcomeMessage />
                        </section>
                      )
                    }

                    if (item.type === 'group-header') {
                      return (
                        <QuestionGroupView
                          key={item.group._id}
                          group={item.group}
                          index={item.index}
                          isLast={item.isLast}
                        />
                      )
                    }

                    if (item.type === 'question') {
                      return (
                        <QuestionView
                          key={item.question._id}
                          isFirst={item.isFirst}
                          isLast={item.isLast}
                          question={item.question}
                          presentation={presentation}
                        />
                      )
                    }

                    if (item.type === 'content') {
                      return (
                        <ContentView
                          key={item.element._id}
                          isFirst={item.isFirst}
                          isLast={item.isLast}
                          element={item.element}
                        />
                      )
                    }

                    if (item.type === 'add-panel') {
                      return (
                        <AddElementPanel
                          key={`add-panel-${item.sectionId}`}
                          sectionId={item.sectionId}
                          prevElementId={item.prevElementId}
                        />
                      )
                    }

                    if (item.type === 'thank-you-footer') {
                      return (
                        <section
                          key="thank-you-footer"
                          className="survey-footer-section my-10"
                        >
                          <SurveyThankYouMessage />
                        </section>
                      )
                    }

                    return null
                  }}
                />
              )}
              <div style={{ height: '20rem' }} />
            </>
          ) : (
            <SurveyEditorEmpty />
          )}
        </section>
      </div>
    </>
  )
}
