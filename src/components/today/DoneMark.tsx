import { PencilIcon, Undo2Icon } from 'lucide-react'
import { ResultGlyph, StatusGlyph } from '@/components/problem-bits'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Problem } from '@/data/problems'
import { RESULT_LABEL } from '@/lib/_consts/labels'
import { cn } from '@/lib/_utils/cn'
import { useTracker, useUI } from '@/lib/store'
import type { Attempt } from '@/types'

interface DoneMarkProps {
  problem: Problem
  attempt: Attempt | undefined
  today: string
}

/** How a finished problem went, as a mark that opens "edit" and "undo". */
export function DoneMark({ problem, attempt, today }: DoneMarkProps) {
  const openLog = useUI((s) => s.openLog)
  const undoAttempt = useTracker((s) => s.undoAttempt)
  const markUndone = useTracker((s) => s.markUndone)
  // Just logged: the mark pops in as the row lands here.
  const justDone = useUI((s) => s.highlighted === problem.id)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${problem.title}: ${attempt ? RESULT_LABEL[attempt.result] : 'done'}. Edit or undo`}
          className={cn('grid size-6 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50', justDone && 'animate-pop')}
        >
          {attempt ? <ResultGlyph result={attempt.result} /> : <StatusGlyph status="solved" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {attempt && (
          <DropdownMenuItem onSelect={() => openLog({ id: problem.id, editKey: attempt.key })}>
            <PencilIcon /> Edit attempt…
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => (attempt ? undoAttempt(attempt.key) : markUndone(problem.id, today))}>
          <Undo2Icon /> Undo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
