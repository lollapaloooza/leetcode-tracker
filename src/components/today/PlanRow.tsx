import type { ReactNode } from 'react'
import { DifficultyDot, DifficultyTag } from '@/components/DifficultyTag'
import { ProblemTitle, RowMenu, type RowAction } from '@/components/problem-bits'
import type { Problem } from '@/data/problems'
import { cn } from '@/lib/_utils/cn'
import { DragHandle, HandleSpacer } from './PlanBoard'
import type { SortableRow } from './useSortableRow'

interface PlanRowProps {
  problem: Problem
  /** Drag wiring; a row that can't move gets a spacer instead of a grip, so columns line up */
  sortable?: SortableRow
  /** The mark at the start: a circle to log, a done mark, or nothing */
  leading?: ReactNode
  /** The short line beside (on phones, under) the title */
  meta: ReactNode
  /** Just before the ⋯ menu, like a Start button */
  trailing?: ReactNode
  actions: RowAction[]
  /** Finished: the title steps back */
  muted?: boolean
}

/** One line per problem, the same in every Today list: grip, mark, title and meta, difficulty, action, ⋯. */
export function PlanRow({ problem, sortable, leading, meta, trailing, actions, muted }: PlanRowProps) {
  return (
    <li
      ref={sortable?.ref}
      style={sortable?.style}
      {...sortable?.rowProps}
      className={cn(
        'flex min-h-13 items-center gap-2 py-1.5 pr-2 pl-3 transition-colors hover:bg-muted/40 sm:gap-3 sm:pr-3 sm:pl-1.5',
        // Held to drag on phones: no text selection or iOS callout on the way.
        sortable && 'touch-manipulation max-sm:select-none max-sm:[-webkit-touch-callout:none]',
        sortable?.dragging && 'bg-muted/60 opacity-50',
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
      <RowMenu title={problem.title} actions={actions} />
    </li>
  )
}
