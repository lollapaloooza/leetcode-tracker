import { Button } from '@/components/ui/button'
import { cn } from '@/lib/_utils/cn'
import { formatShortDay } from '@/lib/_utils/date'
import type { Pace } from '@/lib/domain'
import { useUI } from '@/lib/store'
import type { InterviewTarget } from '@/types'

interface InterviewPaceProps {
  interview: InterviewTarget | null
  pace: Pace | null
  solved: number
  total: number
}

const daysLeft = (days: number) =>
  days > 1 ? `${days} days left` : days === 1 ? '1 day left' : days === 0 ? 'today — good luck!' : 'passed'
const versusPace = (delta: number) => (delta < 0 ? `${-delta} behind pace` : delta > 0 ? `${delta} ahead` : 'on track')

/** The interview date and the daily pace it needs — or a way to set one. */
export function InterviewPace({ interview, pace, solved, total }: InterviewPaceProps) {
  const setSettingsOpen = useUI((s) => s.setSettingsOpen)

  if (!interview || !pace) {
    return (
      <p className="text-[13px] text-muted-foreground">
        <Button variant="link" className="h-auto p-0 text-[13px]" onClick={() => setSettingsOpen(true)}>
          Set your interview date
        </Button>{' '}
        to get a daily pace.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-0.5 text-[13px]">
      <p className="flex items-baseline justify-between gap-2">
        <span className="font-medium">Interview {formatShortDay(interview.date)}</span>
        <span className="text-muted-foreground">{daysLeft(pace.daysLeft)}</span>
      </p>
      {solved >= total ? (
        <p className="font-medium text-success-foreground">All {total} done</p>
      ) : (
        pace.daysLeft > 0 && (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{pace.perDay}</span> a day to finish ·{' '}
            <span className={cn('font-medium', pace.delta < 0 ? 'text-attempted-foreground' : 'text-success-foreground')}>
              {versusPace(pace.delta)}
            </span>
          </p>
        )
      )}
    </div>
  )
}
