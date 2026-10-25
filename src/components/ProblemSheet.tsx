import { useMemo, useState, type ReactNode } from 'react'
import { CheckIcon, PencilLineIcon, PlusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PROBLEMS, type Problem } from '@/data/problems'
import { formatRelative, formatShortDay } from '@/lib/date'
import { CONFIDENCE_LABEL, RESULT_LABEL, TARGET_MINUTES } from '@/lib/srs'
import { STATUS_LABEL, useTracker, type Attempt, type Study } from '@/store'
import { useUI } from '@/ui-store'
import { DifficultyTag } from './DifficultyTag'
import { ComplexityTags, ProblemLinks, ResultGlyph, StatusGlyph, StudyGlyph } from './problem-bits'

const byId = new Map(PROBLEMS.map((p) => [p.id, p]))
const minutesOf = (a: Attempt) => (a.seconds === null ? null : Math.max(1, Math.round(a.seconds / 60)))

export function ProblemSheet({ today }: { today: string }) {
  const detailFor = useUI((s) => s.detailFor)
  const closeDetail = useUI((s) => s.closeDetail)
  // Keep showing the last problem while the drawer animates closed.
  const [shownId, setShownId] = useState(detailFor)
  if (detailFor !== null && detailFor !== shownId) setShownId(detailFor)
  const problem = shownId !== null ? byId.get(shownId) : undefined

  return (
    <Sheet open={detailFor !== null} onOpenChange={(open) => !open && closeDetail()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {problem && <ProblemDetails problem={problem} today={today} />}
      </SheetContent>
    </Sheet>
  )
}

function ProblemDetails({ problem, today }: { problem: Problem; today: string }) {
  const status = useTracker((s) => s.progress[problem.id]?.status ?? 'todo')
  const review = useTracker((s) => s.reviews[problem.id])
  const note = useTracker((s) => s.notes[problem.id])
  const complexity = useTracker((s) => s.complexity[problem.id])
  const allAttempts = useTracker((s) => s.attempts)
  const allStudies = useTracker((s) => s.studies)
  const planned = useTracker((s) => Boolean(s.plans[today]?.some((p) => p.id === problem.id)))
  const openLog = useUI((s) => s.openLog)
  const target = TARGET_MINUTES[problem.difficulty]

  // Chronological, so "first try" vs "retry" vs "review" can be told apart.
  const attempts = useMemo(() => allAttempts.filter((a) => a.id === problem.id), [allAttempts, problem.id])
  // Newest first, with study sessions woven in between attempts.
  const timeline = useMemo(() => {
    const items: ({ kind: 'attempt'; a: Attempt; label: string; at: string } | { kind: 'study'; st: Study; at: string })[] = [
      ...attempts.map((a, i) => ({
        kind: 'attempt' as const,
        a,
        at: a.at,
        label: a.prev.status === 'solved' || a.prev.status === 'helped' ? 'Review' : i > 0 ? 'Retry' : 'First try',
      })),
      ...allStudies.filter((st) => st.id === problem.id).map((st) => ({ kind: 'study' as const, st, at: st.at })),
    ]
    return items.sort((x, y) => y.at.localeCompare(x.at))
  }, [attempts, allStudies, problem.id])
  const timed = attempts.map(minutesOf).filter((m): m is number => m !== null)
  const best = timed.length ? Math.min(...timed) : null
  const trend = timed.length >= 2 ? timed[timed.length - 1] - timed[0] : null
  const scale = Math.max(target * 1.5, ...timed)

  return (
    <>
      <SheetHeader className="gap-2 border-b pb-4">
        <SheetTitle className="pr-8 text-base">{problem.title}</SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          <DifficultyTag difficulty={problem.difficulty} className="text-[13px]" />
          <span aria-hidden>·</span>
          {problem.topic}
          {problem.premium && <span className="rounded-md border px-1.5 text-[11px]">LC Premium</span>}
        </SheetDescription>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[13px]">
            <StatusGlyph status={status} />
            {STATUS_LABEL[status]}
          </span>
          <ProblemLinks problem={problem} />
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <dl className="grid grid-cols-3 gap-3 border-b py-4">
          <Stat label="Attempts" value={attempts.length || '—'} />
          <Stat
            label="Best time"
            value={best !== null ? `${best} min` : '—'}
            sub={
              trend !== null && trend !== 0 ? (
                <span className={trend < 0 ? 'text-success-foreground' : 'text-attempted-foreground'}>
                  {trend < 0 ? `${-trend} min faster` : `${trend} min slower`} than first
                </span>
              ) : undefined
            }
          />
          <Stat
            label="Next review"
            value={review?.due ? (review.due <= today ? 'Due now' : formatRelative(review.due, today)) : review ? 'Mastered' : '—'}
            sub={
              review?.due && review.due < today ? (
                <span className="text-attempted-foreground">since {formatShortDay(review.due)}</span>
              ) : undefined
            }
          />
        </dl>

        <section className="border-b py-4">
          <h3 className="mb-2 text-[13px] font-semibold">Key idea</h3>
          {note ? (
            <p className="text-sm whitespace-pre-wrap">{note}</p>
          ) : (
            <p className="text-[13px] text-muted-foreground">None yet — add one when you log an attempt.</p>
          )}
          <ComplexityTags complexity={complexity} className="mt-2.5" />
        </section>

        <section className="py-4">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <h3 className="text-[13px] font-semibold">History</h3>
            {timed.length > 0 && <span className="text-xs text-muted-foreground">tick = {target}-min target</span>}
          </div>
          {timeline.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No attempts logged yet.</p>
          ) : (
            <ol className="divide-y">
              {timeline.map((item) => {
                  if (item.kind === 'study') {
                    return (
                      <li key={item.st.key} className="grid grid-cols-[auto_1fr] items-center gap-x-3 py-2.5">
                        <StudyGlyph />
                        <p className="min-w-0 truncate text-[13px]">
                          <span className="font-medium">{formatShortDay(item.st.date)}</span>
                          <span className="text-muted-foreground"> · Watched the solution & wrote the key idea</span>
                        </p>
                      </li>
                    )
                  }
                  const { a, label: kind } = item
                  const minutes = minutesOf(a)
                  const over = minutes !== null && minutes > target
                  return (
                    <li key={a.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5 py-2.5">
                      <ResultGlyph result={a.result} />
                      <p className="min-w-0 truncate text-[13px]">
                        <span className="font-medium">{formatShortDay(a.date)}</span>
                        <span className="text-muted-foreground">
                          {' '}
                          · {kind} · {RESULT_LABEL[a.result]}
                          {a.result === 'solved' && ` · ${CONFIDENCE_LABEL[a.confidence]}`}
                        </span>
                      </p>
                      <span className={cn('text-[13px] tabular-nums', over ? 'text-attempted-foreground' : 'text-muted-foreground')}>
                        {minutes !== null ? `${minutes} min` : 'untimed'}
                      </span>
                      {minutes !== null && (
                        <div className="relative col-span-2 col-start-2 h-1.5 rounded-full bg-track" aria-hidden>
                          <span
                            className={cn('absolute inset-y-0 left-0 rounded-full', over ? 'bg-attempted' : 'bg-primary')}
                            style={{ width: `${(minutes / scale) * 100}%` }}
                          />
                          <span
                            className="absolute -top-0.5 -bottom-0.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground/50"
                            style={{ left: `${(target / scale) * 100}%` }}
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
            </ol>
          )}
        </section>
      </div>

      <SheetFooter className="flex-row border-t">
        <Button className="flex-1" onClick={() => openLog({ id: problem.id })}>
          <PencilLineIcon />
          Log attempt
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={planned}
          onClick={() => useTracker.getState().addToPlan([problem.id], today)}
        >
          {planned ? <CheckIcon /> : <PlusIcon />}
          {planned ? 'In today' : 'Add to today'}
        </Button>
      </SheetFooter>
    </>
  )
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-[15px] font-semibold">{value}</dd>
      {sub && <dd className="mt-0.5 text-[11px] leading-tight">{sub}</dd>}
    </div>
  )
}
