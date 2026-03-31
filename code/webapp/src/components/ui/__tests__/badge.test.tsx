/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Badge } from '../badge'

describe('Badge', () => {
    afterEach(() => {
        cleanup()
    })

    it('renders with default variant', () => {
        render(<Badge>Default</Badge>)
        const badge = screen.getByText('Default')
        expect(badge).toBeDefined()
        expect(badge.className).toContain('bg-gray-100')
    })

    it('renders with success variant', () => {
        render(<Badge variant="success">Success</Badge>)
        const badge = screen.getByText('Success')
        expect(badge).toBeDefined()
        expect(badge.className).toContain('bg-green-100')
    })

    it('renders with error variant', () => {
        render(<Badge variant="error">Error</Badge>)
        const badge = screen.getByText('Error')
        expect(badge).toBeDefined()
        expect(badge.className).toContain('bg-red-100')
    })

    it('renders with warning variant', () => {
        render(<Badge variant="warning">Warning</Badge>)
        const badge = screen.getByText('Warning')
        expect(badge).toBeDefined()
        expect(badge.className).toContain('bg-yellow-100')
    })

    it('renders with info variant', () => {
        render(<Badge variant="info">Info</Badge>)
        const badge = screen.getByText('Info')
        expect(badge).toBeDefined()
        expect(badge.className).toContain('bg-blue-100')
    })

    it('applies custom className', () => {
        render(<Badge className="custom-class">Custom</Badge>)
        const badge = screen.getByText('Custom')
        expect(badge.className).toContain('custom-class')
    })

    it('passes through additional props', () => {
        render(<Badge data-testid="test-badge">Props</Badge>)
        const badge = screen.getByTestId('test-badge')
        expect(badge).toBeDefined()
        expect(badge.textContent).toBe('Props')
    })

    it('renders as a span element', () => {
        render(<Badge>Span</Badge>)
        const badge = screen.getByText('Span')
        expect(badge.tagName).toBe('SPAN')
    })

    it('includes base styling classes', () => {
        render(<Badge>Styled</Badge>)
        const badge = screen.getByText('Styled')
        expect(badge.className).toContain('inline-flex')
        expect(badge.className).toContain('rounded-full')
        expect(badge.className).toContain('text-xs')
        expect(badge.className).toContain('font-medium')
    })
})
