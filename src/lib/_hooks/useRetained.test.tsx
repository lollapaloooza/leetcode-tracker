import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useRetained } from './useRetained'

describe('useRetained', () => {
  it('passes values through and keeps the last one once the value goes null', () => {
    const { result, rerender } = renderHook(({ value }: { value: string | null }) => useRetained(value), {
      initialProps: { value: null as string | null },
    })
    expect(result.current).toBeNull()

    rerender({ value: 'first' })
    expect(result.current).toBe('first')
    rerender({ value: 'second' })
    expect(result.current).toBe('second')
    rerender({ value: null })
    expect(result.current).toBe('second')
  })
})
