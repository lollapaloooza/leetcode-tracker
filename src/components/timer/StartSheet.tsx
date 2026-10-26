import { useId } from 'react'
import { ExternalLinkIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import type { Problem } from '@/data/problems'
import { SITE_NAME, type Site } from '@/lib/domain'
import { useStartSheet } from './useStartSheet'

/** "Open it on LeetCode or NeetCode?" — optional: closing the drawer starts only the timer. */
export function StartSheet({ today }: { today: string }) {
  const sheet = useStartSheet(today)
  const rememberId = useId()
  if (!sheet.problem) return null
  const { problem } = sheet

  return (
    <Sheet open={sheet.open} onOpenChange={(open) => !open && sheet.justStart()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto w-full max-w-lg gap-5 rounded-t-2xl border-x px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <span aria-hidden className="mx-auto h-1 w-9 rounded-full bg-border" />
        <SheetHeader className="flex-row items-start gap-3 p-0">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <SheetTitle className="text-lg leading-tight">Start {problem.title}</SheetTitle>
            <SheetDescription>The timer starts either way. Open the problem too?</SheetDescription>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground max-sm:size-9"
            aria-label="Close and start only the timer"
            title="Start without opening a tab"
            onClick={sheet.justStart}
          >
            <XIcon />
          </Button>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-2.5">
          <SiteChoice problem={problem} site="leetcode" onPick={sheet.pick} />
          <SiteChoice problem={problem} site="neetcode" onPick={sheet.pick} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor={rememberId} className="flex cursor-pointer items-center gap-2.5 text-[13px] text-muted-foreground">
            <Switch id={rememberId} checked={sheet.remember} onCheckedChange={sheet.setRemember} />
            Remember my choice
          </label>
          {/* A full-width, thumb-sized button on phones. */}
          <Button variant="ghost" className="max-sm:h-11 max-sm:w-full max-sm:bg-muted" onClick={sheet.justStart}>
            Just start the timer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

const NOTE: Record<Site, { free: string; premium: string }> = {
  leetcode: { free: 'The original problem and judge', premium: 'Needs LeetCode Premium' },
  neetcode: { free: 'With the solution video, for when you’re stuck', premium: 'A free copy, with the solution video' },
}

function SiteChoice({ problem, site, onPick }: { problem: Problem; site: Site; onPick: (site: Site) => void }) {
  const premium = Boolean(problem.premium)
  return (
    <button
      type="button"
      onClick={() => onPick(site)}
      className="group/site flex min-h-24 flex-col items-start gap-1 rounded-xl border bg-background p-3.5 text-left transition-[border-color,background-color,transform] duration-150 outline-none hover:-translate-y-px hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] sm:px-4"
    >
      <span className="flex w-full items-center gap-2 text-[15px] font-semibold">
        {SITE_NAME[site]}
        {premium && site === 'neetcode' && (
          <span className="rounded-full px-1.5 text-[11px] font-medium text-success-foreground ring-1 ring-success/40">Free</span>
        )}
        <ExternalLinkIcon className="ml-auto size-3.5 text-muted-foreground transition-transform group-hover/site:translate-x-0.5 group-hover/site:-translate-y-0.5" />
      </span>
      <span className={premium && site === 'leetcode' ? 'text-xs text-attempted-foreground' : 'text-xs text-muted-foreground'}>
        {premium ? NOTE[site].premium : NOTE[site].free}
      </span>
    </button>
  )
}
