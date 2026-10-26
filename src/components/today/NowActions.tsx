import { CheckIcon, ExternalLinkIcon, PauseIcon, PlayIcon } from 'lucide-react'
import { RowMenu } from '@/components/problem-bits'
import { Button } from '@/components/ui/button'
import { neetcodeUrl, videoUrl, type Problem } from '@/data/problems'
import { nowActions } from './today-actions'
import type { NowCardModel } from './useNowCard'

/** One main action — Start, or log it once you're done — then the timer, links to help, and the rest in ⋯. */
export function NowActions({ problem, today, now }: { problem: Problem; today: string; now: NowCardModel }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t px-5 py-3 max-sm:px-4">
      {now.state === 'idle' ? (
        <Button onClick={now.start}>
          <PlayIcon className="fill-current" />
          Start — opens {now.link.site}
        </Button>
      ) : (
        <>
          <Button onClick={now.finish}>
            <CheckIcon strokeWidth={2.5} />
            Done — log attempt
          </Button>
          <Button variant="outline" asChild>
            <a href={now.link.url} target="_blank" rel="noopener noreferrer">
              Open on {now.link.site}
              <ExternalLinkIcon />
            </a>
          </Button>
          {now.state === 'running' ? (
            <Button variant="ghost" className="text-muted-foreground" onClick={now.pause}>
              <PauseIcon />
              Pause
            </Button>
          ) : (
            <Button variant="ghost" className="text-muted-foreground" onClick={now.resume}>
              <PlayIcon />
              Resume
            </Button>
          )}
        </>
      )}
      <span className="flex-1" />
      <span className="flex items-center gap-4 text-[13px]">
        {now.link.site === 'LeetCode' && (
          <a href={neetcodeUrl(problem)} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
            NeetCode
          </a>
        )}
        <a href={videoUrl(problem)} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
          Solution video
        </a>
      </span>
      <RowMenu title={problem.title} actions={nowActions(problem, today, { timed: now.state !== 'idle' })} />
    </div>
  )
}
