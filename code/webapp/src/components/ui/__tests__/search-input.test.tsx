/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { SearchInput } from '../search-input'

describe('SearchInput', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        cleanup()
        vi.useRealTimers()
    })

    it('renders with initial value', () => {
        const onChange = vi.fn()
        const { container } = render(
            <SearchInput value="initial" onChange={onChange} />
        )
        const input = container.querySelector('input') as HTMLInputElement
        expect(input.value).toBe('initial')
    })

    it('updates local value on user input', () => {
        const onChange = vi.fn()
        const { container } = render(
            <SearchInput value="" onChange={onChange} />
        )
        const input = container.querySelector('input') as HTMLInputElement
        fireEvent.change(input, { target: { value: 'test' } })
        expect(input.value).toBe('test')
    })

    it('calls onChange after debounce', async () => {
        const onChange = vi.fn()
        const { container } = render(
            <SearchInput value="" onChange={onChange} debounceMs={300} />
        )
        const input = container.querySelector('input') as HTMLInputElement

        fireEvent.change(input, { target: { value: 'search' } })
        expect(onChange).not.toHaveBeenCalled()

        vi.advanceTimersByTime(300)
        expect(onChange).toHaveBeenCalledWith('search')
    })

    it('shows clear button when there is text', () => {
        const onChange = vi.fn()
        const { container } = render(
            <SearchInput value="text" onChange={onChange} />
        )
        const clearButton = container.querySelector('button[aria-label="Clear search"]')
        expect(clearButton).toBeDefined()
        expect(clearButton).not.toBeNull()
    })

    it('hides clear button when input is empty', () => {
        const onChange = vi.fn()
        const { container } = render(
            <SearchInput value="" onChange={onChange} />
        )
        const clearButton = container.querySelector('button[aria-label="Clear search"]')
        expect(clearButton).toBeNull()
    })

    it('clears input and calls onChange when clear button clicked', () => {
        const onChange = vi.fn()
        const { container } = render(
            <SearchInput value="text" onChange={onChange} />
        )
        const clearButton = container.querySelector('button[aria-label="Clear search"]') as HTMLButtonElement
        fireEvent.click(clearButton)

        const input = container.querySelector('input') as HTMLInputElement
        expect(input.value).toBe('')
        expect(onChange).toHaveBeenCalledWith('')
    })

    it('uses custom placeholder', () => {
        const onChange = vi.fn()
        const { container } = render(
            <SearchInput value="" onChange={onChange} placeholder="Buscar..." />
        )
        const input = container.querySelector('input') as HTMLInputElement
        expect(input.placeholder).toBe('Buscar...')
    })

    it('syncs with external value changes', () => {
        const onChange = vi.fn()
        const { container, rerender } = render(
            <SearchInput value="initial" onChange={onChange} />
        )
        const input = container.querySelector('input') as HTMLInputElement
        expect(input.value).toBe('initial')

        rerender(<SearchInput value="updated" onChange={onChange} />)
        expect(input.value).toBe('updated')
    })

    it('does not call onChange on initial mount', () => {
        const onChange = vi.fn()
        render(<SearchInput value="test" onChange={onChange} debounceMs={100} />)

        vi.advanceTimersByTime(100)
        expect(onChange).not.toHaveBeenCalled()
    })
})
