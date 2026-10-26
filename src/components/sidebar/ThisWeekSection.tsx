import { useMemo } from 'react'
import { CheckIcon, FlameIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseDate } from '@/lib/date'
import { activityByDay, currentWeek, weeklyStreak } from '@/lib/insights'
import { useTracker } from '@/store'
import { Section } from './Section'

/** A weekly goal forgives a skipped evening; a daily streak doesn't. */
export function ThisWeekSection({ today }: { today: string }) {
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
