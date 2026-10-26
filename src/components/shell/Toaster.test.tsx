import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useUI } from '@/lib/store'
import { Toaster } from './Toaster'

const toast = (run = vi.fn()) => act(() => useUI.getState().showToast({ text: 'Two Sum moved to the backlog', action: { label: 'Undo', run } }))

describe('Toaster', () => {
  afterEach(() => vi.useRealTimers())

  it('says what happened, and Undo runs once and closes it', async () => {
    const undo = vi.fn()
    render(<Toaster />)
    toast(undo)
    expect(screen.getByRole('status')).toHaveTextContent('Two Sum moved to the backlog')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Undo' }))
    expect(undo).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('goes away by itself after 5 seconds, but waits while you point at it', () => {
    vi.useFakeTimers()
    render(<Toaster />)
    toast()

    act(() => vi.advanceTimersByTime(3000))
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Undo' }).closest('div')!.parentElement!)
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByRole('status')).toHaveTextContent('moved to the backlog')

    fireEvent.mouseLeave(screen.getByRole('button', { name: 'Undo' }).closest('div')!.parentElement!)
    act(() => vi.advanceTimersByTime(1900))
    expect(screen.getByRole('status')).not.toBeEmptyDOMElement()
    act(() => vi.advanceTimersByTime(200))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('replaces an older message with a newer one', () => {
    render(<Toaster />)
    toast()
    act(() => useUI.getState().showToast({ text: 'Timer stopped at 5:00' }))
    expect(screen.getByRole('status')).toHaveTextContent('Timer stopped at 5:00')
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })
})
