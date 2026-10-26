import { SparklesIcon, ZapIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatLongDay } from '@/lib/_utils/date'
import type { DayOrder } from '@/lib/domain'
import { useUI } from '@/lib/store'
import type { PlanItem } from '@/types'
import { DayProgress } from './DayProgress'
import { useMinutesLeft } from './useMinutesLeft'
import { useSuggest } from './useSuggest'

interface DayHeadingProps {
  today: string
  plan: PlanItem[]
  goal: number
  order: DayOrder
}

/** The date, progress toward today's goal and the time it still needs, and ways to add to the day. */
export function DayHeading({ today, plan, goal, order }: DayHeadingProps) {
  const minutes = useMinutesLeft(order)
  const { label, suggest } = useSuggest(today)
  const setShortOnTimeOpen = useUI((s) => s.setShortOnTimeOpen)

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight">{formatLongDay(today)}</h1>
        {plan.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <DayProgress items={plan} goal={goal} />
            {!order.goalMet && minutes > 0 && <span className="text-[13px] text-muted-foreground">· about {minutes} min to go</span>}
          </div>
        )}
      </div>
      {plan.length > 0 && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShortOnTimeOpen(true)}>
            <ZapIcon />
            Short on time?
          </Button>
          <Button variant="outline" size="sm" onClick={suggest}>
            <SparklesIcon />
            {label}
          </Button>
        </div>
      )}
    </div>
  )
}
