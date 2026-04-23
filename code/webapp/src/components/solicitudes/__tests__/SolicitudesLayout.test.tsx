// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

import { SolicitudesLayout } from '../SolicitudesLayout'

afterEach(() => cleanup())

const defaultProps = {
    isManager: false,
    activeTab: 'mine' as const,
    pendingCount: 0,
    onTabChange: vi.fn(),
    children: <div data-testid="content">Content</div>,
}

describe('SolicitudesLayout — employee view', () => {
    it('renders children without tabs', () => {
        render(<SolicitudesLayout {...defaultProps} />)
        expect(screen.getByTestId('content')).toBeDefined()
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

    it('renders children inside layout', () => {
        render(<SolicitudesLayout {...managerProps} />)
        expect(screen.getByTestId('content')).toBeDefined()
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
