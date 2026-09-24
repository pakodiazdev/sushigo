// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { DemoBanner } from '../demo-banner'

const demoMode = vi.hoisted(() => ({
  value: { isDemo: false, dataResets: false, demoEmail: null as string | null },
}))

vi.mock('../../hooks/use-demo-mode', () => ({
  useDemoMode: () => demoMode.value,
}))

describe('DemoBanner', () => {
  afterEach(cleanup)

  it('renders nothing outside the demo', () => {
    demoMode.value = { isDemo: false, dataResets: false, demoEmail: null }

    const { container } = render(<DemoBanner />)

    expect(container.innerHTML).toBe('')
  })

  it('shows the disclaimer, the reset notice and the public account on the demo', () => {
    demoMode.value = { isDemo: true, dataResets: true, demoEmail: 'demo@sushigo.com' }

    render(<DemoBanner />)

    expect(screen.getByRole('status').textContent).toContain('Entorno de demostración')
    expect(screen.getByRole('status').textContent).toContain('se restablecen periódicamente')
    expect(screen.getByText('demo@sushigo.com')).toBeTruthy()
  })

  it('omits the account line when no demo account is advertised', () => {
    demoMode.value = { isDemo: true, dataResets: false, demoEmail: null }

    render(<DemoBanner />)

    expect(screen.getByRole('status').textContent).not.toContain('Cuenta de acceso')
    expect(screen.getByRole('status').textContent).not.toContain('se restablecen')
  })
})
