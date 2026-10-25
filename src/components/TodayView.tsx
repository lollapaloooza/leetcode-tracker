import { Fragment, useMemo, type ReactNode } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { BatteryMediumIcon, CheckIcon, RotateCcwIcon, SparklesIcon, XIcon, ZapIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PROBLEMS } from '@/data/problems'
import { addDays, diffDays, formatDay } from '@/lib/date'
import { activityByDay, computePace, lastActiveBefore } from '@/lib/insights'
import { spreadSchedule } from '@/lib/srs'
import {
  dueReviews,
  goalFor,
  isSolved,
  plannedFrom,
  restartPick,
  suggestNext,
  useTracker,
  type PlanItem,
} from '@/store'
import { useUI } from '@/ui-store'
import { EmptyState } from './EmptyState'
import { problemIdOf, sortableId, usePlanBoard, useSortableRow, useZone } from '@/lib/plan-board'
import { DragHandle, PlanBoard } from './PlanBoard'
import { TodayRow } from './TodayRow'
import { LaterSection, TomorrowSection } from './UpcomingSections'

const byId = new Map(PROBLEMS.map((p) => [p.id, p]))
const EMPTY: PlanItem[] = []
/** Days without practice before "welcome back" replaces the usual nudges. */
const AWAY_DAYS = 3

export function TodayView({ today }: { today: string }) {
  const tomorrow = addDays(today, 1)
  const plan = useTracker((s) => s.plans[today] ?? EMPTY)
  const tomorrowPlan = useTracker((s) => s.plans[tomorrow] ?? EMPTY)
  const timerId = useTracker((s) => s.timer?.id ?? null)
  const plans = useTracker((s) => s.plans)
  const reviews = useTracker((s) => s.reviews)
  const goal = useTracker((s) => goalFor(s, today))
  const addToPlan = useTracker((s) => s.addToPlan)
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

  const suggestCount = Math.max(goal - plan.length, 1)
  const suggest = () => {
    const s = useTracker.getState()
    addToPlan(suggestNext(s, plannedFrom(s.plans, today), suggestCount, today), today)
  }
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

/** Days since you last practiced, when it's been long enough for a welcome back — else null. */
function useDaysAway(today: string): number | null {
  const attempts = useTracker((s) => s.attempts)
  const plans = useTracker((s) => s.plans)
  const studies = useTracker((s) => s.studies)
  const comebackAt = useTracker((s) => s.comebackAt)
  const active = useMemo(() => activityByDay(attempts, plans, studies), [attempts, plans, studies])

  const last = lastActiveBefore(active.keys(), today)
  if (!last || active.has(today)) return null
  const away = diffDays(last, today)
  const handledRecently = comebackAt !== null && comebackAt > last && diffDays(comebackAt, today) < AWAY_DAYS
  return away >= AWAY_DAYS && !handledRecently ? away : null
}

/**
 * After a few days off, the usual signals (overdue pile, "behind pace", broken streak) feel like a
 * wall. Offer a small restart instead.
 */
function WelcomeBack({ today, away }: { today: string; away: number }) {
  const reviews = useTracker((s) => s.reviews)
  const interview = useTracker((s) => s.interview)
  const progress = useTracker((s) => s.progress)

  const s = useTracker.getState()
  const restartId = restartPick(s)
  const restart = restartId !== null ? byId.get(restartId) : undefined
  const overdue = dueReviews(reviews, today).length
  const solved = PROBLEMS.filter((p) => isSolved(progress[p.id]?.status)).length
  const newPace =
    interview && interview.date > today
      ? computePace({ date: interview.date, setOn: today, solvedAtSet: solved }, solved, PROBLEMS.length, today).perDay
      : null

  return (
    <section
      aria-label="Welcome back"
      className="relative rounded-xl bg-card p-4 ring-1 ring-primary/30 sm:p-5"
    >
      <Button
        variant="ghost"
        size="icon-xs"
        className="absolute top-3 right-3 text-muted-foreground"
        aria-label="Dismiss"
        onClick={() => s.dismissComeback(today)}
      >
        <XIcon />
      </Button>
      <h2 className="text-[15px] font-semibold">Welcome back</h2>
      <p className="mt-1 pr-6 text-[13px] text-muted-foreground">
        It's been {away} days. Breaks happen — and patterns come back faster the second time. Let's restart small
        instead of catching up.
      </p>
      <ul className="mt-3 flex flex-col gap-1.5 text-[13px]">
        {restart && (
          <Step>
            Today, one easy win: {s.progress[restart.id]?.status === 'solved' ? 're-solve' : 'solve'}{' '}
            <span className="font-medium">{restart.title}</span>
          </Step>
        )}
        {overdue > 0 && (
          <Step>
            Spread {overdue} overdue {overdue === 1 ? 'review' : 'reviews'} out from tomorrow — {spreadSchedule(overdue).perDay}{' '}
            a day instead of all at once
          </Step>
        )}
        {newPace !== null && <Step>Restart your interview pace from today — about {newPace} a day</Step>}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => s.comeback(today, restartId)}>Restart small</Button>
        <Button variant="ghost" className="text-muted-foreground" onClick={() => s.dismissComeback(today)}>
          Not now
        </Button>
      </div>
    </section>
  )
}

function Step({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-success/15 text-success-foreground">
        <CheckIcon className="size-3" strokeWidth={3} />
      </span>
      <span>{children}</span>
    </li>
  )
}

/**
 * What's left, in the order you'll do it: the problem you're on (or up next) leads, a line marks
 * where today's goal ends, and finished problems sink to the bottom.
 */
function TodayList({
  today,
  plan,
  current,
  ids,
  goal,
}: {
  today: string
  plan: PlanItem[]
  current: number | null
  ids: string[]
  goal: number
}) {
  const { ref: dropRef, isOver } = useZone('today', ids.length === 0)
  const done = plan.filter((p) => p.done)
  const itemFor = (id: number) => plan.find((p) => p.id === id) ?? { id, done: false }
  const offset = current !== null ? 1 : 0
  // Unfinished problems still needed for the goal; the rest are a bonus.
  const needed = Math.max(0, goal - done.length)
  const bonusFrom = needed < ids.length + offset ? needed : null
  const leadId = current ?? (needed > 0 && ids.length > 0 ? problemIdOf(ids[0]) : null)
  const currentProblem = current !== null ? byId.get(current) : undefined

  return (
    <ul
      ref={dropRef}
      aria-label="Today's problems"
      className={cn(
        'divide-y overflow-hidden rounded-xl bg-card ring-1 ring-border transition-shadow',
        isOver && 'ring-2 ring-primary/50',
      )}
    >
      {bonusFrom === 0 && <BonusLine />}
      {currentProblem && <TodayRow problem={currentProblem} item={itemFor(currentProblem.id)} today={today} lead />}
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {ids.map((sid, i) => {
          const problem = byId.get(problemIdOf(sid))
          if (!problem) return null
          return (
            <Fragment key={sid}>
              {bonusFrom !== null && bonusFrom > 0 && i + offset === bonusFrom && <BonusLine />}
              <SortableTodayRow
                sid={sid}
                problem={problem}
                item={itemFor(problem.id)}
                today={today}
                lead={leadId === problem.id && current === null}
                first={i === 0}
              />
            </Fragment>
          )
        })}
      </SortableContext>
      {ids.length === 0 && current === null && done.length === 0 && (
        <li className="px-4 py-3 text-center text-[13px] text-muted-foreground">Drop it here to keep it for today</li>
      )}
      {done.map((item) => {
        const problem = byId.get(item.id)
        return problem ? <TodayRow key={item.id} problem={problem} item={item} today={today} /> : null
      })}
    </ul>
  )
}

function SortableTodayRow({ sid, ...row }: { sid: string } & Parameters<typeof TodayRow>[0]) {
  const { ref, style, dragging, handleProps } = useSortableRow(sid)
  return (
    <TodayRow
      {...row}
      ref={ref}
      style={style}
      dragging={dragging}
      handle={<DragHandle label={`Move ${row.problem.title}`} {...handleProps} />}
    />
  )
}

/** Where today's goal ends — anything below is extra, for evenings with energy to spare. */
function BonusLine() {
  return (
    <li className="flex items-center gap-2 bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
      <BatteryMediumIcon className="size-3.5" />
      <span>
        <span className="font-medium text-foreground">Bonus</span> — only if you still have energy
      </span>
    </li>
  )
}

/** Progress toward today's goal — problems past the goal count as a bonus, not as the bar to clear. */
function DayProgress({ items, goal }: { items: PlanItem[]; goal: number }) {
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
