/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { LabeledBadge } from '../labeled-badge'

describe('LabeledBadge', () => {
    afterEach(() => {
        cleanup()
    })

    it('renders the label and the value', () => {
        render(<LabeledBadge label="Semana actual">20 jul – 26 jul 2026</LabeledBadge>)
        expect(screen.getByText('Semana actual')).toBeDefined()
        expect(screen.getByText('20 jul – 26 jul 2026')).toBeDefined()
    })

    it('renders the value as a span with a contrast-boosted, dark-mode-aware default variant', () => {
        render(<LabeledBadge label="Semana actual">Valor</LabeledBadge>)
        const value = screen.getByText('Valor')
        expect(value.tagName).toBe('SPAN')
        // Bumped from Badge's own bg-gray-100 — too low-contrast against a light-theme page background.
        expect(value.className).toContain('bg-gray-200')
        expect(value.className).toContain('border-gray-300')
        expect(value.className).toContain('dark:bg-gray-800')
        expect(value.className).toContain('dark:border-gray-700')
    })

    it('applies the requested color variant without the default-variant contrast override', () => {
        render(
            <LabeledBadge label="Estado" variant="success">
                Cerrado
            </LabeledBadge>,
        )
        const value = screen.getByText('Cerrado')
        expect(value.className).toContain('bg-green-100')
        expect(value.className).toContain('dark:bg-green-900')
        expect(value.className).not.toContain('bg-gray-200')
    })

    it('passes data-testid through to the value badge', () => {
        render(
            <LabeledBadge label="Semana actual" data-testid="current-week-label">
                20 jul – 26 jul 2026
            </LabeledBadge>,
        )
        expect(screen.getByTestId('current-week-label').textContent).toBe('20 jul – 26 jul 2026')
    })

    it('merges badgeClassName over the default field-style shape', () => {
        render(
            <LabeledBadge label="Semana actual" badgeClassName="rounded-full">
                Valor
            </LabeledBadge>,
        )
        const value = screen.getByText('Valor')
        expect(value.className).toContain('rounded-full')
        expect(value.className).not.toContain('rounded-md')
    })

    it('applies className to the outer wrapper', () => {
        const { container } = render(
            <LabeledBadge label="Semana actual" className="mb-6">
                Valor
            </LabeledBadge>,
        )
        expect(container.firstElementChild?.className).toContain('mb-6')
    })
})
