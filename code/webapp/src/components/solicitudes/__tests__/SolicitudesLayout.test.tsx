// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

import { SolicitudesLayout } from '../SolicitudesLayout'

afterEach(() => cleanup())

const mineContent = <div data-testid="mine-content">Mine Content</div>
const pendingContent = <div data-testid="pending-content">Pending Content</div>

const defaultProps = {
    isManager: false,
    activeTab: 'mine' as const,
    pendingCount: 0,
    onTabChange: vi.fn(),
    mineContent,
    pendingContent,
}

describe('SolicitudesLayout — employee view', () => {
    it('renders mineContent without tabs', () => {
        render(<SolicitudesLayout {...defaultProps} />)
        expect(screen.getByTestId('mine-content')).toBeDefined()
        expect(screen.queryByText('Mis solicitudes')).toBeNull()
        expect(screen.queryByText('Pendientes de aprobación')).toBeNull()
    })
})

describe('SolicitudesLayout — manager view', () => {
    const managerProps = { ...defaultProps, isManager: true }

    it('renders Mis solicitudes tab', () => {
        render(<SolicitudesLayout {...managerProps} />)
        expect(screen.getByText('Mis solicitudes')).toBeDefined()
    })

    it('renders Pendientes de aprobación tab', () => {
        render(<SolicitudesLayout {...managerProps} />)
        expect(screen.getByText('Pendientes de aprobación')).toBeDefined()
    })

    it('renders mineContent when activeTab is mine', () => {
        render(<SolicitudesLayout {...managerProps} activeTab="mine" />)
        expect(screen.getByTestId('mine-content')).toBeDefined()
        expect(screen.queryByTestId('pending-content')).toBeNull()
    })

    it('renders pendingContent when activeTab is pending', () => {
        render(<SolicitudesLayout {...managerProps} activeTab="pending" />)
        expect(screen.getByTestId('pending-content')).toBeDefined()
        expect(screen.queryByTestId('mine-content')).toBeNull()
    })

    it('does not show badge when pendingCount is 0', () => {
        render(<SolicitudesLayout {...managerProps} pendingCount={0} />)
        expect(screen.queryByText('0')).toBeNull()
    })

    it('shows badge with pendingCount when > 0', () => {
        render(<SolicitudesLayout {...managerProps} pendingCount={3} />)
        expect(screen.getByText('3')).toBeDefined()
    })

    it('calls onTabChange when Pendientes tab is clicked', () => {
        const onTabChange = vi.fn()
        render(<SolicitudesLayout {...managerProps} onTabChange={onTabChange} />)
        fireEvent.click(screen.getByText('Pendientes de aprobación'))
        expect(onTabChange).toHaveBeenCalledWith('pending')
    })

    it('calls onTabChange when Mis solicitudes tab is clicked', () => {
        const onTabChange = vi.fn()
        render(<SolicitudesLayout {...managerProps} activeTab="pending" onTabChange={onTabChange} />)
        fireEvent.click(screen.getByText('Mis solicitudes'))
        expect(onTabChange).toHaveBeenCalledWith('mine')
    })

    it('active tab has primary border class', () => {
        render(<SolicitudesLayout {...managerProps} activeTab="mine" />)
        const mineBtn = screen.getByText('Mis solicitudes').closest('button')
        expect(mineBtn?.className).toContain('border-primary')
    })

    it('inactive tab has transparent border class', () => {
        render(<SolicitudesLayout {...managerProps} activeTab="mine" />)
        const pendingBtn = screen.getByText('Pendientes de aprobación').closest('button')
        expect(pendingBtn?.className).toContain('border-transparent')
    })
})
