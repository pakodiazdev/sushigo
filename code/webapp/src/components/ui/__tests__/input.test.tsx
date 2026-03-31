/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { Input } from '../input'

describe('Input', () => {
    afterEach(() => {
        cleanup()
    })

    it('renders with default styles', () => {
        const { container } = render(<Input />)
        const input = container.querySelector('input')
        expect(input).not.toBeNull()
        expect(input?.className).toContain('rounded-md')
        expect(input?.className).toContain('border')
    })

    it('renders with specified type', () => {
        const { container } = render(<Input type="email" />)
        const input = container.querySelector('input')
        expect(input?.type).toBe('email')
    })

    it('renders with text type by default', () => {
        const { container } = render(<Input />)
        const input = container.querySelector('input')
        expect(input?.type).toBe('text')
    })

    it('renders password type', () => {
        const { container } = render(<Input type="password" />)
        const input = container.querySelector('input')
        expect(input?.type).toBe('password')
    })

    it('handles value change', () => {
        const handleChange = vi.fn()
        const { container } = render(<Input onChange={handleChange} />)
        const input = container.querySelector('input')!
        
        fireEvent.change(input, { target: { value: 'test' } })
        expect(handleChange).toHaveBeenCalled()
    })

    it('applies error styling when error prop is true', () => {
        const { container } = render(<Input error />)
        const input = container.querySelector('input')
        expect(input?.className).toContain('border-red-300')
    })

    it('does not apply error styling when error prop is false', () => {
        const { container } = render(<Input error={false} />)
        const input = container.querySelector('input')
        expect(input?.className).not.toContain('border-red-300')
    })

    it('applies custom className', () => {
        const { container } = render(<Input className="custom-input" />)
        const input = container.querySelector('input')
        expect(input?.className).toContain('custom-input')
    })

    it('renders with placeholder', () => {
        const { container } = render(<Input placeholder="Enter text" />)
        const input = container.querySelector('input')
        expect(input?.placeholder).toBe('Enter text')
    })

    it('renders as disabled', () => {
        const { container } = render(<Input disabled />)
        const input = container.querySelector('input')
        expect(input?.disabled).toBe(true)
        expect(input?.className).toContain('disabled:opacity-50')
    })

    it('passes ref to input element', () => {
        const ref = { current: null as HTMLInputElement | null }
        render(<Input ref={ref} />)
        expect(ref.current).not.toBeNull()
        expect(ref.current?.tagName).toBe('INPUT')
    })

    it('supports name attribute', () => {
        const { container } = render(<Input name="username" />)
        const input = container.querySelector('input')
        expect(input?.name).toBe('username')
    })

    it('supports value attribute', () => {
        const { container } = render(<Input value="initial" onChange={() => {}} />)
        const input = container.querySelector('input')
        expect(input?.value).toBe('initial')
    })
})
