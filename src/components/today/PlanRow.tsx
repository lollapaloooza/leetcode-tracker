import type { ReactNode } from 'react'
import { DifficultyDot, DifficultyTag } from '@/components/DifficultyTag'
import { ProblemTitle } from '@/components/problem-bits'
import type { Problem } from '@/data/problems'
import { cn } from '@/lib/_utils/cn'
import { useUI } from '@/lib/store'
import { DragHandle, HandleSpacer } from './PlanBoard'
import { RemoveButton } from './RemoveButton'
import type { SortableRow } from './useSortableRow'
import { useRowExit } from './useRowExit'

interface PlanRowProps {
  problem: Problem
  /** Drag wiring; a row that can't move gets a spacer instead of a grip, so columns line up */
  sortable?: SortableRow
  /** The mark at the start: a circle to log, a done mark, or nothing */
  leading?: ReactNode
  /** The short line beside (on phones, under) the title */
  meta: ReactNode
  /** Just before the ✕, like a Start button */
  trailing?: ReactNode
  /** The ✕: what it does, e.g. "Remove LRU Cache from today". Without it, a spacer keeps columns lined up. */
  remove?: { label: string; onRemove: () => void }
  /** Finished: the title steps back */
  muted?: boolean
}

/** One line per problem, the same in every Today list: grip, mark, title and meta, difficulty, action, ✕. */
export function PlanRow({ problem, sortable, leading, meta, trailing, remove, muted }: PlanRowProps) {
  const exit = useRowExit(remove?.onRemove)
  const highlighted = useUI((s) => s.highlighted === problem.id)

  return (
    <li
      ref={sortable?.ref}
      style={sortable?.style}
      {...sortable?.rowProps}
      onAnimationEnd={exit.onAnimationEnd}
      className={cn(
        'flex min-h-13 items-center gap-2 py-1.5 pr-2 pl-3 transition-colors hover:bg-muted/40 sm:gap-3 sm:pr-3 sm:pl-1.5',
        // Held to drag on phones: no text selection or iOS callout on the way.
        sortable && 'touch-manipulation max-sm:select-none max-sm:[-webkit-touch-callout:none]',
        sortable?.dragging && 'bg-muted/60 opacity-50',
        highlighted && 'animate-arrive',
        exit.leaving && 'pointer-events-none animate-row-out overflow-hidden',
      )}
    >
      {/* Phones have no grip: a long press on the row picks it up. */}
      {sortable ? (
        <DragHandle label={`Move ${problem.title}`} className="max-sm:hidden" {...sortable.handleProps} />
      ) : (
        <HandleSpacer />
      )}
      <span className="grid size-6 shrink-0 place-items-center">{leading}</span>
      <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2.5">
        <ProblemTitle problem={problem} className={cn('text-sm font-medium', muted && 'text-muted-foreground')} />
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">{meta}</span>
          {/* Phones have no difficulty column, so it joins the meta line. */}
          <span className="inline-flex shrink-0 items-center gap-1.5 sm:hidden">
            <span aria-hidden>·</span>
            <DifficultyDot difficulty={problem.difficulty} />
            {problem.difficulty}
          </span>
        </span>
      </div>
      <DifficultyTag difficulty={problem.difficulty} className="w-16 shrink-0 max-sm:hidden" />
      {trailing}
      {remove && exit.exit ? <RemoveButton label={remove.label} onClick={exit.exit} /> : <span aria-hidden className="w-8 shrink-0 max-sm:w-9" />}
    </li>
  )
}
