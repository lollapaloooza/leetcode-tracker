import { useId, useMemo } from 'react'
import { problemById } from '@/data/problems'
import { formatDay } from '@/lib/_utils/date'
import { laterPlans } from '@/lib/domain'
import { useTracker } from '@/lib/store'
import { PlanRow } from './PlanRow'
import { laterActions } from './today-actions'

/** Problems put off past tomorrow (like a Hard saved for Saturday), so they don't vanish from view. */
export function LaterSection({ today }: { today: string }) {
  const headingId = useId()
  const plans = useTracker((s) => s.plans)
  const later = useMemo(() => laterPlans(plans, today), [plans, today])
  if (later.length === 0) return null

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-2 text-sm font-semibold">
        Later
      </h2>
      <ul aria-label="Later problems" className="divide-y overflow-hidden rounded-xl border border-dashed">
        {later.map(({ day, id }) => {
          const problem = problemById.get(id)
          return problem ? (
            <PlanRow key={`${day}:${id}`} problem={problem} meta={`${formatDay(day)} · ${problem.topic}`} actions={laterActions(problem, day, today)} />
          ) : null
        })}
      </ul>
    </section>
  )
}
