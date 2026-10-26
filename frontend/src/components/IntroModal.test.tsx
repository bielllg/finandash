import { render, screen, fireEvent } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import IntroModal from './IntroModal'

it('focuses the dialog, handles Escape and restores focus', () => {
  const trigger = document.createElement('button')
  document.body.append(trigger)
  trigger.focus()
  const close = vi.fn()
  const { unmount } = render(<IntroModal onClose={close} />)
  expect(document.activeElement).toBe(screen.getByRole('dialog'))
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(close).toHaveBeenCalledOnce()
  unmount()
  expect(document.activeElement).toBe(trigger)
  trigger.remove()
})
