'use client'

import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface InfoTooltipProps {
  text: string
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-help"
            aria-label="More info"
          />
        }
      >
        <Info className="h-3.5 w-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top">{text}</TooltipContent>
    </Tooltip>
  )
}
