import React from 'react'
import { SurveyEntity } from 'veysur-common'
import { ChevronDown, ChevronRight, Settings } from 'lucide-react'

import { AttributeConfig, AttributeSetConfig } from './attributesConfig'
import { AttributeCard } from './AttributeCard'
import { Badge } from 'component/shadcn/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from 'component/shadcn/tooltip'

const TOOLTIP_DELAY_MS = 500

interface AttributeSetProps {
  setConfig: AttributeSetConfig
  entity: SurveyEntity
  onChangeValue: (attributeConfig: AttributeConfig, value: unknown) => void
  langEditing?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  collapsible?: boolean
  showCollapseToggle?: boolean
  isAdvanced?: boolean
}

export const AttributeSet: React.FC<AttributeSetProps> = ({
  setConfig,
  entity,
  onChangeValue,
  langEditing,
  isCollapsed = false,
  onToggleCollapse,
  collapsible = true,
  showCollapseToggle = false,
  isAdvanced = false,
}) => {
  const attributeCount = setConfig.attributes?.length || 0

  const header = collapsible ? (
    <div className="attribute-set-header flex items-center justify-between p-3 border-bottom">
      <div className="flex items-center">
        {isAdvanced && (
          <Settings className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
        )}
        <h6 className="mb-0">{setConfig.name}</h6>
        <Badge variant="secondary" className="ml-2">
          {attributeCount}
        </Badge>
      </div>
      {showCollapseToggle && onToggleCollapse && (
        <button
          className="btn btn-sm btn-link p-0 text-muted-foreground"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand section' : 'Collapse section'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  ) : null

  return (
    <div className={`attribute-set ${isAdvanced ? 'advanced-set' : ''}`}>
      {header}
      {!isCollapsed && (
        <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
          <div className="attribute-set-content p-3">
            {setConfig.attributes?.map((attributeConfig) => (
              <Tooltip key={`${setConfig.id}-${attributeConfig.id}`}>
                <TooltipTrigger asChild>
                  <div
                    className={`attribute-item ${isAdvanced ? 'advanced-attribute' : ''}`}
                  >
                    <AttributeCard
                      key={`${entity._id}-${attributeConfig.id}`}
                      attributeConfig={attributeConfig}
                      entity={entity}
                      onChangeValue={(value) =>
                        onChangeValue(attributeConfig, value)
                      }
                      getValue={attributeConfig.getValue}
                      langEditing={langEditing}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{attributeConfig.description || attributeConfig.name}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      )}
    </div>
  )
}
