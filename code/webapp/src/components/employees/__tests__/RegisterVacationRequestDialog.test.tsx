/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { RegisterVacationRequestDialog } from '../RegisterVacationRequestDialog'
import type { UseRegisterVacationRequestDialogResult, RegisterVacationRequestEmployee } from '../use-register-vacation-request-dialog'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockHandleSubmit = vi.fn((e?: React.BaseSyntheticEvent) => {
    e?.preventDefault?.()
})
const mockHandleClose = vi.fn()
const mockRegister = vi.fn((name: string) => ({ name }))

const defaultHookResult: UseRegisterVacationRequestDialogResult = {
    form: {
        register: mockRegister,
        control: {},
        formState: { errors: {} },
        reset: vi.fn(),
    } as unknown as UseRegisterVacationRequestDialogResult['form'],
    daysCount: 0,
    remainingDays: null,
    isInsufficientBalance: false,
    isPending: false,
    handleSubmit: mockHandleSubmit,
    handleClose: mockHandleClose,
}

let currentHookResult = { ...defaultHookResult }

vi.mock('../use-register-vacation-request-dialog', () => ({
    useRegisterVacationRequestDialog: () => currentHookResult,
}))

vi.mock('react-hook-form', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-hook-form')>()
    return {
        ...actual,
        Controller: ({ render }: { render: (args: { field: { value: string[]; onChange: (v: string[]) => void } }) => React.ReactNode }) =>
            render({ field: { value: [], onChange: vi.fn() } }),
    }
})

const mockCan = vi.fn().mockReturnValue(true)

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: () => ({ can: mockCan }),
}))

// ── Test data ──────────────────────────────────────────────────────────────────

const mockEmployee: RegisterVacationRequestEmployee = {
    id: 'emp-1',
    user: {
        first_name: 'Carlos',
        last_name: 'Mendoza',
    },
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('RegisterVacationRequestDialog', () => {
    beforeEach(() => {
        currentHookResult = { ...defaultHookResult }
        mockCan.mockReturnValue(true)
    })

    afterEach(() => {
        cleanup()
        vi.clearAllMocks()
    })

    it('renders nothing when isOpen is false', () => {
        const { container } = render(
            <RegisterVacationRequestDialog isOpen={false} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(container.innerHTML).toBe('')
    })

    it('renders dialog when isOpen is true', () => {
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        const dialog = document.querySelector('dialog')
        expect(dialog).not.toBeNull()
    })

    it('displays "Programar vacaciones" title', () => {
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Programar vacaciones')
    })

    it('displays employee name', () => {
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Mendoza, Carlos')
    })

    it('renders an Avatar next to the employee name', () => {
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(screen.getByRole('img', { name: 'Mendoza, Carlos' })).toBeDefined()
    })

    it('shows the auto-approve notice when the actor can approve', () => {
        mockCan.mockReturnValue(true)
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Se registrará como aprobada de inmediato')
        expect(document.body.textContent).toContain('Registrar vacaciones')
    })

    it('shows the "requires approval" notice when the actor cannot approve', () => {
        mockCan.mockReturnValue(false)
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Solicitud — requiere aprobación')
        expect(document.body.textContent).toContain('Programar vacaciones')
    })

    it('shows the selected day count and remaining balance', () => {
        currentHookResult = { ...defaultHookResult, daysCount: 2, remainingDays: 9 }
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('2 días solicitados')
        expect(document.body.textContent).toContain('Saldo disponible: 9')
    })

    it('uses singular day label when daysCount is 1', () => {
        currentHookResult = { ...defaultHookResult, daysCount: 1, remainingDays: 9 }
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('1 día solicitado')
    })

    it('shows an insufficient balance warning', () => {
        currentHookResult = { ...defaultHookResult, daysCount: 10, remainingDays: 2, isInsufficientBalance: true }
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('El empleado no tiene saldo suficiente para las fechas seleccionadas.')
    })

    it('renders notes field', () => {
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Notas')
    })

    it('calls handleSubmit on form submission', () => {
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        const form = document.querySelector('form')
        expect(form).not.toBeNull()
        fireEvent.submit(form!)
        expect(mockHandleSubmit).toHaveBeenCalled()
    })

    it('calls onClose when Cancelar is clicked', () => {
        const onClose = vi.fn()
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
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
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
        )
        const closeBtn = document.querySelector('button[aria-label="Cerrar"]')
        expect(closeBtn).not.toBeNull()
        fireEvent.click(closeBtn!)
        expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when backdrop is clicked', () => {
        const onClose = vi.fn()
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
        )
        const backdrop = document.querySelector('.bg-black\\/50')
        expect(backdrop).not.toBeNull()
        fireEvent.click(backdrop!)
        expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when Escape key is pressed', () => {
        const onClose = vi.fn()
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
        )
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(onClose).toHaveBeenCalled()
    })

    it('does not call onClose on Escape when isPending', () => {
        currentHookResult = { ...defaultHookResult, isPending: true }
        const onClose = vi.fn()
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
        )
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(onClose).not.toHaveBeenCalled()
    })

    it('does not call onClose on backdrop click when isPending', () => {
        currentHookResult = { ...defaultHookResult, isPending: true }
        const onClose = vi.fn()
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
        )
        const backdrop = document.querySelector('.bg-black\\/50')
        fireEvent.click(backdrop!)
        expect(onClose).not.toHaveBeenCalled()
    })

    it('disables the submit button while pending', () => {
        currentHookResult = { ...defaultHookResult, isPending: true }
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        const submitBtn = Array.from(document.querySelectorAll('button')).find((b) => b.type === 'submit')
        expect(submitBtn?.disabled).toBe(true)
    })

    it('handles empty employee gracefully', () => {
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={null} onClose={vi.fn()} />
        )
        const dialog = document.querySelector('dialog')
        expect(dialog).not.toBeNull()
    })

    it('has aria-labelledby pointing to title', () => {
        render(
            <RegisterVacationRequestDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        const dialog = document.querySelector('dialog')
        expect(dialog?.getAttribute('aria-labelledby')).toBe('register-vacation-request-title')
        const title = document.getElementById('register-vacation-request-title')
        expect(title).not.toBeNull()
    })
})
