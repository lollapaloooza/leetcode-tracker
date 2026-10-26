import { CheckIcon, PlusIcon, RotateCcwIcon } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import type { Problem } from '@/data/problems'
import { formatShortDay } from '@/lib/_utils/date'
import { isDue } from '@/lib/domain'
import { useTracker } from '@/lib/store'
import { DifficultyTag } from './DifficultyTag'
import { ProblemLinks, ProblemTitle, StatusMenu } from './problem-bits'

export function ListRow({ problem, today }: { problem: Problem; today: string }) {
  const status = useTracker((s) => s.progress[problem.id]?.status ?? 'todo')
  const review = useTracker((s) => s.reviews[problem.id])
  const planned = useTracker((s) => Boolean(s.plans[today]?.some((p) => p.id === problem.id)))
  const setStatus = useTracker((s) => s.setStatus)
  const addToPlan = useTracker((s) => s.addToPlan)
  const removeFromPlan = useTracker((s) => s.removeFromPlan)

  return (
    <li className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40 max-sm:gap-2 max-sm:px-3">
      <StatusMenu status={status} title={problem.title} onChange={(next) => setStatus(problem.id, next, today)} />
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <ProblemTitle problem={problem} />
        {problem.premium && (
          <span className="shrink-0 rounded-md border px-1.5 py-px text-[11px] text-muted-foreground max-sm:hidden">
            LC Premium
          </span>
        )}
        {isDue(review, today) && (
          <RotateCcwIcon
            className="size-3.5 shrink-0 text-link"
            aria-label={`Review due since ${formatShortDay(review!.due!)}`}
          />
        )}
      </span>
      <DifficultyTag difficulty={problem.difficulty} className="w-16 max-sm:w-auto" />
      <ProblemLinks problem={problem} />
      <Toggle
        size="sm"
        variant="outline"
        pressed={planned}
        onPressedChange={(on) => (on ? addToPlan([problem.id], today) : removeFromPlan(problem.id, today))}
        aria-label={planned ? `Remove ${problem.title} from today` : `Add ${problem.title} to today`}
        className="h-7 rounded-full border-dashed px-2.5 text-xs text-muted-foreground data-[state=on]:border-transparent data-[state=on]:bg-primary/10 data-[state=on]:text-link max-sm:px-2"
      >
        {planned ? <CheckIcon strokeWidth={2.5} /> : <PlusIcon />}
        <span className="max-sm:sr-only">Today</span>
      </Toggle>
    </li>
  )
}
