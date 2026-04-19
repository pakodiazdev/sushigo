/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { ToastProvider, useToast } from '../toast-provider'

// Test component that uses the toast context
function TestComponent() {
    const { showSuccess, showError, showWarning, showInfo } = useToast()

    return (
        <div>
            <button onClick={() => showSuccess('Success message')}>Show Success</button>
            <button onClick={() => showError('Error message')}>Show Error</button>
            <button onClick={() => showWarning('Warning message')}>Show Warning</button>
            <button onClick={() => showInfo('Info message')}>Show Info</button>
        </div>
    )
}

describe('ToastProvider', () => {
    afterEach(() => {
        cleanup()
    })

    it('renders children', () => {
        render(
            <ToastProvider>
                <div data-testid="child">Child content</div>
            </ToastProvider>,
        )

        expect(screen.getByTestId('child')).toBeDefined()
    })

    it('shows success toast when showSuccess is called', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>,
        )

        act(() => {
            fireEvent.click(screen.getByText('Show Success'))
        })

        expect(screen.getByText('Success message')).toBeDefined()
    })

    it('shows error toast when showError is called', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>,
        )

        act(() => {
            fireEvent.click(screen.getByText('Show Error'))
        })

        expect(screen.getByText('Error message')).toBeDefined()
    })

    it('shows warning toast when showWarning is called', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>,
        )

        act(() => {
            fireEvent.click(screen.getByText('Show Warning'))
        })

        expect(screen.getByText('Warning message')).toBeDefined()
    })

    it('shows info toast when showInfo is called', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>,
        )

        act(() => {
            fireEvent.click(screen.getByText('Show Info'))
        })

        expect(screen.getByText('Info message')).toBeDefined()
    })
})

describe('useToast', () => {
    it('throws error when used outside ToastProvider', () => {
        // Suppress console.error for this test
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

        expect(() => {
            render(<TestComponent />)
        }).toThrow('useToast must be used within ToastProvider')

        consoleSpy.mockRestore()
    })
})
