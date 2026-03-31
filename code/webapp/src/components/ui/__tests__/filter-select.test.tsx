/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { FilterSelect } from '../filter-select'

describe('FilterSelect', () => {
    const mockOptions = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' },
    ]

    afterEach(() => {
        cleanup()
    })

    it('renders with label', () => {
        const { getByText } = render(
            <FilterSelect
                label="Filter By"
                value=""
                onChange={() => { }}
                options={mockOptions}
            />
        )
        expect(getByText('Filter By:')).toBeDefined()
    })

    it('renders all options', () => {
        const { getByText } = render(
            <FilterSelect
                label="Filter"
                value=""
                onChange={() => { }}
                options={mockOptions}
            />
        )
        expect(getByText('Option 1')).toBeDefined()
        expect(getByText('Option 2')).toBeDefined()
        expect(getByText('Option 3')).toBeDefined()
    })

    it('renders default placeholder', () => {
        const { getByText } = render(
            <FilterSelect
                label="Filter Placeholder"
                value=""
                onChange={() => { }}
                options={mockOptions}
            />
        )
        expect(getByText('All')).toBeDefined()
    })

    it('renders custom placeholder', () => {
        const { getByText } = render(
            <FilterSelect
                label="Filter Custom"
                value=""
                onChange={() => { }}
                options={mockOptions}
                placeholder="Select one"
            />
        )
        expect(getByText('Select one')).toBeDefined()
    })

    it('calls onChange when selection changes', () => {
        const handleChange = vi.fn()
        const { getByRole } = render(
            <FilterSelect
                label="Filter Change"
                value=""
                onChange={handleChange}
                options={mockOptions}
            />
        )

        const select = getByRole('combobox')
        fireEvent.change(select, { target: { value: 'option1' } })

        expect(handleChange).toHaveBeenCalledWith('option1')
    })

    it('shows selected value', () => {
        const { getByRole } = render(
            <FilterSelect
                label="Filter Selected"
                value="option2"
                onChange={() => { }}
                options={mockOptions}
            />
        )

        const select = getByRole('combobox') as HTMLSelectElement
        expect(select.value).toBe('option2')
    })

    it('renders filter icon by default', () => {
        const { container } = render(
            <FilterSelect
                label="Filter Icon"
                value=""
                onChange={() => { }}
                options={mockOptions}
            />
        )
        const svg = container.querySelector('svg')
        expect(svg).toBeDefined()
    })

    it('hides filter icon when showIcon is false', () => {
        const { container } = render(
            <FilterSelect
                label="Filter No Icon"
                value=""
                onChange={() => { }}
                options={mockOptions}
                showIcon={false}
            />
        )
        // Only the select dropdown arrow should be present, not the filter icon
        const svgs = container.querySelectorAll('svg')
        expect(svgs.length).toBe(0)
    })

    it('applies custom className', () => {
        const { container } = render(
            <FilterSelect
                label="Filter Class"
                value=""
                onChange={() => { }}
                options={mockOptions}
                className="custom-filter-class"
            />
        )
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper.className).toContain('custom-filter-class')
    })
})
