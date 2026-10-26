import { useId } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SparklesIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { problemById, type Problem } from '@/data/problems'
import { cn } from '@/lib/_utils/cn'
import { formatDay } from '@/lib/_utils/date'
import { problemIdOf } from './board-lists'
import { PlanRow } from './PlanRow'
import { removeFromDay } from './plan-actions'
import { useSortableRow } from './useSortableRow'
import { useTomorrow } from './useTomorrow'
import { useZone } from './useZone'

/** Choosing a problem is the hardest step after work — so do it the night before. */
export function TomorrowSection({ today, ids }: { today: string; ids: string[] }) {
  const headingId = useId()
  const tomorrow = useTomorrow(today)
  const { ref: dropRef, isOver } = useZone('tomorrow', ids.length === 0)

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-sm font-semibold">
          Tomorrow <span className="font-normal text-muted-foreground">· {formatDay(tomorrow.tomorrow)}</span>
        </h2>
        <Button variant="ghost" size="xs" className="text-link" onClick={tomorrow.pick}>
          <SparklesIcon />
          {tomorrow.pickLabel}
        </Button>
      </div>
      {ids.length === 0 ? (
        <p
          ref={dropRef}
          className={cn(
            'rounded-xl border border-dashed px-4 py-3 text-[13px] text-muted-foreground transition-colors',
            isOver && 'border-primary bg-primary/6 text-foreground',
          )}
        >
          Pick tomorrow's {tomorrow.goal === 1 ? 'problem' : 'problems'} tonight — or drag one here from today. After work you'll
          only need to press Start.
        </p>
      ) : (
        <ul ref={dropRef} aria-label="Tomorrow's problems" className="divide-y overflow-hidden rounded-xl border border-dashed">
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {ids.map((sid) => {
              const problem = problemById.get(problemIdOf(sid))
              return problem ? <TomorrowRow key={sid} sid={sid} problem={problem} day={tomorrow.tomorrow} reason={tomorrow.reasonFor(problem.id)} /> : null
            })}
          </SortableContext>
        </ul>
      )}
    </section>
  )
}

interface TomorrowRowProps {
  sid: string
  problem: Problem
  day: string
  reason: { text: string; highlight: boolean }
}

function TomorrowRow({ sid, problem, day, reason }: TomorrowRowProps) {
  const sortable = useSortableRow(sid)
  return (
    <PlanRow
      problem={problem}
      sortable={sortable}
      meta={
        <>
          {problem.topic} <span aria-hidden>·</span> <span className={cn(reason.highlight && 'text-link')}>{reason.text}</span>
        </>
      }
      remove={{ label: `Remove ${problem.title} from tomorrow`, onRemove: () => removeFromDay(problem, day) }}
    />
  )
}
