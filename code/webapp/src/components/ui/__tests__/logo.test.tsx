/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { Logo, LogoIcon } from '../logo'

afterEach(() => {
    cleanup()
})

describe('Logo', () => {
    describe('default (expanded) state', () => {
        it('renders an image with alt text', () => {
            const { getByAltText } = render(<Logo />)
            expect(getByAltText('SushiGo Logo')).toBeDefined()
        })

        it('applies custom className', () => {
            const { container } = render(<Logo className="custom-class" />)
            const wrapper = container.firstChild as HTMLElement
            expect(wrapper.className).toContain('custom-class')
        })

        it('renders with default expanded styling', () => {
            const { container } = render(<Logo />)
            const wrapper = container.firstChild as HTMLElement
            expect(wrapper.className).toContain('flex')
            expect(wrapper.className).toContain('items-center')
        })
    })

    describe('collapsed state', () => {
        it('renders an image when collapsed', () => {
            const { getByAltText } = render(<Logo collapsed />)
            expect(getByAltText('SushiGo Logo')).toBeDefined()
        })

        it('has different styling when collapsed', () => {
            const { container } = render(<Logo collapsed />)
            const wrapper = container.firstChild as HTMLElement
            expect(wrapper.className).toContain('h-20')
        })

        it('applies custom className when collapsed', () => {
            const { container } = render(<Logo collapsed className="custom-collapsed" />)
            const wrapper = container.firstChild as HTMLElement
            expect(wrapper.className).toContain('custom-collapsed')
        })
    })
})

describe('LogoIcon', () => {
    it('renders with default styling', () => {
        const { container } = render(<LogoIcon />)
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper.className).toContain('w-10')
        expect(wrapper.className).toContain('h-10')
    })

    it('applies custom className', () => {
        const { container } = render(<LogoIcon className="custom-icon" />)
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper.className).toContain('custom-icon')
    })

    it('has rounded-full styling', () => {
        const { container } = render(<LogoIcon />)
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper.className).toContain('rounded-full')
    })

    it('has shadow styling', () => {
        const { container } = render(<LogoIcon />)
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper.className).toContain('shadow-md')
    })
})
