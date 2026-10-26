import { createContext } from 'react'

/** Lets each row's grip reach the board's keyboard moves. */
export const BoardKeys = createContext<((sid: string, step: -1 | 1) => void) | null>(null)
