import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { CalendarPlusIcon, CheckIcon, FlameIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { PROBLEMS, type Difficulty, type Topic } from '@/data/problems'
import { addDays, formatShortDay, localDate, parseDate } from '@/lib/date'
import { activityByDay, computePace, currentWeek, weakTopics, weeklyStreak } from '@/lib/insights'
import { exportable, GOAL_LIMITS, isSolved, isTrackerData, nextInTopic, useTracker, type GoalKind } from '@/store'
import { useUI } from '@/ui-store'
import { DifficultyDot } from './DifficultyTag'

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard']
const byId = new Map(PROBLEMS.map((p) => [p.id, p]))
const FOCUS_WINDOW_DAYS = 60

/** Secondary info, GitHub "About"-style: plain sections on the page background, so the task list stays the focus. */
export function Sidebar({ today }: { today: string }) {
  return (
    <div className="flex flex-col max-lg:border-t max-lg:pt-6 sm:max-lg:grid sm:max-lg:grid-cols-2 sm:max-lg:gap-x-10">
      <ProgressSection today={today} />
      <FocusSection today={today} />
      <InterviewSection today={today} />
      <ThisWeekSection today={today} />
      <RoutineSection />
      <BackupSection />
    </div>
  )
}

function Section({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b py-5 first:pt-0 last:border-b-0 sm:max-lg:[&:nth-child(-n+2)]:pt-0">
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

function useSolvedStats() {
  const progress = useTracker((s) => s.progress)
  return useMemo(() => {
    const byDifficulty = Object.fromEntries(DIFFICULTIES.map((d) => [d, { solved: 0, total: 0 }])) as Record<
      Difficulty,
      { solved: number; total: number }
    >
    let solved = 0
    for (const p of PROBLEMS) {
      byDifficulty[p.difficulty].total++
      if (isSolved(progress[p.id]?.status)) {
        byDifficulty[p.difficulty].solved++
        solved++
      }
    }
    return { solved, total: PROBLEMS.length, byDifficulty }
  }, [progress])
}

function ProgressSection({ today }: { today: string }) {
  const stats = useSolvedStats()
  const interview = useTracker((s) => s.interview)
  const pct = (stats.solved / stats.total) * 100
  const pace = interview ? computePace(interview, stats.solved, stats.total, today) : null
  const showMarker = pace && pace.daysLeft > 0 && pace.expected > 0

  return (
    <Section title="Progress" action={<span className="text-[13px] text-muted-foreground">{Math.round(pct)}%</span>}>
      <p className="mb-3 flex items-baseline gap-1.5">
        <span className="text-2xl leading-none font-semibold tracking-tight">{stats.solved}</span>
        <span className="text-[13px] text-muted-foreground">/ {stats.total} solved</span>
      </p>
      <div className="relative">
        <Progress
          aria-label="Overall progress"
          // Keep a sliver visible after the first solve so the bar never looks empty.
          value={stats.solved > 0 ? Math.max(pct, 2) : 0}
          className="h-2 bg-track"
          indicatorClassName="rounded-full bg-linear-to-r from-primary/60 to-primary duration-700 ease-out animate-[progress-in_1.1s_ease-out]"
        />
        {showMarker && (
          // Pace marker: where a steady pace would put you today.
          <span
            aria-hidden
            title={`On pace: ${pace.expected} solved by today`}
            className="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/55 transition-[left] duration-700"
            style={{ left: `${(pace.expected / stats.total) * 100}%` }}
          />
        )}
      </div>
      <ul className="mt-3 flex flex-col gap-1 text-[13px]">
        {DIFFICULTIES.map((d) => (
          <li key={d} className="flex items-center gap-2 text-muted-foreground">
            <DifficultyDot difficulty={d} />
            <span className="flex-1">{d}</span>
            <span className="tabular-nums">
              <span className="font-medium text-foreground">{stats.byDifficulty[d].solved}</span> / {stats.byDifficulty[d].total}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** Weakest topics from recent attempts, each with the reason and a one-click way to practice it. */
function FocusSection({ today }: { today: string }) {
  const attempts = useTracker((s) => s.attempts)
  const [added, setAdded] = useState<Topic | null>(null)
  const focus = useMemo(() => weakTopics(attempts, byId, today, { days: FOCUS_WINDOW_DAYS }), [attempts, today])

  const practice = (topic: Topic) => {
    const s = useTracker.getState()
    const id = nextInTopic(s, topic, s.plans[today] ?? [], today)
    if (id === null) return
    s.addToPlan([id], today)
    setAdded(topic)
    setTimeout(() => setAdded((t) => (t === topic ? null : t)), 1500)
  }

  return (
    <Section title="Focus" action={<span className="text-xs text-muted-foreground">last {FOCUS_WINDOW_DAYS} days</span>}>
      {focus.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          {attempts.length < 3
            ? 'Log a few attempts and the topics that trip you up show here.'
            : 'No weak spots right now — nice.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {focus.map((f) => (
            <li key={f.topic} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{f.topic}</p>
                <p className="text-xs text-muted-foreground">{f.reason}</p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                aria-label={`Add a ${f.topic} problem to today`}
                title="Add one to today"
                onClick={() => practice(f.topic)}
              >
                {added === f.topic ? <CheckIcon className="text-success-foreground" /> : <PlusIcon />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function InterviewSection({ today }: { today: string }) {
  const interview = useTracker((s) => s.interview)
  const setInterview = useTracker((s) => s.setInterview)
  const open = useUI((s) => s.interviewPickerOpen)
  const setOpen = useUI((s) => s.setInterviewPickerOpen)
  const stats = useSolvedStats()
  const pace = interview ? computePace(interview, stats.solved, stats.total, today) : null

  const trigger = (
    <PopoverTrigger asChild>
      <Button id="interview-date" variant="link" size="xs" className="h-auto p-0 text-[13px]">
        {interview ? 'Change' : 'Set date'}
      </Button>
    </PopoverTrigger>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Section title="Interview" action={trigger}>
        {!interview || !pace ? (
          <p className="text-[13px] text-muted-foreground">Set your interview date to get a daily pace.</p>
        ) : (
          <div className="flex flex-col gap-1 text-[13px]">
            <p>
              <span className="font-medium">{formatShortDay(interview.date)}</span>
              <span className="text-muted-foreground">
                {pace.daysLeft > 0 ? ` · ${pace.daysLeft} days left` : pace.daysLeft === 0 ? ' · today — good luck!' : ' · passed'}
              </span>
            </p>
            {stats.solved >= stats.total ? (
              <p className="font-medium text-success-foreground">All {stats.total} done</p>
            ) : (
              pace.daysLeft > 0 && (
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground tabular-nums">{pace.perDay}</span>/day to finish ·{' '}
                  <span className={cn('font-medium', pace.delta < 0 ? 'text-attempted-foreground' : 'text-success-foreground')}>
                    {pace.delta < 0 ? `${-pace.delta} behind` : pace.delta > 0 ? `${pace.delta} ahead` : 'on track'}
                  </span>
                </p>
              )
            )}
          </div>
        )}
      </Section>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={interview ? parseDate(interview.date) : undefined}
          defaultMonth={interview ? parseDate(interview.date) : parseDate(addDays(today, 30))}
          disabled={{ before: parseDate(addDays(today, 1)) }}
          onSelect={(date) => {
            if (!date) return
            setInterview(localDate(date), today)
            setOpen(false)
          }}
        />
        {interview && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                setInterview(null, today)
                setOpen(false)
              }}
            >
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** A weekly goal forgives a skipped evening; a daily streak doesn't. */
function ThisWeekSection({ today }: { today: string }) {
  const attempts = useTracker((s) => s.attempts)
  const plans = useTracker((s) => s.plans)
  const studies = useTracker((s) => s.studies)
  const weeklyDays = useTracker((s) => s.weeklyDays)

  const active = useMemo(() => new Set(activityByDay(attempts, plans, studies).keys()), [attempts, plans, studies])
  const week = currentWeek(active, today)
  const streak = weeklyStreak(active, today, weeklyDays)
  const left = Math.max(weeklyDays - streak.thisWeek, 0)
  const daysRemaining = week.filter((d) => d.future || d.isToday).length

  const hint =
    left === 0
      ? 'Goal hit for this week — nice.'
      : left > daysRemaining
        ? 'Every day still counts — next week starts fresh.'
        : `${left} more ${left === 1 ? 'day' : 'days'} ${streak.weeks > 0 ? 'keeps the streak going' : 'starts a streak'}.`

  return (
    <Section
      title="This week"
      action={
        <span className="text-[13px] text-muted-foreground tabular-nums">
          <span className="font-medium text-foreground">{streak.thisWeek}</span> of {weeklyDays} days
        </span>
      }
    >
      <ol className="grid grid-cols-7 gap-1.5" aria-label={`Practiced ${streak.thisWeek} of ${weeklyDays} days this week`}>
        {week.map((d) => (
          <li key={d.date} className="flex flex-col items-center gap-1">
            <span
              aria-hidden
              className={cn(
                'grid size-7 place-items-center rounded-full text-white transition-colors',
                // Done: filled. Missed: solid outline. Still ahead: dashed outline.
                d.active ? 'bg-success' : d.future ? 'border border-dashed border-border' : 'border-2 border-border bg-card',
                d.isToday && !d.active && 'border-2 border-solid border-primary/60',
              )}
            >
              {d.active && <CheckIcon className="size-3.5" strokeWidth={3} />}
            </span>
            <span className={cn('text-[11px]', d.isToday ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {parseDate(d.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex items-start gap-2 text-[13px]">
        <FlameIcon
          className={cn('mt-px size-4 shrink-0', streak.weeks > 0 ? 'fill-orange-400 text-orange-500' : 'text-muted-foreground')}
        />
        <div>
          <p>
            {streak.weeks > 0 ? (
              <>
                <span className="font-medium tabular-nums">{streak.weeks}</span>-week streak
              </>
            ) : (
              'No weekly streak yet'
            )}
          </p>
          <p className="text-muted-foreground">{hint}</p>
        </div>
      </div>
    </Section>
  )
}

function RoutineSection() {
  const coreFirst = useTracker((s) => s.coreFirst)
  const setCoreFirst = useTracker((s) => s.setCoreFirst)
  const setCalendarOpen = useUI((s) => s.setCalendarOpen)

  return (
    <Section
      title="Routine"
      action={
        <Button variant="link" size="xs" className="h-auto p-0 text-[13px]" onClick={() => setCalendarOpen(true)}>
          <CalendarPlusIcon /> Add to calendar
        </Button>
      }
    >
      <div className="flex flex-col gap-1.5 text-[13px]">
        <GoalStepper kind="weeklyDays" label="Days a week" />
        <GoalStepper kind="weekdayGoal" label="Problems on weekdays" />
        <GoalStepper kind="weekendGoal" label="Problems on weekends" />
        <label className="mt-1.5 flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span className="block">Core 150 first</span>
            <span className="block text-xs text-muted-foreground">Suggest finishes NeetCode 150 before the extra 100</span>
          </span>
          <Switch checked={coreFirst} onCheckedChange={setCoreFirst} />
        </label>
      </div>
    </Section>
  )
}

function GoalStepper({ kind, label }: { kind: GoalKind; label: string }) {
  const value = useTracker((s) => s[kind])
  const setGoal = useTracker((s) => s.setGoal)
  const [min, max] = GOAL_LIMITS[kind]
  return (
    <div role="group" aria-label={label} className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => setGoal(kind, value - 1)}
        >
          <MinusIcon />
        </Button>
        <span aria-live="polite" className="w-5 text-center font-semibold tabular-nums">
          {value}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => setGoal(kind, value + 1)}
        >
          <PlusIcon />
        </Button>
      </span>
    </div>
  )
}

function BackupSection() {
  const fileInput = useRef<HTMLInputElement>(null)
  const importData = useTracker((s) => s.importData)

  const exportData = () => {
    const blob = new Blob([JSON.stringify(exportable(useTracker.getState()), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leetcode-tracker-${localDate()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data: unknown = JSON.parse(await file.text())
      if (!isTrackerData(data)) throw new Error('Unexpected file format')
      if (confirm('Replace your current progress with this backup?')) importData(data)
    } catch (err) {
      alert(`Could not import backup: ${(err as Error).message}`)
    }
  }

  return (
    <Section>
      <p className="text-xs text-muted-foreground">Saved in this browser</p>
      <div className="mt-1 flex gap-4">
        <Button variant="link" size="xs" className="h-auto p-0" onClick={exportData}>
          Export backup
        </Button>
        <Button variant="link" size="xs" className="h-auto p-0" onClick={() => fileInput.current?.click()}>
          Import
        </Button>
        <input ref={fileInput} type="file" accept="application/json" hidden onChange={onImport} />
      </div>
    </Section>
  )
}

