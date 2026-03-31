/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { Button } from '../button'

describe('Button', () => {
    afterEach(() => {
        cleanup()
    })

    describe('variants', () => {
        it('renders default variant', () => {
            const { container } = render(<Button>Default</Button>)
            const button = container.firstChild as HTMLElement
            expect(button.className).toContain('bg-primary')
        })

        it('renders destructive variant', () => {
            const { container } = render(<Button variant="destructive">Delete</Button>)
            const button = container.firstChild as HTMLElement
            expect(button.className).toContain('bg-destructive')
        })

        it('renders outline variant', () => {
            const { container } = render(<Button variant="outline">Outline</Button>)
            const button = container.firstChild as HTMLElement
            expect(button.className).toContain('border')
            expect(button.className).toContain('bg-background')
        })

        it('renders secondary variant', () => {
            const { container } = render(<Button variant="secondary">Secondary</Button>)
            const button = container.firstChild as HTMLElement
            expect(button.className).toContain('bg-secondary')
        })

        it('renders ghost variant', () => {
            const { container } = render(<Button variant="ghost">Ghost</Button>)
            const button = container.firstChild as HTMLElement
            expect(button.className).toContain('hover:bg-accent')
        })

        it('renders link variant', () => {
            const { container } = render(<Button variant="link">Link</Button>)
            const button = container.firstChild as HTMLElement
            expect(button.className).toContain('text-primary')
            expect(button.className).toContain('underline-offset-4')
        })
    })

    describe('sizes', () => {
        it('renders default size', () => {
            const { container } = render(<Button>Default Size</Button>)
            const button = container.firstChild as HTMLElement
            expect(button.className).toContain('h-10')
            expect(button.className).toContain('px-4')
        })

        it('renders small size', () => {
            const { container } = render(<Button size="sm">Small</Button>)
            const button = container.firstChild as HTMLElement
            expect(button.className).toContain('h-9')
            expect(button.className).toContain('px-3')
        })

        it('renders large size', () => {
            const { container } = render(<Button size="lg">Large</Button>)
            const button = container.firstChild as HTMLElement
            expect(button.className).toContain('h-11')
            expect(button.className).toContain('px-8')
        })

        it('renders icon size', () => {
            const { container } = render(<Button size="icon">Icon</Button>)
            const button = container.firstChild as HTMLElement
            expect(button.className).toContain('h-10')
            expect(button.className).toContain('w-10')
        })
    })

    describe('functionality', () => {
        it('handles click events', () => {
            const handleClick = vi.fn()
            const { getByText } = render(<Button onClick={handleClick}>Click Me</Button>)
            
            fireEvent.click(getByText('Click Me'))
            expect(handleClick).toHaveBeenCalledTimes(1)
        })

        it('renders as disabled', () => {
            const { container } = render(<Button disabled>Disabled</Button>)
            const button = container.firstChild as HTMLButtonElement
            expect(button.disabled).toBe(true)
            expect(button.className).toContain('disabled:opacity-50')
        })

        it('applies custom className', () => {
            const { container } = render(<Button className="custom-btn">Custom</Button>)
            const button = container.firstChild as HTMLElement
            expect(button.className).toContain('custom-btn')
        })

        it('passes ref to button element', () => {
            const ref = { current: null as HTMLButtonElement | null }
            render(<Button ref={ref}>Ref</Button>)
            expect(ref.current).not.toBeNull()
            expect(ref.current?.tagName).toBe('BUTTON')
        })

        it('supports type attribute', () => {
            const { container } = render(<Button type="submit">Submit</Button>)
            const button = container.firstChild as HTMLButtonElement
            expect(button.type).toBe('submit')
        })
    })
})
