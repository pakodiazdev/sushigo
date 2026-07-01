// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { Tabs, TabPanel } from '../tabs'

afterEach(() => {
    cleanup()
})

const TABS = [
    { id: 'a', label: 'Tab A' },
    { id: 'b', label: 'Tab B' },
]

describe('Tabs', () => {
    it('renders a button for each tab', () => {
        render(<Tabs tabs={TABS} activeTab="a" onTabChange={vi.fn()} />)

        expect(screen.getByText('Tab A')).toBeDefined()
        expect(screen.getByText('Tab B')).toBeDefined()
    })

    it('marks the active tab with aria-current', () => {
        render(<Tabs tabs={TABS} activeTab="b" onTabChange={vi.fn()} />)

        expect(screen.getByText('Tab A').getAttribute('aria-current')).toBeNull()
        expect(screen.getByText('Tab B').getAttribute('aria-current')).toBe('page')
    })

    it('calls onTabChange with the clicked tab id', () => {
        const onTabChange = vi.fn()
        render(<Tabs tabs={TABS} activeTab="a" onTabChange={onTabChange} />)

        fireEvent.click(screen.getByText('Tab B'))

        expect(onTabChange).toHaveBeenCalledWith('b')
    })
})

describe('TabPanel', () => {
    it('renders children when id matches activeTab', () => {
        render(
            <TabPanel id="a" activeTab="a">
                <p>Panel content</p>
            </TabPanel>,
        )

        expect(screen.getByText('Panel content')).toBeDefined()
    })

    it('renders nothing when id does not match activeTab', () => {
        const { container } = render(
            <TabPanel id="a" activeTab="b">
                <p>Panel content</p>
            </TabPanel>,
        )

        expect(container.firstChild).toBeNull()
    })
})
