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
        render(<RequestTypeBar onExtraDayClick={noop} />)
        expect(screen.getByText('Nueva solicitud')).toBeDefined()
    })

    it('renders the Día extra button', () => {
        render(<RequestTypeBar onExtraDayClick={noop} />)
        expect(screen.getByText('Día extra')).toBeDefined()
    })

    it('renders the Permiso button', () => {
        render(<RequestTypeBar onExtraDayClick={noop} />)
        expect(screen.getByText('Permiso')).toBeDefined()
    })

    it('renders the Vacaciones button', () => {
        render(<RequestTypeBar onExtraDayClick={noop} />)
        expect(screen.getByText('Vacaciones')).toBeDefined()
    })

    it('Día extra button is enabled', () => {
        render(<RequestTypeBar onExtraDayClick={noop} />)
        const btn = screen.getByText('Día extra').closest('button')
        expect(btn?.disabled).toBe(false)
    })

    it('Permiso button is disabled', () => {
        render(<RequestTypeBar onExtraDayClick={noop} />)
        const wrapper = screen.getByText('Permiso').closest('button')
        expect(wrapper?.disabled).toBe(true)
    })

    it('Vacaciones button is disabled', () => {
        render(<RequestTypeBar onExtraDayClick={noop} />)
        const wrapper = screen.getByText('Vacaciones').closest('button')
        expect(wrapper?.disabled).toBe(true)
    })

    it('Permiso wrapper has Próximamente title', () => {
        render(<RequestTypeBar onExtraDayClick={noop} />)
        const span = screen.getByText('Permiso').closest('span[title]')
        expect(span?.getAttribute('title')).toBe('Próximamente')
    })

    it('Vacaciones wrapper has Próximamente title', () => {
        render(<RequestTypeBar onExtraDayClick={noop} />)
        const span = screen.getByText('Vacaciones').closest('span[title]')
        expect(span?.getAttribute('title')).toBe('Próximamente')
    })

    it('renders all 3 request type buttons', () => {
        render(<RequestTypeBar onExtraDayClick={noop} />)
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBe(3)
    })
})
