import { SparklesIcon, ZapIcon } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { problemById } from '@/data/problems'
import { formatDay } from '@/lib/_utils/date'
import { useUI } from '@/lib/store'
import { BacklogSection } from './BacklogSection'
import { DayHeading } from './DayHeading'
import { DoneToday } from './DoneToday'
import { EmptyFocus } from './EmptyFocus'
import { LaterSection } from './LaterSection'
import { Notice } from './Notice'
import { NowCard } from './NowCard'
import { PlanBoard } from './PlanBoard'
import { QueueHeading } from './QueueHeading'
import { QueueList } from './QueueList'
import { TomorrowSection } from './TomorrowSection'
import { useDayPlan } from './useDayPlan'
import { useDaysAway } from './useDaysAway'
import { useSuggest } from './useSuggest'
import { useTodayNotices } from './useTodayNotices'
import { WelcomeBack } from './WelcomeBack'

/** Today: the date and goal, one problem in the spotlight, the queue after it, what's done, then tomorrow, later and the backlog. */
export function TodayView({ today }: { today: string }) {
  const { plan, goal, order, board } = useDayPlan(today)
  const notices = useTodayNotices(today, plan, goal)
  const away = useDaysAway(today)
  const nowProblem = order.now !== null ? problemById.get(order.now) : undefined
  // An empty queue only shows up as a place to drop a problem dragged in from tomorrow.
  const showQueue = order.queue.length > 0 || board.activeId !== null

  return (
    <div className="flex flex-col gap-5">
      {away !== null && <WelcomeBack today={today} away={away} />}
      <DayHeading today={today} plan={plan} goal={goal} order={order} />
      {plan.length === 0 && <EmptyToday today={today} />}
      {nowProblem && <NowCard key={nowProblem.id} problem={nowProblem} today={today} bonus={order.goalMet} />}
      {!nowProblem && order.queue.length > 0 && <EmptyFocus />}
      {notices.carryOver && (
        <Notice
          action={
            <Button variant="link" size="sm" className="h-auto p-0" onClick={notices.carryOver.add}>
              Carry over
            </Button>
          }
        >
          {notices.carryOver.count} unfinished from {formatDay(notices.carryOver.date)}
        </Notice>
      )}
      <PlanBoard board={board}>
        <div className="flex flex-col gap-2">
          {/* Welcome back already deals with overdue reviews. */}
          <QueueHeading count={order.queue.length} reviews={away === null ? notices.reviews : null} />
          {showQueue && <QueueList today={today} plan={plan} order={order} ids={board.lists.today} />}
        </div>
        <DoneToday items={order.done} today={today} />
        <TomorrowSection today={today} ids={board.lists.tomorrow} />
      </PlanBoard>
      <LaterSection today={today} />
      <BacklogSection today={today} />
    </div>
  )
}

function EmptyToday({ today }: { today: string }) {
  const { label, suggest } = useSuggest(today)
  const setTab = useUI((s) => s.setTab)
  const setShortOnTimeOpen = useUI((s) => s.setShortOnTimeOpen)
  return (
    <EmptyState title="What are you solving today?">
      <span className="block">
        Suggest picks due reviews first, then the next new problems — or choose from{' '}
        <Button variant="link" className="h-auto p-0 text-[13px]" onClick={() => setTab('all')}>
          Problems
        </Button>
        .
      </span>
      <span className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={suggest}>
          <SparklesIcon />
          {label}
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShortOnTimeOpen(true)}>
          <ZapIcon />
          Short on time?
        </Button>
      </span>
    </EmptyState>
  )
}
