import { useState, type ReactNode } from 'react'
import { ArrowLeftIcon, ChevronRightIcon, MonitorPlayIcon, RotateCcwIcon } from 'lucide-react'
import { beginTimer } from '@/components/timer/start-problem'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { problemById, videoUrl, type Problem } from '@/data/problems'
import { openInNewTab } from '@/lib/_utils/browser'
import { cn } from '@/lib/_utils/cn'
import { nextToStudy, quickReview } from '@/lib/domain'
import { useTracker, useUI } from '@/lib/store'
import { DifficultyTag } from './DifficultyTag'

/** One small thing for a tired evening — it still counts for the week. */
export function ShortOnTimeDialog({ today }: { today: string }) {
  const open = useUI((s) => s.shortOnTimeOpen)
  const setOpen = useUI((s) => s.setShortOnTimeOpen)
  // Fresh content each time it opens, kept while it animates closed.
  const [session, setSession] = useState({ open: false, n: 0 })
  if (open !== session.open) setSession({ open, n: open ? session.n + 1 : session.n })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        {session.n > 0 && <ShortOnTimeBody key={session.n} today={today} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ShortOnTimeBody({ today, onDone }: { today: string; onDone: () => void }) {
  // Picked once per opening so the options don't shift while you read them.
  const [picks] = useState(() => {
    const s = useTracker.getState()
    const review = quickReview(s, today)
    const study = nextToStudy(s, today)
    return {
      review: review ? { problem: problemById.get(review.id)!, reason: review.reason } : null,
      study: study !== null ? problemById.get(study)! : null,
    }
  })
  const [studying, setStudying] = useState<Problem | null>(null)
  const [note, setNote] = useState('')
  const setTab = useUI((s) => s.setTab)

  if (studying) {
    const save = () => {
      useTracker.getState().logStudy(studying.id, note, today)
      onDone()
    }
    return (
      <div className="grid gap-4">
        <DialogHeader>
          <DialogTitle>Watch & note</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span className="truncate">{studying.title}</span>
            <DifficultyTag difficulty={studying.difficulty} />
          </DialogDescription>
        </DialogHeader>
        <Button variant="outline" className="justify-start" onClick={() => openInNewTab(videoUrl(studying))}>
          <MonitorPlayIcon /> Open NeetCode's video again
        </Button>
        <label className="grid gap-2">
          <span className="text-[13px] font-medium">What's the key idea?</span>
          <Textarea
            autoFocus
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
            }}
            placeholder="In your own words — e.g. “binary search on the answer: can we finish at speed k?”"
          />
        </label>
        <p className="text-xs text-muted-foreground">It goes on tomorrow's list so you solve it yourself while it's fresh.</p>
        <DialogFooter className="items-center sm:justify-between">
          <Button variant="ghost" onClick={() => setStudying(null)}>
            <ArrowLeftIcon /> Back
          </Button>
          <Button onClick={save}>Save — solve it tomorrow</Button>
        </DialogFooter>
      </div>
    )
  }

  const startReview = () => {
    if (!picks.review) return
    const s = useTracker.getState()
    s.addToPlan([picks.review.problem.id], today)
    if (!s.timer) beginTimer(picks.review.problem.id, today)
    setTab('today')
    onDone()
  }
  const startStudy = () => {
    if (!picks.study) return
    openInNewTab(videoUrl(picks.study))
    setStudying(picks.study)
  }

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Short on time?</DialogTitle>
        <DialogDescription>Pick one small thing. It counts for your week just the same.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Option
          icon={<RotateCcwIcon />}
          title="Quick review"
          minutes="15–20 min"
          disabled={!picks.review}
          onClick={startReview}
        >
          {picks.review ? (
            <>
              <span className="font-medium text-foreground">{picks.review.problem.title}</span> · {picks.review.reason}. The
              timer starts right away.
            </>
          ) : (
            'Nothing to review yet — solve a few problems first.'
          )}
        </Option>
        <Option
          icon={<MonitorPlayIcon />}
          title="Watch & note"
          minutes="~15 min"
          disabled={!picks.study}
          onClick={startStudy}
        >
          {picks.study ? (
            <>
              <span className="font-medium text-foreground">{picks.study.title}</span> · watch NeetCode's explanation, then
              write the key idea in your own words.
            </>
          ) : (
            "You've studied or solved everything — impressive."
          )}
        </Option>
      </div>
    </div>
  )
}

function Option({
  icon,
  title,
  minutes,
  disabled,
  onClick,
  children,
}: {
  icon: ReactNode
  title: string
  minutes: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group/option flex items-center gap-3 rounded-lg p-3 text-left ring-1 ring-border transition-colors outline-none',
        'hover:bg-muted/50 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-link [&_svg]:size-4.5">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{minutes}</span>
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{children}</span>
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/option:translate-x-0.5" />
    </button>
  )
}
