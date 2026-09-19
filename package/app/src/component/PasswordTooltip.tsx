import { HelpCircle } from 'lucide-react'
import { PASSWORD_REQUIREMENTS } from 'veysur-common'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from 'component/shadcn/tooltip'

export function PasswordTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="inline-block ml-1 h-4 w-4 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent>
          <ul className="list-disc list-inside text-sm">
            {PASSWORD_REQUIREMENTS.map((requirement, index) => (
              <li key={index}>{requirement}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
