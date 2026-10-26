import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { problemById, type Problem } from '@/data/problems'
import { isSolved } from '@/lib/domain'
import { useTracker } from '@/lib/store'
import { Fold } from './Fold'
import { forget, planFromBacklog } from './plan-actions'
import { PlanRow } from './PlanRow'

/** Problems taken off a plan, kept in view so they aren't lost. Suggest leaves them alone until you add one back. */
export function BacklogSection({ today }: { today: string }) {
  const backlog = useTracker((s) => s.backlog)
  const problems = backlog.flatMap((id) => problemById.get(id) ?? [])
  if (problems.length === 0) return null

  return (
    <Fold title="Backlog" count={problems.length}>
      <p className="mt-1 mb-2 text-xs text-muted-foreground">Taken off a plan to come back to. Suggest skips these until you add one back.</p>
      <ul aria-label="Backlog" className="divide-y overflow-hidden rounded-xl border border-dashed">
        {problems.map((problem) => (
          <BacklogRow key={problem.id} problem={problem} today={today} />
        ))}
      </ul>
    </Fold>
  )
}

function BacklogRow({ problem, today }: { problem: Problem; today: string }) {
  const isReview = useTracker((s) => isSolved(s.progress[problem.id]?.status))
  return (
    <PlanRow
      problem={problem}
      meta={`${problem.topic} · ${isReview ? 'Review' : 'New'}`}
      trailing={
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 max-sm:size-9 max-sm:rounded-full max-sm:px-0"
          aria-label={`Add ${problem.title} to today`}
          onClick={() => planFromBacklog(problem, today)}
        >
          <PlusIcon />
          <span className="max-sm:sr-only">Today</span>
        </Button>
      }
      remove={{ label: `Remove ${problem.title} from the backlog`, onRemove: () => forget(problem) }}
    />
  )
}
