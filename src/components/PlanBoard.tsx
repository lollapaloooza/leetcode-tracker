import type { ComponentProps, ReactNode } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { GripVerticalIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROBLEMS } from '@/data/problems'
import { BoardKeys, problemIdOf, type usePlanBoard } from '@/lib/plan-board'
import { DifficultyDot, DifficultyTag } from './DifficultyTag'

const byId = new Map(PROBLEMS.map((p) => [p.id, p]))

export function PlanBoard({ board, children }: { board: ReturnType<typeof usePlanBoard>; children: ReactNode }) {
  const active = board.activeId ? byId.get(problemIdOf(board.activeId)) : undefined
  return (
    <DndContext {...board.contextProps}>
      <BoardKeys value={board.nudge}>{children}</BoardKeys>
      <div aria-live="polite" className="sr-only">
        {board.status}
      </div>
      <DragOverlay>
        {active && (
          <div className="flex h-full cursor-grabbing items-center gap-3 rounded-lg bg-card pr-4 pl-2 shadow-lg ring-1 ring-primary/40">
            <GripVerticalIcon className="size-4 shrink-0 text-muted-foreground" />
            <DifficultyDot difficulty={active.difficulty} />
            <span className="truncate text-sm font-medium">{active.title}</span>
            <DifficultyTag difficulty={active.difficulty} className="ml-auto" />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

export function DragHandle({ label, className, ...props }: ComponentProps<'button'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'grid h-8 w-5 shrink-0 cursor-grab touch-none place-items-center rounded text-muted-foreground/45 outline-none',
        'hover:text-muted-foreground focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing',
        className,
      )}
      {...props}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  )
}

/** Keeps columns lined up on rows that can't be dragged. */
export function HandleSpacer() {
  return <span aria-hidden className="w-5" />
}
