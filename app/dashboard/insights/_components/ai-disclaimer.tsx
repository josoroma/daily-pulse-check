import { AlertTriangle } from 'lucide-react'

export const AiDisclaimer = () => (
  <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-500">
    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
    <span>AI-generated analysis. Not financial advice. Always do your own research.</span>
  </div>
)
