import { Button } from '@/components/ui/button'
import { useUI } from '@/lib/store'

/** Where the Now card was, after you set its problem aside: you choose what comes next, not the app. */
export function EmptyFocus() {
  const restoreFocus = useUI((s) => s.restoreFocus)
  return (
    <p className="flex animate-rise flex-wrap items-center gap-x-1.5 rounded-xl border border-dashed px-4 py-3 text-[13px] text-muted-foreground">
      Nothing in focus — press Start on the one you want next.
      <Button variant="link" size="sm" className="h-auto p-0 text-[13px]" onClick={restoreFocus}>
        Or show the next one here
      </Button>
    </p>
  )
}
