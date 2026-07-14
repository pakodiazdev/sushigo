/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PayPeriodStatusBadge } from '../PayPeriodStatusBadge'

describe('PayPeriodStatusBadge', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders "Abierto" for OPEN', () => {
    render(<PayPeriodStatusBadge status="OPEN" />)
    expect(screen.getByText('Abierto')).toBeDefined()
  })

  it('renders "Cerrado" for CLOSED', () => {
    render(<PayPeriodStatusBadge status="CLOSED" />)
    expect(screen.getByText('Cerrado')).toBeDefined()
  })

  it('renders "Reabierto" for REOPENED', () => {
    render(<PayPeriodStatusBadge status="REOPENED" />)
    expect(screen.getByText('Reabierto')).toBeDefined()
  })

  it('forwards a custom className', () => {
    render(<PayPeriodStatusBadge status="CLOSED" className="my-extra-class" />)
    expect(screen.getByText('Cerrado').className).toContain('my-extra-class')
  })
})
