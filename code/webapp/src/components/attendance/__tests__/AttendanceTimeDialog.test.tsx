/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, waitFor, fireEvent, renderHook, act } from '@testing-library/react'
import { AttendanceTimeDialog } from '../AttendanceTimeDialog'
import { useAttendanceTimeDialog } from '../use-attendance-time-dialog'

afterEach(() => {
    cleanup()
})

// ── useAttendanceTimeDialog Hook Tests ─────────────────────────────────────────

describe('useAttendanceTimeDialog', () => {
    const defaultParams = {
        isOpen: true,
        initialTime: '14:00',
        maxTime: '18:00',
        onConfirm: vi.fn(),
        onClose: vi.fn(),
    }

    it('initializes with correct time value', () => {
        const { result } = renderHook(() => useAttendanceTimeDialog(defaultParams))

        expect(result.current.time).toBe('14:00')
    })

    it('resets form when dialog opens with new initial time', async () => {
        const { result, rerender } = renderHook(
            (props) => useAttendanceTimeDialog(props),
            { initialProps: { ...defaultParams, isOpen: false } }
        )

        // Initially closed
        expect(result.current.time).toBe('14:00')

        // Open dialog with new time
        rerender({ ...defaultParams, isOpen: true, initialTime: '15:00' })

        await waitFor(() => {
            expect(result.current.time).toBe('15:00')
        })
    })

    it('validates empty time as invalid', () => {
        const { result } = renderHook(() =>
            useAttendanceTimeDialog({ ...defaultParams, initialTime: '' })
        )

        expect(result.current.isValid).toBe(false)
    })

    it('validates time format correctly', async () => {
        const { result } = renderHook(() =>
            useAttendanceTimeDialog({ ...defaultParams, initialTime: '14:30' })
        )

        // Valid time should be valid
        await waitFor(() => {
            expect(result.current.isValid).toBe(true)
        })
    })

    it('handleClose calls onClose and resets form', () => {
        const onClose = vi.fn()
        const { result } = renderHook(() =>
            useAttendanceTimeDialog({ ...defaultParams, onClose })
        )

        act(() => {
            result.current.handleClose()
        })

        expect(onClose).toHaveBeenCalled()
    })
})

// ── AttendanceTimeDialog Component Tests ───────────────────────────────────────

describe('AttendanceTimeDialog', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        title: 'Test Dialog',
        employeeName: 'John Doe',
        confirmLabel: 'Confirm',
        initialTime: '14:00',
        maxTime: '18:00',
        inputId: 'test-time',
        inputLabel: 'Time',
    }

    it('renders dialog when open', () => {
        const { getByText } = render(<AttendanceTimeDialog {...defaultProps} />)

        expect(getByText('Test Dialog')).toBeDefined()
        expect(getByText(/John Doe/)).toBeDefined()
    })

    it('does not render dialog when closed', () => {
        const { queryByText } = render(<AttendanceTimeDialog {...defaultProps} isOpen={false} />)

        expect(queryByText('Test Dialog')).toBeNull()
    })

    it('renders time input with correct type', () => {
        const { container } = render(<AttendanceTimeDialog {...defaultProps} />)

        const input = container.querySelector('input[type="time"]')
        expect(input).toBeDefined()
        expect(input?.getAttribute('max')).toBe('18:00')
    })

    it('renders confirm button with correct label', () => {
        const { getByText } = render(<AttendanceTimeDialog {...defaultProps} />)

        expect(getByText('Confirm')).toBeDefined()
    })

    it('shows loading state when isLoading is true', () => {
        const { getByText } = render(<AttendanceTimeDialog {...defaultProps} isLoading={true} />)

        const button = getByText('Confirm').closest('button')
        expect(button?.disabled).toBe(true)
    })

    it('has time input with initial value', () => {
        const { container } = render(<AttendanceTimeDialog {...defaultProps} />)

        const input = container.querySelector('input[type="time"]') as HTMLInputElement
        expect(input.value).toBe('14:00')
    })

    it('calls onClose when cancel button is clicked', () => {
        const onClose = vi.fn()
        const { getByText } = render(<AttendanceTimeDialog {...defaultProps} onClose={onClose} />)

        const cancelButton = getByText('Cancelar')
        fireEvent.click(cancelButton)

        expect(onClose).toHaveBeenCalled()
    })

    it('does not reset user input when initialTime changes while dialog is open', () => {
        const { container, rerender } = render(<AttendanceTimeDialog {...defaultProps} />)

        const input = container.querySelector('input[type="time"]') as HTMLInputElement
        expect(input.value).toBe('14:00')

        // User types a different time
        fireEvent.change(input, { target: { value: '13:30' } })
        expect(input.value).toBe('13:30')

        // Re-render with new initialTime (simulates minute boundary crossing)
        rerender(<AttendanceTimeDialog {...defaultProps} initialTime="14:01" maxTime="14:01" />)

        // User's input should NOT be overwritten
        expect(input.value).toBe('13:30')
    })

    it('resets form when dialog reopens', () => {
        const { container, rerender } = render(<AttendanceTimeDialog {...defaultProps} />)

        const input = container.querySelector('input[type="time"]') as HTMLInputElement
        fireEvent.change(input, { target: { value: '13:30' } })
        expect(input.value).toBe('13:30')

        // Close dialog
        rerender(<AttendanceTimeDialog {...defaultProps} isOpen={false} />)

        // Reopen dialog with new initial time
        rerender(<AttendanceTimeDialog {...defaultProps} isOpen={true} initialTime="15:00" maxTime="15:00" />)

        // Should reset to new initialTime since dialog was closed and reopened
        expect(input.value).toBe('15:00')
    })
})
