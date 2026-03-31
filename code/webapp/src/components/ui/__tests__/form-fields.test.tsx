/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { FormField, Select, Textarea } from '../form-fields'

describe('FormField Components', () => {
    afterEach(() => {
        cleanup()
    })

    describe('FormField', () => {
        it('renders children', () => {
            const { getByPlaceholderText } = render(
                <FormField>
                    <input placeholder="Test Input" />
                </FormField>
            )
            expect(getByPlaceholderText('Test Input')).toBeDefined()
        })

        it('renders label when provided', () => {
            const { getByText } = render(
                <FormField label="Username">
                    <input />
                </FormField>
            )
            expect(getByText('Username')).toBeDefined()
        })

        it('renders required indicator when required', () => {
            const { getByText } = render(
                <FormField label="Email" required>
                    <input />
                </FormField>
            )
            expect(getByText('*')).toBeDefined()
        })

        it('renders hint when provided and no error', () => {
            const { getByText } = render(
                <FormField hint="This is a hint">
                    <input />
                </FormField>
            )
            expect(getByText('This is a hint')).toBeDefined()
        })

        it('renders error message when provided', () => {
            const { getByText } = render(
                <FormField error="This field is required">
                    <input />
                </FormField>
            )
            expect(getByText('This field is required')).toBeDefined()
        })

        it('hides hint when error is present', () => {
            const { queryByText, getByText } = render(
                <FormField hint="Hint text" error="Error text">
                    <input />
                </FormField>
            )
            expect(getByText('Error text')).toBeDefined()
            expect(queryByText('Hint text')).toBeNull()
        })

        it('applies custom className', () => {
            const { container } = render(
                <FormField className="custom-field">
                    <input />
                </FormField>
            )
            const wrapper = container.firstChild as HTMLElement
            expect(wrapper.className).toContain('custom-field')
        })
    })

    describe('Select', () => {
        it('renders as select element', () => {
            const { container } = render(
                <Select>
                    <option value="1">Option 1</option>
                </Select>
            )
            expect(container.querySelector('select')).not.toBeNull()
        })

        it('renders options', () => {
            const { getByText } = render(
                <Select>
                    <option value="1">First Option</option>
                    <option value="2">Second Option</option>
                </Select>
            )
            expect(getByText('First Option')).toBeDefined()
            expect(getByText('Second Option')).toBeDefined()
        })

        it('handles change events', () => {
            const handleChange = vi.fn()
            const { container } = render(
                <Select onChange={handleChange}>
                    <option value="1">Option 1</option>
                    <option value="2">Option 2</option>
                </Select>
            )
            const select = container.querySelector('select')!
            fireEvent.change(select, { target: { value: '2' } })
            expect(handleChange).toHaveBeenCalled()
        })

        it('applies error styling when error prop is true', () => {
            const { container } = render(
                <Select error>
                    <option>Option</option>
                </Select>
            )
            const select = container.querySelector('select')
            expect(select?.className).toContain('border-red-300')
        })

        it('applies custom className', () => {
            const { container } = render(
                <Select className="custom-select">
                    <option>Option</option>
                </Select>
            )
            const select = container.querySelector('select')
            expect(select?.className).toContain('custom-select')
        })

        it('supports disabled state', () => {
            const { container } = render(
                <Select disabled>
                    <option>Option</option>
                </Select>
            )
            const select = container.querySelector('select')
            expect(select?.disabled).toBe(true)
        })

        it('passes ref to select element', () => {
            const ref = { current: null as HTMLSelectElement | null }
            render(
                <Select ref={ref}>
                    <option>Option</option>
                </Select>
            )
            expect(ref.current).not.toBeNull()
            expect(ref.current?.tagName).toBe('SELECT')
        })
    })

    describe('Textarea', () => {
        it('renders as textarea element', () => {
            const { container } = render(<Textarea />)
            expect(container.querySelector('textarea')).not.toBeNull()
        })

        it('handles value change', () => {
            const handleChange = vi.fn()
            const { container } = render(<Textarea onChange={handleChange} />)
            const textarea = container.querySelector('textarea')!
            fireEvent.change(textarea, { target: { value: 'test' } })
            expect(handleChange).toHaveBeenCalled()
        })

        it('applies error styling when error prop is true', () => {
            const { container } = render(<Textarea error />)
            const textarea = container.querySelector('textarea')
            expect(textarea?.className).toContain('border-red-300')
        })

        it('applies custom className', () => {
            const { container } = render(<Textarea className="custom-textarea" />)
            const textarea = container.querySelector('textarea')
            expect(textarea?.className).toContain('custom-textarea')
        })

        it('supports placeholder', () => {
            const { container } = render(<Textarea placeholder="Enter text" />)
            const textarea = container.querySelector('textarea')
            expect(textarea?.placeholder).toBe('Enter text')
        })

        it('supports disabled state', () => {
            const { container } = render(<Textarea disabled />)
            const textarea = container.querySelector('textarea')
            expect(textarea?.disabled).toBe(true)
        })

        it('passes ref to textarea element', () => {
            const ref = { current: null as HTMLTextAreaElement | null }
            render(<Textarea ref={ref} />)
            expect(ref.current).not.toBeNull()
            expect(ref.current?.tagName).toBe('TEXTAREA')
        })
    })
})
