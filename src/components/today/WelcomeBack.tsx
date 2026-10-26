import type { ReactNode } from 'react'
import { CheckIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PROBLEMS, problemById } from '@/data/problems'
import { computePace } from '@/lib/insights'
import { dueReviews, restartPick, solvedCount } from '@/lib/planning'
import { spreadSchedule } from '@/lib/srs'
import { useTracker } from '@/store'

/**
 * After a few days off, the usual signals (overdue pile, "behind pace", broken streak) feel like a
 * wall. Offer a small restart instead.
 */
export function WelcomeBack({ today, away }: { today: string; away: number }) {
  const reviews = useTracker((s) => s.reviews)
  const interview = useTracker((s) => s.interview)
  const progress = useTracker((s) => s.progress)
  const restartId = useTracker((s) => restartPick(s))
  const { comeback, dismissComeback } = useTracker.getState()

  const restart = restartId !== null ? problemById.get(restartId) : undefined
  const overdue = dueReviews(reviews, today).length
  const solved = solvedCount(progress)
  const newPace =
    interview && interview.date > today
      ? computePace({ date: interview.date, setOn: today, solvedAtSet: solved }, solved, PROBLEMS.length, today).perDay
      : null

  return (
    <section aria-label="Welcome back" className="relative rounded-xl bg-card p-4 ring-1 ring-primary/30 sm:p-5">
      <Button
        variant="ghost"
        size="icon-xs"
        className="absolute top-3 right-3 text-muted-foreground"
        aria-label="Dismiss"
        onClick={() => dismissComeback(today)}
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
            Today, one easy win: {progress[restart.id]?.status === 'solved' ? 're-solve' : 'solve'}{' '}
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
        <Button onClick={() => comeback(today, restartId)}>Restart small</Button>
        <Button variant="ghost" className="text-muted-foreground" onClick={() => dismissComeback(today)}>
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
