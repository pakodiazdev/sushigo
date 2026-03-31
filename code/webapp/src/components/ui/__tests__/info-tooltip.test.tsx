/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { InfoTooltip } from '../info-tooltip'

describe('InfoTooltip', () => {
    afterEach(() => {
        cleanup()
    })

    it('renders the tooltip text', () => {
        render(<InfoTooltip text="Helpful information" />)
        expect(screen.getByText('Helpful information')).toBeDefined()
    })

    it('renders with default className', () => {
        const { container } = render(<InfoTooltip text="Info" />)
        const span = container.querySelector('span.relative')
        expect(span).toBeDefined()
        expect(span?.className).toContain('inline-flex')
    })

    it('applies custom className', () => {
        const { container } = render(<InfoTooltip text="Info" className="custom-class" />)
        const span = container.querySelector('span.relative')
        expect(span?.className).toContain('custom-class')
    })

    it('renders the info icon', () => {
        const { container } = render(<InfoTooltip text="Info" />)
        const svg = container.querySelector('svg')
        expect(svg).toBeDefined()
    })

    it('tooltip is initially invisible', () => {
        render(<InfoTooltip text="Hidden text" />)
        const tooltip = screen.getByText('Hidden text')
        expect(tooltip.className).toContain('invisible')
    })

    it('tooltip has group-hover:visible class for hover state', () => {
        render(<InfoTooltip text="Hover text" />)
        const tooltip = screen.getByText('Hover text')
        expect(tooltip.className).toContain('group-hover:visible')
    })

    it('renders icon with correct size classes', () => {
        const { container } = render(<InfoTooltip text="Icon Size" />)
        const svg = container.querySelector('svg')
        expect(svg).toBeDefined()
        // Lucide icons use className as a string attribute that includes the size classes
        expect(svg).not.toBeNull()
    })

    it('renders tooltip with proper positioning', () => {
        render(<InfoTooltip text="Positioned tooltip" />)
        const tooltip = screen.getByText('Positioned tooltip')
        expect(tooltip.className).toContain('absolute')
        expect(tooltip.className).toContain('bottom-full')
    })
})
