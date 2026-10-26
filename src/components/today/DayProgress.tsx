import { CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanItem } from '@/types'

/** Progress toward today's goal — problems past the goal count as a bonus, not as the bar to clear. */
export function DayProgress({ items, goal }: { items: PlanItem[]; goal: number }) {
  const done = items.filter((p) => p.done).length
  const reached = done >= goal
  const segments = Math.max(goal, done)
  const bonus = done - goal
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        role="progressbar"
        aria-label="Today's goal"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(done, goal)}
        aria-valuetext={reached ? `Daily goal done${bonus > 0 ? `, plus ${bonus} bonus` : ''}` : `${done} of ${goal} done`}
        className="flex h-2 w-28 shrink-0 gap-1 sm:w-36"
      >
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={cn(
              'flex-1 rounded-full bg-track transition-colors duration-300',
              i < done && (reached ? 'bg-success' : 'bg-primary'),
              i < done && 'animate-[segment-pop_0.45s_ease-out]',
            )}
          />
        ))}
      </div>
      {reached ? (
        <span className="inline-flex items-center gap-1 text-[13px] font-medium whitespace-nowrap text-success-foreground">
          <CheckIcon className="size-3.5" strokeWidth={3} /> Daily goal done
          {bonus > 0 && <span className="font-normal text-muted-foreground">· +{bonus} bonus</span>}
        </span>
      ) : (
        <span className="text-[13px] whitespace-nowrap text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{done}</span> of {goal} done
        </span>
      )}
    </div>
  )
}
