/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Label } from '../label'

describe('Label', () => {
    afterEach(() => {
        cleanup()
    })

    it('renders with default contrast-safe styles', () => {
        render(<Label>Método</Label>)
        const label = screen.getByText('Método')
        expect(label.className).toContain('text-sm')
        expect(label.className).toContain('font-medium')
        expect(label.className).toContain('text-foreground')
    })

    it('renders as a label element', () => {
        render(<Label>Tarifa por hora</Label>)
        const label = screen.getByText('Tarifa por hora')
        expect(label.tagName).toBe('LABEL')
    })

    it('associates with a form control via htmlFor', () => {
        render(<Label htmlFor="agreed_rate">Tarifa por hora</Label>)
        const label = screen.getByText('Tarifa por hora')
        expect(label.getAttribute('for')).toBe('agreed_rate')
    })

    it('applies custom className without dropping base styles', () => {
        render(<Label className="custom-label">Factor</Label>)
        const label = screen.getByText('Factor')
        expect(label.className).toContain('custom-label')
        expect(label.className).toContain('text-foreground')
    })

    it('passes ref to the label element', () => {
        const ref = { current: null as HTMLLabelElement | null }
        render(<Label ref={ref}>Método</Label>)
        expect(ref.current).not.toBeNull()
        expect(ref.current?.tagName).toBe('LABEL')
    })

    it('passes through additional native attributes', () => {
        render(<Label data-testid="method-label">Método</Label>)
        expect(screen.getByTestId('method-label')).not.toBeNull()
    })

    it('applies peer-disabled styling hook for disabled sibling controls', () => {
        render(<Label>Método</Label>)
        const label = screen.getByText('Método')
        expect(label.className).toContain('peer-disabled:cursor-not-allowed')
        expect(label.className).toContain('peer-disabled:opacity-70')
    })
})
