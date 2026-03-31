/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '../dropdown-menu'

describe('DropdownMenu Components', () => {
    afterEach(() => {
        cleanup()
    })

    describe('DropdownMenu', () => {
        it('renders children', () => {
            const { getByText } = render(
                <DropdownMenu>
                    <span>Menu Content</span>
                </DropdownMenu>
            )
            expect(getByText('Menu Content')).toBeDefined()
        })

        it('has relative positioning', () => {
            const { container } = render(
                <DropdownMenu>
                    <span>Content</span>
                </DropdownMenu>
            )
            const wrapper = container.firstChild as HTMLElement
            expect(wrapper.className).toContain('relative')
            expect(wrapper.className).toContain('inline-block')
        })
    })

    describe('DropdownMenuTrigger', () => {
        it('renders as button', () => {
            const { container } = render(
                <DropdownMenuTrigger>Open</DropdownMenuTrigger>
            )
            const button = container.querySelector('button')
            expect(button).not.toBeNull()
        })

        it('handles click events', () => {
            const handleClick = vi.fn()
            const { getByText } = render(
                <DropdownMenuTrigger onClick={handleClick}>Open</DropdownMenuTrigger>
            )
            fireEvent.click(getByText('Open'))
            expect(handleClick).toHaveBeenCalled()
        })

        it('applies custom className', () => {
            const { container } = render(
                <DropdownMenuTrigger className="custom-trigger">Open</DropdownMenuTrigger>
            )
            const button = container.querySelector('button')
            expect(button?.className).toContain('custom-trigger')
        })
    })

    describe('DropdownMenuContent', () => {
        it('renders nothing when closed', () => {
            const { container } = render(
                <DropdownMenuContent open={false}>
                    <div>Item</div>
                </DropdownMenuContent>
            )
            expect(container.firstChild).toBeNull()
        })

        it('renders children when open', () => {
            const { getByText } = render(
                <DropdownMenuContent open={true}>
                    <div>Menu Item</div>
                </DropdownMenuContent>
            )
            expect(getByText('Menu Item')).toBeDefined()
        })

        it('aligns to right by default', () => {
            const { container } = render(
                <DropdownMenuContent open={true}>
                    <div>Item</div>
                </DropdownMenuContent>
            )
            const content = container.firstChild as HTMLElement
            expect(content.className).toContain('right-0')
        })

        it('aligns to left when specified', () => {
            const { container } = render(
                <DropdownMenuContent open={true} align="left">
                    <div>Item</div>
                </DropdownMenuContent>
            )
            const content = container.firstChild as HTMLElement
            expect(content.className).toContain('left-0')
        })
    })

    describe('DropdownMenuItem', () => {
        it('renders as button', () => {
            const { container } = render(
                <DropdownMenuItem>Item</DropdownMenuItem>
            )
            const button = container.querySelector('button')
            expect(button).not.toBeNull()
        })

        it('handles click events', () => {
            const handleClick = vi.fn()
            const { getByText } = render(
                <DropdownMenuItem onClick={handleClick}>Click Item</DropdownMenuItem>
            )
            fireEvent.click(getByText('Click Item'))
            expect(handleClick).toHaveBeenCalled()
        })

        it('renders icon when provided', () => {
            const { container } = render(
                <DropdownMenuItem icon={<svg data-testid="icon" />}>
                    With Icon
                </DropdownMenuItem>
            )
            const icon = container.querySelector('[data-testid="icon"]')
            expect(icon).not.toBeNull()
        })

        it('applies hover styles', () => {
            const { container } = render(
                <DropdownMenuItem>Hover Item</DropdownMenuItem>
            )
            const button = container.querySelector('button')
            expect(button?.className).toContain('hover:bg-accent')
        })

        it('applies custom className', () => {
            const { container } = render(
                <DropdownMenuItem className="custom-item">Item</DropdownMenuItem>
            )
            const button = container.querySelector('button')
            expect(button?.className).toContain('custom-item')
        })
    })

    describe('DropdownMenuSeparator', () => {
        it('renders separator line', () => {
            const { container } = render(<DropdownMenuSeparator />)
            const separator = container.firstChild as HTMLElement
            expect(separator.className).toContain('h-px')
            expect(separator.className).toContain('bg-border')
        })
    })
})
