/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card'

describe('Card Components', () => {
    afterEach(() => {
        cleanup()
    })

    describe('Card', () => {
        it('renders with default styles', () => {
            const { container } = render(<Card>Content</Card>)
            const card = container.firstChild as HTMLElement
            expect(card.className).toContain('rounded-lg')
            expect(card.className).toContain('border')
            expect(card.className).toContain('bg-card')
        })

        it('applies custom className', () => {
            const { container } = render(<Card className="custom-class">Content</Card>)
            const card = container.firstChild as HTMLElement
            expect(card.className).toContain('custom-class')
        })

        it('passes ref to div element', () => {
            const ref = { current: null as HTMLDivElement | null }
            render(<Card ref={ref}>Content</Card>)
            expect(ref.current).not.toBeNull()
            expect(ref.current?.tagName).toBe('DIV')
        })

        it('renders children', () => {
            const { getByText } = render(<Card>Card Content</Card>)
            expect(getByText('Card Content')).toBeDefined()
        })
    })

    describe('CardHeader', () => {
        it('renders with padding', () => {
            const { container } = render(<CardHeader>Header</CardHeader>)
            const header = container.firstChild as HTMLElement
            expect(header.className).toContain('p-6')
        })

        it('applies custom className', () => {
            const { container } = render(<CardHeader className="custom">Header</CardHeader>)
            expect((container.firstChild as HTMLElement).className).toContain('custom')
        })
    })

    describe('CardTitle', () => {
        it('renders as h3 element', () => {
            const { container } = render(<CardTitle>Title</CardTitle>)
            expect(container.querySelector('h3')).not.toBeNull()
        })

        it('renders with text styling', () => {
            const { container } = render(<CardTitle>Title</CardTitle>)
            const title = container.firstChild as HTMLElement
            expect(title.className).toContain('text-2xl')
            expect(title.className).toContain('font-semibold')
        })
    })

    describe('CardDescription', () => {
        it('renders as paragraph', () => {
            const { container } = render(<CardDescription>Desc</CardDescription>)
            expect(container.querySelector('p')).not.toBeNull()
        })

        it('renders with muted styling', () => {
            const { container } = render(<CardDescription>Desc</CardDescription>)
            const desc = container.firstChild as HTMLElement
            expect(desc.className).toContain('text-sm')
            expect(desc.className).toContain('text-muted-foreground')
        })
    })

    describe('CardContent', () => {
        it('renders with padding', () => {
            const { container } = render(<CardContent>Content</CardContent>)
            const content = container.firstChild as HTMLElement
            expect(content.className).toContain('p-6')
        })
    })

    describe('CardFooter', () => {
        it('renders with flex layout', () => {
            const { container } = render(<CardFooter>Footer</CardFooter>)
            const footer = container.firstChild as HTMLElement
            expect(footer.className).toContain('flex')
            expect(footer.className).toContain('p-6')
        })
    })
})
