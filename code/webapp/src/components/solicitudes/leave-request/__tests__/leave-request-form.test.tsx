/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { LeaveRequestForm } from '../leave-request-form'
import type { UseLeaveRequestFormResult } from '../use-leave-request-form'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockHandleSubmit = vi.fn((e?: React.BaseSyntheticEvent) => {
    e?.preventDefault?.()
})
const mockRegister = vi.fn((name: string) => ({ name }))
const mockReset = vi.fn()

const defaultHookResult = {
    form: {
        register: mockRegister,
        formState: { errors: {} },
        reset: mockReset,
    } as unknown as UseLeaveRequestFormResult['form'],
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
}

let currentHookResult = { ...defaultHookResult }

vi.mock('../use-leave-request-form', () => ({
    useLeaveRequestForm: () => currentHookResult,
}))

vi.mock('@/components/ui/slide-panel', () => ({
    SlidePanel: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string }) =>
        isOpen ? (
            <div data-testid="slide-panel">
                <h2>{title}</h2>
                {children}
            </div>
        ) : null,
}))

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('LeaveRequestForm', () => {
    beforeEach(() => {
        currentHookResult = { ...defaultHookResult, form: { ...defaultHookResult.form } }
    })

    afterEach(() => {
        cleanup()
        vi.clearAllMocks()
    })

    it('renders nothing when isOpen is false', () => {
        const { container } = render(
            <LeaveRequestForm isOpen={false} employeeId="emp-1" onClose={vi.fn()} />
        )
        expect(container.firstChild).toBeNull()
    })

    it('renders the panel title and leave type options', () => {
        render(<LeaveRequestForm isOpen employeeId="emp-1" onClose={vi.fn()} />)

        expect(screen.getByText('Solicitar permiso')).toBeDefined()
        expect(screen.getByText('Incapacidad médica')).toBeDefined()
        expect(screen.getByText('Permiso por horas')).toBeDefined()
    })

    it('renders start_date and end_date inputs', () => {
        render(<LeaveRequestForm isOpen employeeId="emp-1" onClose={vi.fn()} />)

        expect(screen.getByText('Fecha de inicio')).toBeDefined()
        expect(screen.getByText('Fecha de fin')).toBeDefined()
    })

    it('does not render PROPORTIONAL_HOURS fields when isProportionalHours is false', () => {
        render(<LeaveRequestForm isOpen employeeId="emp-1" onClose={vi.fn()} />)

        expect(screen.queryByText('Modo de horario')).toBeNull()
    })

    it('renders PROPORTIONAL_HOURS fields when isProportionalHours is true', () => {
        currentHookResult = { ...defaultHookResult, isProportionalHours: true }
        render(<LeaveRequestForm isOpen employeeId="emp-1" onClose={vi.fn()} />)

        expect(screen.getByText('Modo de horario')).toBeDefined()
        expect(screen.getByText('Hora de salida')).toBeDefined()
    })

    it('renders scheduled_end_time only when isScheduled is true', () => {
        currentHookResult = { ...defaultHookResult, isProportionalHours: true, isScheduled: true }
        render(<LeaveRequestForm isOpen employeeId="emp-1" onClose={vi.fn()} />)

        expect(screen.getByText('Hora de regreso programado')).toBeDefined()
    })

    it('calls handleSubmit on form submission', () => {
        render(<LeaveRequestForm isOpen employeeId="emp-1" onClose={vi.fn()} />)

        fireEvent.click(screen.getByText('Enviar solicitud'))

        expect(mockHandleSubmit).toHaveBeenCalled()
    })

    it('calls onClose when Cancelar is clicked', () => {
        const onClose = vi.fn()
        render(<LeaveRequestForm isOpen employeeId="emp-1" onClose={onClose} />)

        fireEvent.click(screen.getByText('Cancelar'))

        expect(onClose).toHaveBeenCalled()
    })

    it('disables the submit button while pending', () => {
        currentHookResult = { ...defaultHookResult, isPending: true }
        render(<LeaveRequestForm isOpen employeeId="emp-1" onClose={vi.fn()} />)

        const submitBtn = screen.getByText('Enviar solicitud').closest('button')
        expect(submitBtn?.disabled).toBe(true)
    })
})
