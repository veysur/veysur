import React from 'react'
import { Globe, ChevronDown, Check } from 'lucide-react'
import { Iso639v1 } from 'veysur-common'

import { Button } from 'component/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'component/shadcn/dropdown-menu'
import { cn } from 'common/cn'

type ObjectKeys<T> = keyof T

type Props = {
  availableLanguages: string[]
  langEditing: string
  onLanguageChange: (language: string) => void
}

export const SurveyLanguageSelector: React.FC<Props> = ({
  availableLanguages,
  langEditing,
  onLanguageChange,
}) => {
  const hasLanguageOptions = availableLanguages.length > 1

  if (!hasLanguageOptions) return null

  return (
    <div className="language-selector">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="language-toggle flex items-center gap-2"
          >
            <Globe className="h-4 w-4" />
            <span className="language-text">
              {Iso639v1[langEditing as ObjectKeys<typeof Iso639v1>]?.name ||
                langEditing ||
                'Language'}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="language-menu">
          {availableLanguages.map((code) => (
            <DropdownMenuItem
              key={code}
              onClick={() => onLanguageChange(code)}
              className={cn(
                'language-item flex items-center justify-between',
                code === langEditing && 'bg-accent',
              )}
            >
              <span className="language-name">
                {Iso639v1[code as ObjectKeys<typeof Iso639v1>]?.name || code}
              </span>
              {code === langEditing && (
                <Check className="h-4 w-4 ml-auto text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
