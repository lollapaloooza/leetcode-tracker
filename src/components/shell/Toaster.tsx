import { Button } from '@/components/ui/button'
import { cn } from '@/lib/_utils/cn'
import { useUI, type Toast } from '@/lib/store'
import { useToastTimer } from './useToastTimer'

// Matches --animate-toast-timer in index.css, the bar that shows the time left.
const TOAST_MS = 5000

/** One message at a time at the bottom of the screen; on phones, above the tab bar. */
export function Toaster() {
  const toast = useUI((s) => s.toast)
  const dismiss = useUI((s) => s.dismissToast)
  return (
    // Always in the page, so screen readers announce each message as it arrives.
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-20 z-50 flex justify-center sm:bottom-6">
      {toast && <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />}
    </div>
  )
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const timer = useToastTimer(TOAST_MS, onDismiss)
  return (
    <div
      className="pointer-events-auto w-full max-w-md animate-toast-in overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-lg ring-1 ring-border sm:w-auto sm:min-w-80"
      onMouseEnter={timer.pause}
      onMouseLeave={timer.resume}
      onFocus={timer.pause}
      onBlur={timer.resume}
    >
      <div className="flex min-h-11 items-center gap-4 py-1.5 pr-1.5 pl-4 text-[13px]">
        <span className="flex-1">{toast.text}</span>
        {toast.action && (
          <Button
            variant="ghost"
            size="sm"
            className="font-semibold text-link hover:text-link"
            onClick={() => {
              toast.action?.run()
              onDismiss()
            }}
          >
            {toast.action.label}
          </Button>
        )}
      </div>
      {/* How long Undo stays: drains as the toast waits, holds while hovered. */}
      <span
        aria-hidden
        className={cn('block h-0.5 origin-left animate-toast-timer bg-primary motion-reduce:hidden', timer.paused && '[animation-play-state:paused]')}
      />
    </div>
  )
}
