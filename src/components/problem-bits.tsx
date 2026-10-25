import { Fragment, type ReactNode } from 'react'
import { CheckIcon, EllipsisIcon, ExternalLinkIcon, MonitorPlayIcon, PlayIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuItem,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { leetcodeUrl, neetcodeUrl, videoUrl, type Problem } from '@/data/problems'
import type { Result } from '@/lib/srs'
import { STATUS_LABEL, type Complexity, type Status } from '@/store'
import { useUI } from '@/ui-store'

export const STATUSES = Object.keys(STATUS_LABEL) as Status[]

export const RESULT_TEXT: Record<Result, string> = {
  solved: 'text-success-foreground',
  helped: 'text-success-foreground',
  failed: 'text-hard',
}

/** Empty ring → half-filled (attempted) → filled check (solved) → outlined check (with help). */
export function StatusGlyph({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-5 shrink-0 place-items-center rounded-full border-2 text-white transition-colors',
        status === 'todo' && 'border-border group-hover/status:border-muted-foreground/60',
        status === 'attempted' && 'border-attempted bg-[conic-gradient(var(--attempted)_0_50%,transparent_0)]',
        status === 'solved' && 'border-success bg-success',
        status === 'helped' && 'border-success text-success',
        className,
      )}
    >
      {(status === 'solved' || status === 'helped') && <CheckIcon className="size-3" strokeWidth={3.5} />}
    </span>
  )
}

/** Same visual language as StatusGlyph, for the outcome of one attempt. */
export function ResultGlyph({ result }: { result: Result }) {
  if (result === 'failed')
    return (
      <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-hard text-hard">
        <XIcon className="size-3" strokeWidth={3.5} />
      </span>
    )
  return <StatusGlyph status={result} />
}

/** Studying counts as practice but isn't a solve — a calm icon instead of a result. */
export function StudyGlyph() {
  return (
    <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-link">
      <MonitorPlayIcon className="size-3" strokeWidth={2.5} />
    </span>
  )
}

export function StatusMenu({
  status,
  title,
  onChange,
}: {
  status: Status
  title: string
  onChange: (s: Status) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Status of ${title}: ${STATUS_LABEL[status]}`}
          title={STATUS_LABEL[status]}
          className="group/status grid size-6 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <StatusGlyph status={status} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuRadioGroup value={status} onValueChange={(v) => onChange(v as Status)}>
          {STATUSES.map((s) => (
            <DropdownMenuRadioItem key={s} value={s} className="gap-2">
              <StatusGlyph status={s} />
              {STATUS_LABEL[s]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ProblemLinks({ problem }: { problem: Problem }) {
  const links = [
    { label: 'LC', site: 'LeetCode', href: leetcodeUrl(problem), note: problem.premium ? ' (Premium)' : '' },
    { label: 'NC', site: 'NeetCode', href: neetcodeUrl(problem), note: '' },
  ]
  const linkClass =
    'font-semibold tracking-wide text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-link'
  return (
    <span className="flex gap-1">
      {links.map((l) => (
        <Button key={l.label} asChild variant="outline" size="xs" className={linkClass}>
          <a
            href={l.href}
            target="_blank"
            rel="noreferrer"
            title={l.site + l.note}
            aria-label={`Open ${problem.title} on ${l.site}${l.note}`}
          >
            {l.label}
            <ExternalLinkIcon className="opacity-60 max-sm:hidden" />
          </a>
        </Button>
      ))}
      <Button asChild variant="outline" size="icon-xs" className={linkClass}>
        <a
          href={videoUrl(problem)}
          target="_blank"
          rel="noreferrer"
          title="NeetCode solution video"
          aria-label={`Watch the NeetCode solution video for ${problem.title}`}
        >
          <PlayIcon className="fill-current" />
        </a>
      </Button>
    </span>
  )
}

/** Problem name that opens its details & attempt history. */
export function ProblemTitle({ problem, className }: { problem: Problem; className?: string }) {
  const openDetail = useUI((s) => s.openDetail)
  return (
    <button
      type="button"
      onClick={() => openDetail(problem.id)}
      className={cn(
        'min-w-0 truncate rounded-sm text-left underline-offset-[3px] outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50',
        'decoration-muted-foreground/50',
        className,
      )}
    >
      {problem.title}
    </button>
  )
}

export function ComplexityTags({ complexity, className }: { complexity?: Complexity; className?: string }) {
  if (!complexity || (!complexity.time && !complexity.space)) return null
  const parts = [
    ['Time', complexity.time],
    ['Space', complexity.space],
  ].filter(([, value]) => value)
  return (
    <span className={cn('inline-flex flex-wrap gap-1.5', className)}>
      {parts.map(([label, value]) => (
        <span key={label} className="inline-flex items-baseline gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {label}
          <code className="font-mono text-[11.5px] text-foreground">{value}</code>
        </span>
      ))}
    </span>
  )
}


export interface RowAction {
  label: string
  icon: ReactNode
  onSelect: () => void
  /** Draw a separator above this action */
  separated?: boolean
}

/** The ⋯ menu at the end of a planned row: reorder, postpone, remove. */
export function RowMenu({ title, actions }: { title: string; actions: RowAction[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`More actions for ${title}`}>
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {actions.map((a) => (
          <Fragment key={a.label}>
            {a.separated && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={a.onSelect}>
              {a.icon}
              {a.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
