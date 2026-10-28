import { useRef, type ChangeEvent } from 'react'
import { DownloadIcon, UploadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAccount } from '@/lib/store'
import { ImportDialog } from './ImportDialog'
import { SettingsGroup } from './SettingRow'
import { exportBackup, useBackupImport } from './useBackup'

export function BackupSettings() {
  const fileInput = useRef<HTMLInputElement>(null)
  const backup = useBackupImport()
  // Signed in, the cloud keeps a copy, so there's nothing to warn about.
  const signedIn = useAccount((s) => s.account !== null)

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // so picking the same file again still fires a change
    if (file) void backup.readFile(file)
  }

  return (
    <SettingsGroup title="Your data">
      <div className="flex flex-col gap-3 py-2">
        {!signedIn && (
          <p className="text-[13px] text-muted-foreground">Your progress is only in this browser. Sign in to keep a copy in the cloud.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportBackup}>
            <DownloadIcon />
            Export backup
          </Button>
          <Button variant="ghost" onClick={() => fileInput.current?.click()}>
            <UploadIcon />
            Import…
          </Button>
          <input ref={fileInput} type="file" accept="application/json" hidden aria-label="Backup file to import" onChange={onFile} />
        </div>
      </div>
      <ImportDialog step={backup.step} everywhere={signedIn} onReplace={backup.replace} onDismiss={backup.dismiss} />
    </SettingsGroup>
  )
}
