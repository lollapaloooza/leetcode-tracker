import { useMemo, useRef, useState, type ReactNode } from 'react'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { problemById } from '@/data/problems'
import { CONFIDENCE_LABEL } from '@/lib/_consts/labels'
import { TARGET_MINUTES } from '@/lib/_consts/practice'
import { useElementWidth } from '@/lib/_hooks/useElementWidth'
import { cn } from '@/lib/_utils/cn'
import { addDays, formatDay, parseDate } from '@/lib/_utils/date'
import { activityByDay, lastWeekSummary } from '@/lib/domain'
import { useTracker } from '@/lib/store'
import type { Attempt, Study } from '@/types'
import { DifficultyDot } from './DifficultyTag'
import { EmptyState } from './EmptyState'
import { ProblemTitle, ResultGlyph, ResultLabel, StatusGlyph, StudyGlyph } from './problem-bits'

const DAYS_PER_PAGE = 14

type Entry = { kind: 'attempt'; attempt: Attempt } | { kind: 'study'; study: Study } | { kind: 'manual'; id: number }

export function HistoryView({ today }: { today: string }) {
  const attempts = useTracker((s) => s.attempts)
  const plans = useTracker((s) => s.plans)
  const studies = useTracker((s) => s.studies)
  const [selected, setSelected] = useState<string | null>(null)
  const [pages, setPages] = useState(1)

  const activity = useMemo(() => activityByDay(attempts, plans, studies), [attempts, plans, studies])
  const summary = useMemo(() => lastWeekSummary(attempts, problemById, today), [attempts, today])

  const days = useMemo(() => {
    const byDay = new Map<string, Entry[]>()
    const push = (day: string, entry: Entry) => byDay.set(day, [...(byDay.get(day) ?? []), entry])
    for (const attempt of attempts) push(attempt.date, { kind: 'attempt', attempt })
    for (const study of studies) push(study.date, { kind: 'study', study })
    for (const [day, plan] of Object.entries(plans))
      for (const item of plan) if (item.done && !item.attempt) push(day, { kind: 'manual', id: item.id })
    return [...byDay.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [attempts, plans, studies])

  if (activity.size === 0) {
    return (
      <EmptyState title="No history yet">
        Every attempt you log lands here — a square on the activity grid for each day you practice, and a full log
        underneath.
      </EmptyState>
    )
  }

  const shown = selected ? days.filter(([day]) => day === selected) : days.slice(0, pages * DAYS_PER_PAGE)

  return (
    <div className="flex flex-col gap-6">
      <WeekSummary summary={summary} />
      <ActivityGrid activity={activity} today={today} selected={selected} onSelect={setSelected} />

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{selected ? formatDay(selected) : 'Activity'}</h2>
          {selected && (
            <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={() => setSelected(null)}>
              <XIcon /> Show all days
            </Button>
          )}
        </div>
        {shown.length === 0 && <p className="text-[13px] text-muted-foreground">No practice logged on this day.</p>}
        {shown.map(([day, entries]) => (
          <DayGroup key={day} day={day} entries={entries} showHeading={!selected} />
        ))}
        {!selected && days.length > shown.length && (
          <Button variant="outline" size="sm" className="self-center" onClick={() => setPages((p) => p + 1)}>
            Show older
          </Button>
        )}
      </section>
    </div>
  )
}

function WeekSummary({ summary }: { summary: ReturnType<typeof lastWeekSummary> }) {
  const trend = summary.attempts - summary.previousAttempts
  return (
    <section aria-label="Last 7 days">
      <h2 className="mb-2 text-sm font-semibold">Last 7 days</h2>
      <dl className="grid grid-cols-4 overflow-hidden rounded-xl bg-card ring-1 ring-border max-sm:grid-cols-2">
        <Stat
          label="Attempts"
          value={summary.attempts}
          sub={
            <>
              {summary.fresh} new · {summary.reviews} reviews
              {trend !== 0 && (
                <span className={cn('ml-1', trend > 0 ? 'text-success-foreground' : 'text-muted-foreground')}>
                  ({trend > 0 ? '+' : ''}
                  {trend} vs prior week)
                </span>
              )}
            </>
          }
        />
        <Stat label="Median time" value={summary.medianMinutes !== null ? `${summary.medianMinutes} min` : '—'} sub="timed attempts" />
        <Stat
          label="Over target"
          value={summary.overTarget}
          valueClass={summary.overTarget > 0 ? 'text-attempted-foreground' : undefined}
          sub="ran past the time box"
        />
        <Stat label="Active days" value={`${summary.activeDays} / 7`} sub="days you practiced" />
      </dl>
    </section>
  )
}

function Stat({ label, value, sub, valueClass }: { label: string; value: ReactNode; sub: ReactNode; valueClass?: string }) {
  return (
    <div className="min-w-0 border-border px-4 py-3 not-last:border-r max-sm:nth-[2]:border-r-0 max-sm:nth-[-n+2]:border-b">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('mt-0.5 text-lg leading-tight font-semibold tabular-nums', valueClass)}>{value}</dd>
      <dd className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{sub}</dd>
    </div>
  )
}

const CELL = 11
const GAP = 3
const LABEL_W = 28
const LEVEL_CLASS = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4']
const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4)
/** Counts every kind of practice — attempts, study sessions, check-offs. */
const plural = (n: number) => `${n} ${n === 1 ? 'problem' : 'problems'} practiced`

/** Fills the available width with as many weeks as fit (up to a year), like GitHub's contribution graph. */
function ActivityGrid({
  activity,
  today,
  selected,
  onSelect,
}: {
  activity: Map<string, number>
  today: string
  selected: string | null
  onSelect: (day: string | null) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const width = useElementWidth(ref)
  const [hovered, setHovered] = useState<string | null>(null)

  const weeks = Math.min(53, Math.max(8, Math.floor((width - LABEL_W + GAP) / (CELL + GAP))))
  const firstSunday = addDays(today, -parseDate(today).getDay() - 7 * (weeks - 1))

  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(firstSunday, w * 7 + d)),
  )
  // Month label over the first week that starts in a new month (skip if crammed against the previous one).
  const monthLabels: { col: number; label: string }[] = []
  columns.forEach((col, i) => {
    const month = parseDate(col[0]).getMonth()
    const prev = i > 0 ? parseDate(columns[i - 1][0]).getMonth() : -1
    if (month !== prev && (monthLabels.length === 0 || i - monthLabels.at(-1)!.col >= 3)) {
      monthLabels.push({ col: i, label: parseDate(col[0]).toLocaleDateString(undefined, { month: 'short' }) })
    }
  })

  const inRange = [...activity.entries()].filter(([day]) => day >= firstSunday && day <= today)
  const total = inRange.reduce((n, [, c]) => n + c, 0)
  const months = Math.max(1, Math.round(weeks / 4.35))
  const focus = hovered ?? selected

  return (
    <section aria-label="Activity grid">
      <h2 className="mb-2 text-sm font-semibold">
        {plural(total)} in the last {months} {months === 1 ? 'month' : 'months'}
      </h2>
      <div className="rounded-xl bg-card p-4 ring-1 ring-border">
        <div ref={ref} onMouseLeave={() => setHovered(null)}>
          <div className="relative mb-1 h-4 text-[11px] text-muted-foreground" style={{ marginLeft: LABEL_W }} aria-hidden>
            {monthLabels.map(({ col, label }) => (
              <span key={col} className="absolute" style={{ left: col * (CELL + GAP) }}>
                {label}
              </span>
            ))}
          </div>
          <div className="flex">
            <div
              className="grid text-[10px] leading-none text-muted-foreground"
              style={{ width: LABEL_W, gridTemplateRows: `repeat(7, ${CELL}px)`, rowGap: GAP }}
              aria-hidden
            >
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                <span key={i} className="flex items-center">
                  {d}
                </span>
              ))}
            </div>
            <div
              className="grid grid-flow-col"
              style={{ gridTemplateRows: `repeat(7, ${CELL}px)`, gridAutoColumns: `${CELL}px`, gap: GAP }}
            >
              {columns.flat().map((day) => {
                if (day > today) return <span key={day} aria-hidden />
                const count = activity.get(day) ?? 0
                const cls = cn(
                  'rounded-[3px] ring-1 ring-foreground/5 ring-inset',
                  LEVEL_CLASS[level(count)],
                  day === selected && 'ring-2 ring-foreground/70',
                  day === today && day !== selected && 'ring-foreground/30',
                )
                // Only days with practice are focusable — empty days would be dead tab stops.
                return count > 0 ? (
                  <button
                    key={day}
                    type="button"
                    className={cn(cls, 'outline-none focus-visible:ring-2 focus-visible:ring-ring')}
                    aria-label={`${formatDay(day)}: ${plural(count)}`}
                    aria-pressed={day === selected}
                    onClick={() => onSelect(day === selected ? null : day)}
                    onMouseEnter={() => setHovered(day)}
                    onFocus={() => setHovered(day)}
                  />
                ) : (
                  <span key={day} className={cls} onMouseEnter={() => setHovered(day)} aria-hidden />
                )
              })}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span aria-live="polite">
            {focus ? (
              <>
                <span className="font-medium text-foreground">{formatDay(focus)}</span> ·{' '}
                {activity.get(focus) ? plural(activity.get(focus)!) : 'no practice'}
              </>
            ) : (
              'Click a day to see what you did'
            )}
          </span>
          <span className="flex items-center gap-1" aria-label="Fewer to more attempts">
            Less
            {LEVEL_CLASS.map((c) => (
              <span key={c} className={cn('size-[11px] rounded-[3px] ring-1 ring-foreground/5 ring-inset', c)} />
            ))}
            More
          </span>
        </div>
      </div>
    </section>
  )
}

function DayGroup({ day, entries, showHeading }: { day: string; entries: Entry[]; showHeading: boolean }) {
  const minutes = entries.reduce((n, e) => n + (e.kind === 'attempt' && e.attempt.seconds ? e.attempt.seconds / 60 : 0), 0)
  return (
    <div>
      {showHeading && (
        <h3 className="mb-2 text-[13px] font-medium">
          {formatDay(day)}
          <span className="font-normal text-muted-foreground">
            {' '}
            · {plural(entries.length)}
            {minutes > 0 && ` · ${Math.round(minutes)} min`}
          </span>
        </h3>
      )}
      <ul className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-border">
        {entries.map((entry) => (
          <HistoryRow
            key={entry.kind === 'attempt' ? entry.attempt.key : entry.kind === 'study' ? entry.study.key : `manual-${entry.id}`}
            entry={entry}
          />
        ))}
      </ul>
    </div>
  )
}

function HistoryRow({ entry }: { entry: Entry }) {
  const id = entry.kind === 'attempt' ? entry.attempt.id : entry.kind === 'study' ? entry.study.id : entry.id
  const problem = problemById.get(id)
  if (!problem) return null
  const a = entry.kind === 'attempt' ? entry.attempt : null
  const minutes = a && a.seconds !== null ? Math.max(1, Math.round(a.seconds / 60)) : null
  const over = minutes !== null && minutes > TARGET_MINUTES[problem.difficulty]
  const review = a ? a.prev.status === 'solved' || a.prev.status === 'helped' : false

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5 max-sm:px-3">
      {a ? <ResultGlyph result={a.result} /> : entry.kind === 'study' ? <StudyGlyph /> : <StatusGlyph status="solved" />}
      <div className="flex min-w-0 flex-col">
        <ProblemTitle problem={problem} className="text-sm" />
        <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
          <DifficultyDot difficulty={problem.difficulty} />
          {a ? (
            <>
              <ResultLabel result={a.result} />
              {a.result === 'solved' && <span>· {CONFIDENCE_LABEL[a.confidence]}</span>}
              <span>· {review ? 'Review' : 'New'}</span>
              <span className="truncate max-sm:hidden">· {problem.topic}</span>
            </>
          ) : entry.kind === 'study' ? (
            <span>Watched the solution & wrote the key idea</span>
          ) : (
            <span>Marked solved</span>
          )}
        </span>
      </div>
      <span className={cn('text-[13px] tabular-nums', over ? 'text-attempted-foreground' : 'text-muted-foreground')}>
        {minutes !== null ? `${minutes} min` : a ? 'untimed' : ''}
      </span>
    </li>
  )
}
