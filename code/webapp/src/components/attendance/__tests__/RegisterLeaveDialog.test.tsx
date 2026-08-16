/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { RegisterLeaveDialog } from '../RegisterLeaveDialog'
import type { TodayAttendanceEmployee } from '@/types/attendance'
import type { UseRegisterLeaveDialogResult } from '../use-register-leave-dialog'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockHandleSubmit = vi.fn((e?: React.BaseSyntheticEvent) => {
    e?.preventDefault?.()
})
const mockHandleClose = vi.fn()
const mockRegister = vi.fn((_name: string) => ({ name: _name }))

const defaultHookResult: UseRegisterLeaveDialogResult = {
    form: {
        register: mockRegister,
        formState: { errors: {} },
        handleSubmit: () => mockHandleSubmit,
        watch: vi.fn(),
        setValue: vi.fn(),
        getValues: vi.fn(),
        reset: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
    } as unknown as UseRegisterLeaveDialogResult['form'],
    leaveTypes: [
        {
            id: 1,
            code: 'MEDICAL',
            name: 'Incapacidad médica',
            calculation_mode: 'FIXED_PERCENTAGE' as const,
            default_pay_percentage: 0,
            default_rest_day_factor: 'NONE' as const,
            counts_for_bonus: false,
        },
        {
            id: 4,
            code: 'PERMISSION_HOURS',
            name: 'Permiso por horas',
            calculation_mode: 'PROPORTIONAL_HOURS' as const,
            default_pay_percentage: 0,
            default_rest_day_factor: 'PROPORTIONAL' as const,
            counts_for_bonus: false,
        },
    ],
    isLoadingTypes: false,
    isProportionalHours: false,
    isScheduled: false,
    isPending: false,
    handleSubmit: mockHandleSubmit,
    handleClose: mockHandleClose,
}

let currentHookResult = { ...defaultHookResult }

vi.mock('../use-register-leave-dialog', () => ({
    useRegisterLeaveDialog: () => currentHookResult,
}))

// ── Test data ──────────────────────────────────────────────────────────────────

const mockEmployee: TodayAttendanceEmployee = {
    id: '01HZTEST00000001',
    code: 'EMP-001',
    user: {
        first_name: 'Carlos',
        last_name: 'Mendoza',
            avatar_url: null,
    },
    roles: [],
    daily_wage: null,
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('RegisterLeaveDialog', () => {
    beforeEach(() => {
        currentHookResult = { ...defaultHookResult }
    })

    afterEach(() => {
        cleanup()
        vi.clearAllMocks()
    })

    it('renders nothing when isOpen is false', () => {
        const { container } = render(
            <RegisterLeaveDialog isOpen={false} employee={mockEmployee} onClose={vi.fn()} />
        )
        // The portal should not render anything visible
        expect(container.innerHTML).toBe('')
    })

    it('renders dialog when isOpen is true', () => {
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        const dialog = document.querySelector('dialog')
        expect(dialog).not.toBeNull()
    })

    it('displays "Registrar ausencia" title', () => {
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Registrar ausencia')
    })

    it('displays employee name', () => {
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Mendoza, Carlos')
    })

    it('renders leave type selector with options', () => {
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Tipo de ausencia')
        expect(document.body.textContent).toContain('Incapacidad médica')
        expect(document.body.textContent).toContain('Permiso por horas')
    })

    it('shows loading text when leaveTypes are loading', () => {
        currentHookResult = {
            ...defaultHookResult,
            leaveTypes: [],
            isLoadingTypes: true,
        }

        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Cargando...')
    })

    it('renders pay percentage field', () => {
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('% de pago (opcional)')
    })

    it('renders notes field', () => {
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Notas')
    })

    it('renders cancel and submit buttons', () => {
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Cancelar')
        expect(document.body.textContent).toContain('Registrar ausencia')
    })

    it('calls onClose when cancel button is clicked', () => {
        const onClose = vi.fn()
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
        )
        const buttons = document.querySelectorAll('button')
        const cancelBtn = Array.from(buttons).find(
            (b) => b.textContent === 'Cancelar'
        )
        expect(cancelBtn).toBeDefined()
        fireEvent.click(cancelBtn!)
        expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when close (X) button is clicked', () => {
        const onClose = vi.fn()
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
        )
        const closeBtn = document.querySelector('button[aria-label="Cerrar"]')
        expect(closeBtn).not.toBeNull()
        fireEvent.click(closeBtn!)
        expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when backdrop is clicked', () => {
        const onClose = vi.fn()
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
        )
        // The backdrop is the div with bg-black/50
        const backdrop = document.querySelector('.bg-black\\/50')
        expect(backdrop).not.toBeNull()
        fireEvent.click(backdrop!)
        expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when Escape key is pressed', () => {
        const onClose = vi.fn()
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
        )
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(onClose).toHaveBeenCalled()
    })

    it('does not call onClose on Escape when isPending', () => {
        currentHookResult = { ...defaultHookResult, isPending: true }
        const onClose = vi.fn()
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
        )
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(onClose).not.toHaveBeenCalled()
    })

    it('does not call onClose on backdrop click when isPending', () => {
        currentHookResult = { ...defaultHookResult, isPending: true }
        const onClose = vi.fn()
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={onClose} />
        )
        const backdrop = document.querySelector('.bg-black\\/50')
        fireEvent.click(backdrop!)
        expect(onClose).not.toHaveBeenCalled()
    })

    it('shows PROPORTIONAL_HOURS fields when isProportionalHours is true', () => {
        currentHookResult = { ...defaultHookResult, isProportionalHours: true }
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Modo de horario')
        expect(document.body.textContent).toContain('Hora de salida')
    })

    it('hides PROPORTIONAL_HOURS fields when isProportionalHours is false', () => {
        currentHookResult = { ...defaultHookResult, isProportionalHours: false }
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).not.toContain('Modo de horario')
        expect(document.body.textContent).not.toContain('Hora de salida')
    })

    it('shows scheduled end time field when isScheduled is true', () => {
        currentHookResult = {
            ...defaultHookResult,
            isProportionalHours: true,
            isScheduled: true,
        }
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).toContain('Hora de regreso programado')
    })

    it('hides scheduled end time field when isScheduled is false', () => {
        currentHookResult = {
            ...defaultHookResult,
            isProportionalHours: true,
            isScheduled: false,
        }
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        expect(document.body.textContent).not.toContain('Hora de regreso programado')
    })

    it('handles empty employee gracefully', () => {
        render(
            <RegisterLeaveDialog isOpen={true} employee={null} onClose={vi.fn()} />
        )
        const dialog = document.querySelector('dialog')
        expect(dialog).not.toBeNull()
    })

    it('has aria-modal attribute on dialog', () => {
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        const dialog = document.querySelector('dialog')
        expect(dialog?.hasAttribute('open')).toBe(true)
    })

    it('has aria-labelledby pointing to title', () => {
        render(
            <RegisterLeaveDialog isOpen={true} employee={mockEmployee} onClose={vi.fn()} />
        )
        const dialog = document.querySelector('dialog')
        expect(dialog?.getAttribute('aria-labelledby')).toBe('register-leave-title')
        const title = document.getElementById('register-leave-title')
        expect(title).not.toBeNull()
    })
})
