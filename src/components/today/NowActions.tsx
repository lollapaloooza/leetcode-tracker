import type { ReactNode } from 'react'
import { CheckIcon, ExternalLinkIcon, PauseIcon, PlayIcon, SquareIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Problem } from '@/data/problems'
import { cn } from '@/lib/_utils/cn'
import { RemoveButton } from './RemoveButton'
import type { NowCardModel } from './useNowCard'

// Desktop: one row, the main action first and the way out last. Phones: thumb-sized — the main
// action fills the row beside square buttons, and the links get a row of their own underneath.
const MAIN = 'h-9 px-4 font-semibold max-sm:h-12 max-sm:flex-1 max-sm:rounded-[10px] max-sm:text-[15px]'
const SQUARE = 'max-sm:size-12 max-sm:rounded-[10px] max-sm:border max-sm:border-border'

/**
 * One main action — Start, or log it once you're done — then the timer, and at the end the way out:
 * ✕ sets an unstarted problem aside, ⏹ stops the clock and keeps the problem for later.
 */
export function NowActions({ problem, now }: { problem: Problem; now: NowCardModel }) {
  if (now.state === 'idle') {
    return (
      <Bar>
        <Button className={cn('group/start', MAIN)} onClick={now.start}>
          <PlayIcon className="fill-current transition-transform duration-150 group-hover/start:translate-x-0.5" />
          Start
        </Button>
        <span className="flex-1 max-sm:hidden" />
        <RemoveButton label={`Remove ${problem.title} from today`} onClick={now.remove} className={cn('size-8', SQUARE)} />
      </Bar>
    )
  }

  const running = now.state === 'running'
  return (
    <Bar>
      <Button className={MAIN} onClick={now.finish}>
        <CheckIcon strokeWidth={2.5} />
        Done — log attempt
      </Button>
      {/* Icon-only on phones, so Done, Pause and Stop share one line. */}
      <Button
        variant="outline"
        className={cn('h-9 px-3.5 font-medium max-sm:bg-muted max-sm:px-0', SQUARE)}
        onClick={running ? now.pause : now.resume}
      >
        {running ? <PauseIcon /> : <PlayIcon />}
        <span className="max-sm:sr-only">{running ? 'Pause' : 'Resume'}</span>
      </Button>
      <span className="flex-1 max-sm:hidden" />
      <span className="flex items-center gap-1 max-sm:order-last max-sm:grid max-sm:w-full max-sm:grid-cols-2">
        <QuietLink href={now.link.url}>Open on {now.link.site}</QuietLink>
        {/* One text span, so the link's icon gap doesn't space out the words. */}
        <QuietLink href={now.video}>
          <span>
            <span className="max-sm:hidden">Stuck? </span>Solution video
          </span>
        </QuietLink>
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={cn('text-muted-foreground hover:bg-destructive/10 hover:text-destructive', SQUARE)}
        aria-label="Stop the timer and keep the problem for later"
        title="Stop the timer — keep the problem for later"
        onClick={now.stop}
      >
        <SquareIcon />
      </Button>
    </Bar>
  )
}

function Bar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t py-3 pr-4 pl-6 max-sm:gap-y-1.5 max-sm:border-t-0 max-sm:px-3 max-sm:pt-2.5 max-sm:pb-3">
      {children}
    </div>
  )
}

function QuietLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group/link inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-[13px] whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:h-10"
    >
      {children}
      <ExternalLinkIcon className="size-3.5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
    </a>
  )
}
