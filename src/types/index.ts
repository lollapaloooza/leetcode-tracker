export type * from './tracker'
// The catalog's types are derived from the catalog itself (topics are its `as const` list).
export type { Difficulty, Problem, Topic } from '@/data/problems'
