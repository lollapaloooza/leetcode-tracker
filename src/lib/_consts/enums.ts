// Runtime lists of the domain's union types, in display order — for menus, validation and loops.
import type { Confidence, Difficulty, Result, Status } from '@/types'

export const STATUSES: readonly Status[] = ['todo', 'attempted', 'solved', 'helped']

export const RESULTS: readonly Result[] = ['solved', 'helped', 'failed']

export const CONFIDENCES: readonly Confidence[] = [1, 2, 3]

export const DIFFICULTIES: readonly Difficulty[] = ['Easy', 'Medium', 'Hard']
