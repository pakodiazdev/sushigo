/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { PageHeader } from '../page-header'

describe('PageHeader', () => {
    afterEach(() => {
        cleanup()
    })

    it('renders title', () => {
        const { getByText } = render(
            <PageHeader title="Test Title" description="Test description" />
        )
        expect(getByText('Test Title')).toBeDefined()
    })

    it('renders description', () => {
        const { getByText } = render(
            <PageHeader title="Title" description="Test Description" />
        )
        expect(getByText('Test Description')).toBeDefined()
    })

    it('renders title as h1 element', () => {
        const { container } = render(
            <PageHeader title="H1 Title" description="Description" />
        )
        const h1 = container.querySelector('h1')
        expect(h1).not.toBeNull()
        expect(h1?.textContent).toBe('H1 Title')
    })

    it('renders action when provided', () => {
        const { getByText } = render(
            <PageHeader
                title="Title"
                description="Description"
                action={<button>Action Button</button>}
            />
        )
        expect(getByText('Action Button')).toBeDefined()
    })

    it('renders children when provided', () => {
        const { getByText } = render(
            <PageHeader title="Title" description="Description">
                <span>Child Content</span>
            </PageHeader>
        )
        expect(getByText('Child Content')).toBeDefined()
    })

    it('renders action over children when both provided', () => {
        const { getByText, queryByText } = render(
            <PageHeader
                title="Title"
                description="Description"
                action={<button>Action</button>}
            >
                <span>Child</span>
            </PageHeader>
        )
        // Action takes precedence via || operator
        expect(getByText('Action')).toBeDefined()
        // Children still render since both are passed via action || children
        expect(queryByText('Child')).toBeNull()
    })

    it('has styled container', () => {
        const { container } = render(
            <PageHeader title="Title" description="Description" />
        )
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper.className).toContain('rounded-xl')
        expect(wrapper.className).toContain('bg-gradient-to-r')
    })

    it('renders title with correct styling', () => {
        const { container } = render(
            <PageHeader title="Styled Title" description="Description" />
        )
        const h1 = container.querySelector('h1')
        expect(h1?.className).toContain('text-3xl')
        expect(h1?.className).toContain('font-bold')
    })
})
