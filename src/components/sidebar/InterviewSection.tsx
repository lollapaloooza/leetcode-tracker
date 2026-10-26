import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/_utils/cn'
import { addDays, formatShortDay, localDate, parseDate } from '@/lib/_utils/date'
import { lazyComponent } from '@/lib/_utils/lazy'
import { computePace } from '@/lib/domain'
import { useTracker, useUI } from '@/lib/store'
import { Section } from './Section'
import { useSolvedStats } from './use-solved-stats'

// The date picker (react-day-picker + date-fns) is the largest dependency, and only this popover uses it.
const Calendar = lazyComponent(() => import('@/components/ui/calendar').then((m) => m.Calendar))

export function InterviewSection({ today }: { today: string }) {
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
        {/* Holds the calendar's size in the rare case it opens before its chunk has loaded. */}
        <Suspense fallback={<div className="h-64.5 w-53" />}>
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
        </Suspense>
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
