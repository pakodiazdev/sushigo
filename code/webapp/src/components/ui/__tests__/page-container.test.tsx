/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { PageContainer } from '../page-container'

describe('PageContainer', () => {
    afterEach(() => {
        cleanup()
    })

    it('renders children', () => {
        const { getByText } = render(
            <PageContainer>
                <div>Page Content</div>
            </PageContainer>
        )
        expect(getByText('Page Content')).toBeDefined()
    })

    it('applies padding', () => {
        const { container } = render(
            <PageContainer>
                <div>Content</div>
            </PageContainer>
        )
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper.className).toContain('p-6')
    })

    it('applies max width', () => {
        const { container } = render(
            <PageContainer>
                <div>Content</div>
            </PageContainer>
        )
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper.className).toContain('max-w-7xl')
    })

    it('applies horizontal centering', () => {
        const { container } = render(
            <PageContainer>
                <div>Content</div>
            </PageContainer>
        )
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper.className).toContain('mx-auto')
    })

    it('applies spacing between children', () => {
        const { container } = render(
            <PageContainer>
                <div>First</div>
                <div>Second</div>
            </PageContainer>
        )
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper.className).toContain('space-y-6')
    })

    it('renders multiple children', () => {
        const { getByText } = render(
            <PageContainer>
                <div>First Child</div>
                <div>Second Child</div>
                <div>Third Child</div>
            </PageContainer>
        )
        expect(getByText('First Child')).toBeDefined()
        expect(getByText('Second Child')).toBeDefined()
        expect(getByText('Third Child')).toBeDefined()
    })

    it('renders as a div element', () => {
        const { container } = render(
            <PageContainer>
                <div>Content</div>
            </PageContainer>
        )
        expect(container.firstChild?.nodeName).toBe('DIV')
    })
})
