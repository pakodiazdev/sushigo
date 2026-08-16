/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ManualOvertimeMovementDialog } from '../ManualOvertimeMovementDialog'
import type { UseManualOvertimeMovementDialogResult, ManualOvertimeMovementEmployee } from '../use-manual-overtime-movement-dialog'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockHandleSubmit = vi.fn((e?: React.BaseSyntheticEvent) => {
    e?.preventDefault?.()
})
const mockHandleClose = vi.fn()
const mockRegister = vi.fn((name: string) => ({ name }))

const defaultHookResult: UseManualOvertimeMovementDialogResult = {
    form: {
        register: mockRegister,
        formState: { errors: {} },
        reset: vi.fn(),
    } as unknown as UseManualOvertimeMovementDialogResult['form'],
    isPending: false,
    handleSubmit: mockHandleSubmit,
    handleClose: mockHandleClose,
}

let currentHookResult = { ...defaultHookResult }

vi.mock('../use-manual-overtime-movement-dialog', () => ({
    useManualOvertimeMovementDialog: () => currentHookResult,
}))

// ── Test data ──────────────────────────────────────────────────────────────────

const mockEmployee: ManualOvertimeMovementEmployee = {
    id: 'emp-1',
    user: {
        first_name: 'Carlos',
        last_name: 'Mendoza',
            avatar_url: null,
    },
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ManualOvertimeMovementDialog', () => {
    beforeEach(() => {
        currentHookResult = { ...defaultHookResult }
    })

    afterEach(() => {
        cleanup()
        vi.clearAllMocks()
    })

    it('renders nothing when isOpen is false', () => {
        const { container } = render(
            <ManualOvertimeMovementDialog isOpen={false} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(container.innerHTML).toBe('')
    })

    it('renders dialog when isOpen is true', () => {
        render(
            <ManualOvertimeMovementDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        const dialog = document.querySelector('dialog')
        expect(dialog).not.toBeNull()
    })

    it('displays "Movimiento manual" title', () => {
        render(
            <ManualOvertimeMovementDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Movimiento manual')
    })

    it('displays employee name', () => {
        render(
            <ManualOvertimeMovementDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Mendoza, Carlos')
    })

    it('renders an Avatar next to the employee name', () => {
        render(
            <ManualOvertimeMovementDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(screen.getByRole('img', { name: 'Mendoza, Carlos' })).toBeDefined()
    })

    it('renders movement type, date, minutes and reason fields', () => {
        render(
            <ManualOvertimeMovementDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Tipo de movimiento')
        expect(document.body.textContent).toContain('Fecha')
        expect(document.body.textContent).toContain('Minutos')
        expect(document.body.textContent).toContain('Motivo')
    })

    it('calls handleSubmit on form submission', () => {
        render(
            <ManualOvertimeMovementDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        const form = document.querySelector('form')
        expect(form).not.toBeNull()
        fireEvent.submit(form!)
        expect(mockHandleSubmit).toHaveBeenCalled()
    })

    it('calls onClose when Cancelar is clicked', () => {
        const onClose = vi.fn()
        render(
            <ManualOvertimeMovementDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
        )
        const buttons = document.querySelectorAll('button')
        const cancelBtn = Array.from(buttons).find((b) => b.textContent === 'Cancelar')
        expect(cancelBtn).toBeDefined()
        fireEvent.click(cancelBtn!)
        expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when close (X) button is clicked', () => {
        const onClose = vi.fn()
        render(
            <ManualOvertimeMovementDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
        )
        const closeBtn = document.querySelector('button[aria-label="Cerrar"]')
        expect(closeBtn).not.toBeNull()
        fireEvent.click(closeBtn!)
        expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when backdrop is clicked', () => {
        const onClose = vi.fn()
        render(
            <ManualOvertimeMovementDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
        )
        const backdrop = document.querySelector('.bg-black\\/50')
        expect(backdrop).not.toBeNull()
        fireEvent.click(backdrop!)
        expect(onClose).toHaveBeenCalled()
    })

    it('does not call onClose on backdrop click when isPending', () => {
        currentHookResult = { ...defaultHookResult, isPending: true }
        const onClose = vi.fn()
        render(
            <ManualOvertimeMovementDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
        )
        const backdrop = document.querySelector('.bg-black\\/50')
        fireEvent.click(backdrop!)
        expect(onClose).not.toHaveBeenCalled()
    })

    it('disables the submit button while pending', () => {
        currentHookResult = { ...defaultHookResult, isPending: true }
        render(
            <ManualOvertimeMovementDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        const submitBtn = Array.from(document.querySelectorAll('button')).find((b) => b.type === 'submit')
        expect(submitBtn?.disabled).toBe(true)
    })

    it('handles empty employee gracefully', () => {
        render(
            <ManualOvertimeMovementDialog isOpen={true} employee={null} onClose={vi.fn()} />
        )
        const dialog = document.querySelector('dialog')
        expect(dialog).not.toBeNull()
    })

    it('has aria-labelledby pointing to title', () => {
        render(
            <ManualOvertimeMovementDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        const dialog = document.querySelector('dialog')
        expect(dialog?.getAttribute('aria-labelledby')).toBe('manual-overtime-movement-title')
        const title = document.getElementById('manual-overtime-movement-title')
        expect(title).not.toBeNull()
    })
})
