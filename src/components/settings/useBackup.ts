import { useState } from 'react'
import { downloadFile } from '@/lib/_utils/browser'
import { localDate } from '@/lib/_utils/date'
import { exportable, parseBackup, useTracker, type BackupParse } from '@/lib/store'
import type { TrackerData } from '@/types'

export type ImportStep = { kind: 'confirm'; data: TrackerData; fileName: string } | { kind: 'error'; message: string }

const IMPORT_ERROR: Record<Extract<BackupParse, { ok: false }>['reason'], string> = {
  'not-json': "This file isn't valid JSON. Pick a backup exported from this app.",
  'not-a-backup': "This file doesn't look like a LeetCode Tracker backup.",
}

/** Download everything saved as a dated JSON backup. */
export function exportBackup() {
  const data = JSON.stringify(exportable(useTracker.getState()), null, 2)
  downloadFile(`leetcode-tracker-${localDate()}.json`, data, 'application/json')
}

/** Importing a backup: read the file, then confirm (or explain the problem) before anything is replaced. */
export function useBackupImport() {
  const [step, setStep] = useState<ImportStep | null>(null)

  const readFile = async (file: File) => {
    const result = parseBackup(await file.text())
    setStep(result.ok ? { kind: 'confirm', data: result.data, fileName: file.name } : { kind: 'error', message: IMPORT_ERROR[result.reason] })
  }

  const replace = () => {
    if (step?.kind === 'confirm') useTracker.getState().importData(step.data)
    setStep(null)
  }

  return { step, readFile, replace, dismiss: () => setStep(null) }
}
