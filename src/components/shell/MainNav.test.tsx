import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Tabs } from '@/components/ui/tabs'
import { idOf } from '@/test/builders'
import { resetStores } from '@/test/stores'
import { MainNav } from './MainNav'

const today = '2026-10-26'

const renderNav = () =>
  render(
    <Tabs value="today">
      <MainNav today={today} />
    </Tabs>,
  )

describe('MainNav', () => {
  it('counts what is planned today and the patterns with notes', () => {
    resetStores({
      plans: { [today]: [{ id: idOf('Two Sum'), done: true }, { id: idOf('LRU Cache'), done: false }] },
      notes: { [idOf('Two Sum')]: 'Keep a map of complements' },
    })
    renderNav()
    expect(screen.getByRole('tab', { name: 'Today 2' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Patterns 1' })).toBeInTheDocument()
  })

  it('leaves out counts of zero', () => {
    renderNav()
    expect(screen.getAllByRole('tab')).toHaveLength(4)
    for (const tab of screen.getAllByRole('tab')) expect(tab).not.toHaveTextContent(/\d/)
  })
})
