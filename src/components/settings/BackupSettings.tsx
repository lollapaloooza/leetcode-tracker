import { useRef, type ChangeEvent } from 'react'
import { DownloadIcon, UploadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccountRow } from './AccountRow'
import { ImportDialog } from './ImportDialog'
import { SettingsGroup } from './SettingRow'
import { exportBackup, useBackupImport } from './useBackup'

export function BackupSettings() {
  const fileInput = useRef<HTMLInputElement>(null)
  const backup = useBackupImport()

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // so picking the same file again still fires a change
    if (file) void backup.readFile(file)
  }

  return (
    <SettingsGroup title="Your data">
      <AccountRow />
      <div className="flex flex-col gap-3 py-2">
        <p className="text-[13px] text-muted-foreground">
          Progress is saved in this browser only. Export a backup now and then, and before clearing site data.
        </p>
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
      <ImportDialog step={backup.step} onReplace={backup.replace} onDismiss={backup.dismiss} />
    </SettingsGroup>
  )
}
