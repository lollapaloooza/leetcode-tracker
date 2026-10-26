import { cn } from '@/lib/_utils/cn'

/** A small "live" dot that pulses while the timer runs and rests while it's paused. */
export function LiveDot({ running, className }: { running: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn('relative inline-flex size-2 shrink-0', className)}>
      {running && <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-50 motion-reduce:hidden" />}
      <span className={cn('relative size-2 rounded-full', running ? 'bg-primary' : 'bg-muted-foreground/60')} />
    </span>
  )
}
