/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { ToggleSwitch } from '../toggle-switch'

describe('ToggleSwitch', () => {
    afterEach(() => {
        cleanup()
    })

    it('renders with label', () => {
        const { getByText } = render(<ToggleSwitch label="Test Label" checked={false} onChange={() => { }} />)
        expect(getByText('Test Label')).toBeDefined()
    })

    it('renders unchecked state', () => {
        const { getByRole } = render(<ToggleSwitch label="Unchecked" checked={false} onChange={() => { }} />)
        const button = getByRole('switch')
        expect(button.getAttribute('aria-checked')).toBe('false')
        expect(button.className).toContain('bg-gray-200')
    })

    it('renders checked state', () => {
        const { getByRole } = render(<ToggleSwitch label="Checked" checked={true} onChange={() => { }} />)
        const button = getByRole('switch')
        expect(button.getAttribute('aria-checked')).toBe('true')
        expect(button.className).toContain('bg-blue-600')
    })

    it('calls onChange when clicked', () => {
        const handleChange = vi.fn()
        const { getByRole } = render(<ToggleSwitch label="Clickable" checked={false} onChange={handleChange} />)

        const button = getByRole('switch')
        fireEvent.click(button)

        expect(handleChange).toHaveBeenCalledWith(true)
    })

    it('calls onChange with false when unchecking', () => {
        const handleChange = vi.fn()
        const { getByRole } = render(<ToggleSwitch label="Uncheck" checked={true} onChange={handleChange} />)

        const button = getByRole('switch')
        fireEvent.click(button)

        expect(handleChange).toHaveBeenCalledWith(false)
    })

    it('does not call onChange when disabled', () => {
        const handleChange = vi.fn()
        const { getByRole } = render(<ToggleSwitch label="Disabled Click" checked={false} onChange={handleChange} disabled />)

        const button = getByRole('switch')
        fireEvent.click(button)

        expect(handleChange).not.toHaveBeenCalled()
    })

    it('applies disabled styling', () => {
        const { getByText } = render(<ToggleSwitch label="Disabled Style" checked={false} onChange={() => { }} disabled />)

        const label = getByText('Disabled Style').closest('label')
        expect(label?.className).toContain('opacity-50')
        expect(label?.className).toContain('cursor-not-allowed')
    })

    it('renders button as disabled when disabled prop is true', () => {
        const { getByRole } = render(<ToggleSwitch label="Disabled Prop" checked={false} onChange={() => { }} disabled />)

        const button = getByRole('switch')
        expect(button).toHaveProperty('disabled', true)
    })

    it('renders with accessible aria-labelledby', () => {
        const { getByRole } = render(<ToggleSwitch label="Accessible Label" checked={false} onChange={() => { }} />)

        const button = getByRole('switch')
        const labelId = button.getAttribute('aria-labelledby')
        expect(labelId).toBeDefined()
        expect(labelId).toContain('label')
    })

    it('renders as button type="button"', () => {
        const { getByRole } = render(<ToggleSwitch label="Button Type" checked={false} onChange={() => { }} />)

        const button = getByRole('switch')
        expect(button.getAttribute('type')).toBe('button')
    })
})
