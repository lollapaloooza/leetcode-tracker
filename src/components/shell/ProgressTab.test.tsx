import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressTab } from './ProgressTab'

const today = '2026-10-26'
const cardTitles = () =>
  screen.queryAllByRole('region').flatMap((card) => {
    const id = card.getAttribute('aria-labelledby')
    return id ? [document.getElementById(id)?.textContent] : []
  })

describe('ProgressTab', () => {
  it('puts the progress cards above the history where there is no sidebar', async () => {
    render(<ProgressTab today={today} withCards />)
    expect(cardTitles()).toEqual(['Progress', 'This week', 'Focus'])
    expect(await screen.findByText('No history yet')).toBeInTheDocument()
  })

  it('is just the history beside the sidebar', async () => {
    render(<ProgressTab today={today} withCards={false} />)
    expect(await screen.findByText('No history yet')).toBeInTheDocument()
    expect(cardTitles()).toEqual([])
  })
})
