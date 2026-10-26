import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/_utils/cn'

/** The ✕ at the end of a row: muted until hovered, then red. Bigger on phones, for a thumb. */
export function RemoveButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn('shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive max-sm:size-9', className)}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <XIcon />
    </Button>
  )
}
