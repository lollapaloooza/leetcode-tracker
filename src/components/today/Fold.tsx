import type { ReactNode } from 'react'
import { ChevronRightIcon } from 'lucide-react'

/** A titled group you can fold away with a click: its heading, a count, and a turning chevron. */
export function Fold({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <details open className="group/fold">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon aria-hidden className="size-4 text-muted-foreground transition-transform group-open/fold:rotate-90" />
        {title} <span className="text-xs font-medium text-muted-foreground tabular-nums">{count}</span>
      </summary>
      {children}
    </details>
  )
}
