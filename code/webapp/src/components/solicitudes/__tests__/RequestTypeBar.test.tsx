// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

afterEach(() => cleanup())

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, disabled, onClick, className }: {
        children: React.ReactNode
        disabled?: boolean
        onClick?: () => void
        className?: string
    }) => (
        <button disabled={disabled} onClick={onClick} className={className}>
            {children}
        </button>
    ),
}))

import { RequestTypeBar } from '../RequestTypeBar'

const noop = vi.fn()

describe('RequestTypeBar', () => {
    it('renders the "Nueva solicitud" heading', () => {
        render(<RequestTypeBar onExtraDayClick={noop} onLeaveClick={noop} onVacationClick={noop} />)
        expect(screen.getByText('Nueva solicitud')).toBeDefined()
    })

    it('renders the Día extra button', () => {
        render(<RequestTypeBar onExtraDayClick={noop} onLeaveClick={noop} onVacationClick={noop} />)
        expect(screen.getByText('Día extra')).toBeDefined()
    })

    it('renders the Permiso button', () => {
        render(<RequestTypeBar onExtraDayClick={noop} onLeaveClick={noop} onVacationClick={noop} />)
        expect(screen.getByText('Permiso')).toBeDefined()
    })

    it('renders the Vacaciones button', () => {
        render(<RequestTypeBar onExtraDayClick={noop} onLeaveClick={noop} onVacationClick={noop} />)
        expect(screen.getByText('Vacaciones')).toBeDefined()
    })

    it('Día extra button is enabled', () => {
        render(<RequestTypeBar onExtraDayClick={noop} onLeaveClick={noop} onVacationClick={noop} />)
        const btn = screen.getByText('Día extra').closest('button')
        expect(btn?.disabled).toBe(false)
    })

    it('Permiso button is enabled and calls onLeaveClick', () => {
        const onLeaveClick = vi.fn()
        render(<RequestTypeBar onExtraDayClick={noop} onLeaveClick={onLeaveClick} onVacationClick={noop} />)
        const btn = screen.getByText('Permiso').closest('button')
        expect(btn?.disabled).toBe(false)
        btn?.click()
        expect(onLeaveClick).toHaveBeenCalledOnce()
    })

    it('Vacaciones button is enabled and calls onVacationClick', () => {
        const onVacationClick = vi.fn()
        render(<RequestTypeBar onExtraDayClick={noop} onLeaveClick={noop} onVacationClick={onVacationClick} />)
        const btn = screen.getByText('Vacaciones').closest('button')
        expect(btn?.disabled).toBe(false)
        btn?.click()
        expect(onVacationClick).toHaveBeenCalledOnce()
    })

    it('renders all 3 request type buttons', () => {
        render(<RequestTypeBar onExtraDayClick={noop} onLeaveClick={noop} onVacationClick={noop} />)
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBe(3)
    })
})
