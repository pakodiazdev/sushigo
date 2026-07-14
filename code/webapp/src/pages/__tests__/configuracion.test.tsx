// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

const mockCan = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({ component: null }),
}))

vi.mock('@/lib/route-guards', () => ({
  requirePermission: () => () => undefined,
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ can: mockCan }),
}))

vi.mock('@/components/settings/punctuality-config-section', () => ({
  PunctualityConfigSection: () => <div>Puntualidad Section</div>,
}))

vi.mock('@/components/settings/overtime-lft-tiers-section', () => ({
  OvertimeLftTiersSection: () => <div>Horas Extra Section</div>,
}))

vi.mock('@/components/settings/vacation-policy-section', () => ({
  VacationPolicySection: () => <div>Vacaciones Section</div>,
}))

import { ConfiguracionPage } from '../configuracion'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ConfiguracionPage', () => {
  it('shows all tabs when the user has every permission', () => {
    mockCan.mockReturnValue(true)
    render(<ConfiguracionPage />)

    expect(screen.getByText('Puntualidad')).toBeDefined()
    expect(screen.getByText('Horas Extra')).toBeDefined()
    expect(screen.getByText('Vacaciones')).toBeDefined()
    expect(screen.getByText('Puntualidad Section')).toBeDefined()
  })

  it('hides the Vacaciones tab when the user lacks vacation-policy.manage', () => {
    mockCan.mockImplementation((permission: string) => permission === 'punctuality.manage')
    render(<ConfiguracionPage />)

    expect(screen.getByText('Puntualidad')).toBeDefined()
    expect(screen.queryByText('Vacaciones')).toBeNull()
  })

  it('shows the Vacaciones tab and section when the user has vacation-policy.manage', () => {
    mockCan.mockImplementation((permission: string) => permission === 'vacation-policy.manage')
    render(<ConfiguracionPage />)

    expect(screen.getByText('Vacaciones')).toBeDefined()
    expect(screen.getByText('Vacaciones Section')).toBeDefined()
  })

  it('hides the Horas Extra tab when the user lacks overtime.manage', () => {
    mockCan.mockImplementation((permission: string) => permission === 'punctuality.manage')
    render(<ConfiguracionPage />)

    expect(screen.getByText('Puntualidad')).toBeDefined()
    expect(screen.queryByText('Horas Extra')).toBeNull()
  })

  it('hides the Puntualidad tab when the user lacks punctuality.manage', () => {
    mockCan.mockImplementation((permission: string) => permission === 'overtime.manage')
    render(<ConfiguracionPage />)

    expect(screen.queryByText('Puntualidad')).toBeNull()
    expect(screen.getByText('Horas Extra')).toBeDefined()
    expect(screen.getByText('Horas Extra Section')).toBeDefined()
  })

  it('renders no tabs when the user has neither permission', () => {
    mockCan.mockReturnValue(false)
    render(<ConfiguracionPage />)

    expect(screen.queryByText('Puntualidad')).toBeNull()
    expect(screen.queryByText('Horas Extra')).toBeNull()
  })
})
