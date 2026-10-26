import { useMemo, type ReactNode } from 'react'
import { RotateCcwIcon, SparklesIcon, ZapIcon } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { addDays, formatDay } from '@/lib/_utils/date'
import { dueReviews, goalFor, suggestionCount } from '@/lib/domain'
import { useTracker, useUI } from '@/lib/store'
import type { PlanItem } from '@/types'
import { DayProgress } from './DayProgress'
import { sortableId, usePlanBoard } from './plan-board'
import { PlanBoard } from './PlanBoard'
import { TodayList } from './TodayList'
import { LaterSection, TomorrowSection } from './UpcomingSections'
import { useDaysAway } from './use-days-away'
import { WelcomeBack } from './WelcomeBack'

const EMPTY: PlanItem[] = []

export function TodayView({ today }: { today: string }) {
  const tomorrow = addDays(today, 1)
  const plan = useTracker((s) => s.plans[today] ?? EMPTY)
  const tomorrowPlan = useTracker((s) => s.plans[tomorrow] ?? EMPTY)
  const timerId = useTracker((s) => s.timer?.id ?? null)
  const plans = useTracker((s) => s.plans)
  const reviews = useTracker((s) => s.reviews)
  const goal = useTracker((s) => goalFor(s, today))
  const suggestCount = useTracker((s) => suggestionCount(s, today))
  const addToPlan = useTracker((s) => s.addToPlan)
  const suggestForDay = useTracker((s) => s.suggestForDay)
  const setTab = useUI((s) => s.setTab)
  const setShortOnTimeOpen = useUI((s) => s.setShortOnTimeOpen)
  const away = useDaysAway(today)

  const due = useMemo(
    () => dueReviews(reviews, today).filter((id) => !plan.some((p) => p.id === id)),
    [reviews, plan, today],
  )

  // Unfinished items from yesterday or the day before — older leftovers are guilt, not a plan.
  const carryOver = useMemo(() => {
    const previous = Object.keys(plans)
      .filter((d) => d < today && d >= addDays(today, -2) && plans[d].length > 0)
      .sort()
      .at(-1)
    if (!previous) return null
    const ids = plans[previous].filter((p) => !p.done && !plan.some((t) => t.id === p.id)).map((p) => p.id)
    return ids.length > 0 ? { date: previous, ids } : null
  }, [plans, plan, today])

  // The problem you're working on leads the list; the rest keep the order you gave them.
  const current = timerId !== null && plan.some((p) => p.id === timerId && !p.done) ? timerId : null
  const lists = useMemo(
    () => ({
      today: plan.filter((p) => !p.done && p.id !== current).map((p) => sortableId('today', p.id)),
      tomorrow: tomorrowPlan.map((p) => sortableId('tomorrow', p.id)),
    }),
    [plan, tomorrowPlan, current],
  )
  const board = usePlanBoard({
    lists,
    dates: { today, tomorrow },
    pinned: { today: current !== null ? [current] : [], tomorrow: [] },
  })

  const suggest = () => suggestForDay(today, today)
  const suggestLabel = plan.length < goal ? `Suggest ${suggestCount}` : 'Suggest 1 more'
  const shortOnTime = (
    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShortOnTimeOpen(true)}>
      <ZapIcon />
      Short on time?
    </Button>
  )

  return (
    <div className="flex flex-col gap-3">
      {away !== null && <WelcomeBack today={today} away={away} />}

      {plan.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <DayProgress items={plan} goal={goal} />
          <div className="flex items-center gap-1">
            {shortOnTime}
            <Button variant="outline" size="sm" onClick={suggest}>
              <SparklesIcon />
              {suggestLabel}
            </Button>
          </div>
        </div>
      )}

      {away === null && due.length > 0 && (
        <Notice
          icon={<RotateCcwIcon className="size-3.5 text-link" />}
          action={
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => addToPlan(due, today)}>
              Add {due.length === 1 ? 'it' : 'all'}
            </Button>
          }
        >
          {due.length} {due.length === 1 ? 'review' : 'reviews'} due — re-solve before you forget the pattern
        </Notice>
      )}

      {carryOver && (
        <Notice
          action={
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => addToPlan(carryOver.ids, today)}>
              Carry over
            </Button>
          }
        >
          {carryOver.ids.length} unfinished from {formatDay(carryOver.date)}
        </Notice>
      )}

      <PlanBoard board={board}>
        {plan.length === 0 ? (
          <EmptyState title="What are you solving today?">
            <span className="block">
              Suggest picks due reviews first, then the next new problems — or choose from{' '}
              <Button variant="link" className="h-auto p-0 text-[13px]" onClick={() => setTab('all')}>
                All problems
              </Button>
              .
            </span>
            <span className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button onClick={suggest}>
                <SparklesIcon />
                {suggestLabel}
              </Button>
              {shortOnTime}
            </span>
          </EmptyState>
        ) : (
          <TodayList today={today} plan={plan} current={current} ids={board.lists.today} goal={goal} />
        )}

        <TomorrowSection today={today} ids={board.lists.tomorrow} />
      </PlanBoard>
      <LaterSection today={today} />
    </div>
  )
}

function Notice({ icon, action, children }: { icon?: ReactNode; action: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-primary/8 px-4 py-2.5 text-[13px] text-muted-foreground">
      <span className="flex items-center gap-2">
        {icon}
        {children}
      </span>
      {action}
    </div>
  )
}
