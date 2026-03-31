/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, cleanup, fireEvent, act } from '@testing-library/react'
import { Toast } from '../toast'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('Toast', () => {
    const defaultProps = {
        id: 'test-toast',
        message: 'Test message',
        onClose: vi.fn(),
    }

    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('rendering', () => {
        it('renders message', () => {
            const { getByText } = render(<Toast {...defaultProps} />)
            expect(getByText('Test message')).toBeDefined()
        })

        it('renders title when provided', () => {
            const { getByText } = render(
                <Toast {...defaultProps} title="Test Title" />
            )
            expect(getByText('Test Title')).toBeDefined()
        })

        it('does not render title element when not provided', () => {
            const { container } = render(<Toast {...defaultProps} />)
            // Only message should be present, no title div with font-semibold
            const fontSemibold = container.querySelector('.font-semibold')
            expect(fontSemibold).toBeNull()
        })

        it('has role="alert"', () => {
            const { getByRole } = render(<Toast {...defaultProps} />)
            expect(getByRole('alert')).toBeDefined()
        })
    })

    describe('variants', () => {
        it('renders with info variant by default', () => {
            const { container } = render(<Toast {...defaultProps} />)
            const alertElement = container.querySelector('[role="alert"]')
            expect(alertElement?.className).toContain('blue')
        })

        it('renders with success variant', () => {
            const { container } = render(
                <Toast {...defaultProps} variant="success" />
            )
            const alertElement = container.querySelector('[role="alert"]')
            expect(alertElement?.className).toContain('green')
        })

        it('renders with error variant', () => {
            const { container } = render(
                <Toast {...defaultProps} variant="error" />
            )
            const alertElement = container.querySelector('[role="alert"]')
            expect(alertElement?.className).toContain('red')
        })

        it('renders with warning variant', () => {
            const { container } = render(
                <Toast {...defaultProps} variant="warning" />
            )
            const alertElement = container.querySelector('[role="alert"]')
            expect(alertElement?.className).toContain('yellow')
        })
    })

    describe('close button', () => {
        it('calls onClose with id when close button is clicked', () => {
            const onClose = vi.fn()
            const { container } = render(
                <Toast {...defaultProps} onClose={onClose} />
            )

            const closeButton = container.querySelector('button')
            if (closeButton) {
                fireEvent.click(closeButton)
            }

            expect(onClose).toHaveBeenCalledWith('test-toast')
        })
    })

    describe('auto-dismiss', () => {
        it('calls onClose after default duration (5000ms)', () => {
            const onClose = vi.fn()
            render(<Toast {...defaultProps} onClose={onClose} />)

            expect(onClose).not.toHaveBeenCalled()

            act(() => {
                vi.advanceTimersByTime(5000)
            })

            expect(onClose).toHaveBeenCalledWith('test-toast')
        })

        it('calls onClose after custom duration', () => {
            const onClose = vi.fn()
            render(<Toast {...defaultProps} onClose={onClose} duration={2000} />)

            expect(onClose).not.toHaveBeenCalled()

            act(() => {
                vi.advanceTimersByTime(2000)
            })

            expect(onClose).toHaveBeenCalledWith('test-toast')
        })

        it('does not auto-dismiss when duration is 0', () => {
            const onClose = vi.fn()
            render(<Toast {...defaultProps} onClose={onClose} duration={0} />)

            act(() => {
                vi.advanceTimersByTime(10000)
            })

            expect(onClose).not.toHaveBeenCalled()
        })
    })
})
