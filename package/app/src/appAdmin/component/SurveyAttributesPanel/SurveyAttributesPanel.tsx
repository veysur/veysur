import React, { useState } from 'react'
import { SurveyEntity } from 'veysur-common'
import {
  FileText,
  CircleHelp,
  Layers,
  Eye,
  EyeOff,
  Search,
  CheckSquare,
  List,
  AlignLeft,
} from 'lucide-react'

import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Badge } from 'component/shadcn/badge'
import { Button } from 'component/shadcn/button'
import { Separator } from 'component/shadcn/separator'
import {
  useSurveyEditorStore,
  SURVEY_ENTITY_TYPE_SURVEY,
  SURVEY_ENTITY_TYPE_TITLE,
  SURVEY_ENTITY_TYPE_NAME,
  SURVEY_ENTITY_TYPE_WELCOME,
  SURVEY_ENTITY_TYPE_SECTION,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_THANK_YOU,
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
  SURVEY_ENTITY_TYPE_CONTENT,
} from 'appAdmin/component/SurveyEditor'

import { AttributeConfig } from './attributesConfig'
import { useAttributeSets } from './hook'
import { AttributeSet } from './AttributeSet'

type ChangeComponentEventHandler = (
  attributeConfig: AttributeConfig,
  value: unknown,
) => void

export interface SurveyAttributesPanelProps {
  entity: SurveyEntity | undefined
}

export const SurveyAttributesPanel: React.FC<SurveyAttributesPanelProps> =
  function ({ entity }) {
    const operations = useSurveyEditorStore((state) => state.operations)
    const surveyFocus = useSurveyEditorStore((state) => state.surveyFocus)
    const langEditing = useSurveyEditorStore((state) => state.langEditing)
    const attributeSets = useAttributeSets(entity, surveyFocus)

    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
      new Set(),
    )
    const [showAdvanced, setShowAdvanced] = useState(false)

    const isSurvey = [
      SURVEY_ENTITY_TYPE_SURVEY,
      SURVEY_ENTITY_TYPE_NAME,
      SURVEY_ENTITY_TYPE_TITLE,
      SURVEY_ENTITY_TYPE_WELCOME,
      SURVEY_ENTITY_TYPE_THANK_YOU,
    ].includes(surveyFocus?.entityType || '')
    const isQuestion = surveyFocus?.entityType === SURVEY_ENTITY_TYPE_ELEMENT
    const isGroup = surveyFocus?.entityType === SURVEY_ENTITY_TYPE_SECTION
    const isAnswerOption =
      surveyFocus?.entityType === SURVEY_ENTITY_TYPE_ANSWER_OPTION
    const isSubquestion =
      surveyFocus?.entityType === SURVEY_ENTITY_TYPE_SUBQUESTION
    const isContent = surveyFocus?.entityType === SURVEY_ENTITY_TYPE_CONTENT

    const handleOnChangeValue: ChangeComponentEventHandler = (
      attributeConfig,
      value,
    ) => {
      if (attributeConfig.onChange) {
        attributeConfig.onChange(value, operations, surveyFocus, langEditing)
      }
    }

    const toggleSectionCollapse = (sectionId: string) => {
      setCollapsedSections((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(sectionId)) {
          newSet.delete(sectionId)
        } else {
          newSet.add(sectionId)
        }
        return newSet
      })
    }

    const getEntityIcon = () => {
      if (isSurvey) return <FileText className="h-4 w-4" />
      if (isQuestion) return <CircleHelp className="h-4 w-4" />
      if (isGroup) return <Layers className="h-4 w-4" />
      if (isAnswerOption) return <CheckSquare className="h-4 w-4" />
      if (isSubquestion) return <List className="h-4 w-4" />
      if (isContent) return <AlignLeft className="h-4 w-4" />
      return null
    }

    const getEntityTypeName = () => {
      if (isSurvey) return 'Survey'
      if (isQuestion) return 'Question'
      if (isGroup) return 'Group'
      if (isAnswerOption) return 'Answer Option'
      if (isSubquestion) return 'Subquestion'
      if (isContent) return 'Content'
      return 'Entity'
    }

    const basicSets = attributeSets.filter((set) => set.id === 'basic')
    const advancedSets = attributeSets.filter((set) => set.id !== 'basic')

    if (!entity) {
      return (
        <div className="p-4">
          <Alert className="w-full p-4">
            <Search className="h-4 w-4" />
            <AlertDescription>
              Select an element in the survey to view and edit its attributes.
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    if (!surveyFocus) return null

    return (
      <div className="w-full">
        <div className="px-2 py-3">
          <div className="flex items-center gap-2">
            {getEntityIcon()}
            <h4 className="text-sm font-semibold">
              {getEntityTypeName()} Attributes
            </h4>
          </div>

          {advancedSets.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-start gap-2 h-8"
            >
              {showAdvanced ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              <span className="text-xs">
                {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
              </span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {advancedSets.reduce(
                  (sum, set) => sum + (set.attributes?.length || 0),
                  0,
                )}
              </Badge>
            </Button>
          )}
        </div>

        <Separator />

        <div className="p-2">
          {basicSets.map((setConfig) => (
            <AttributeSet
              key={setConfig.id}
              setConfig={setConfig}
              entity={entity}
              onChangeValue={handleOnChangeValue}
              langEditing={langEditing}
              isCollapsed={collapsedSections.has(setConfig.id)}
              onToggleCollapse={() => toggleSectionCollapse(setConfig.id)}
              collapsible={false}
              showCollapseToggle={
                setConfig.attributes && setConfig.attributes.length > 3
              }
            />
          ))}

          {showAdvanced && advancedSets.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 my-2">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">Advanced</span>
                <Separator className="flex-1" />
              </div>

              {advancedSets.map((setConfig) => (
                <AttributeSet
                  key={setConfig.id}
                  setConfig={setConfig}
                  entity={entity}
                  onChangeValue={handleOnChangeValue}
                  langEditing={langEditing}
                  isCollapsed={collapsedSections.has(setConfig.id)}
                  onToggleCollapse={() => toggleSectionCollapse(setConfig.id)}
                  showCollapseToggle={true}
                  isAdvanced={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
