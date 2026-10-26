import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRetained } from '@/lib/_hooks/useRetained'
import { BackupContents } from './BackupContents'
import { exportBackup, type ImportStep } from './useBackup'

interface ImportDialogProps {
  step: ImportStep | null
  onReplace: () => void
  onDismiss: () => void
}

/** Confirm before a backup replaces what's saved, or say why the file can't be imported. */
export function ImportDialog({ step, onReplace, onDismiss }: ImportDialogProps) {
  const shown = useRetained(step)

  return (
    <Dialog open={step !== null} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="sm:max-w-md">
        {shown?.kind === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>Replace your progress?</DialogTitle>
              <DialogDescription>
                Everything saved in this browser is replaced with <span className="font-medium text-foreground">{shown.fileName}</span>.
              </DialogDescription>
            </DialogHeader>
            <BackupContents data={shown.data} />
            <p className="text-[13px] text-muted-foreground">
              Want a copy of what you have now?{' '}
              <Button variant="link" size="xs" className="h-auto p-0 text-[13px]" onClick={exportBackup}>
                Export it first
              </Button>
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={onDismiss}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={onReplace}>
                Replace progress
              </Button>
            </DialogFooter>
          </>
        )}
        {shown?.kind === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle>Can't import this file</DialogTitle>
              <DialogDescription>{shown.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={onDismiss}>OK</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
