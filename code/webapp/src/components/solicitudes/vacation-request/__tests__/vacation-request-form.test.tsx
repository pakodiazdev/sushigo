/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { VacationRequestForm } from '../vacation-request-form'
import type { UseVacationRequestFormResult } from '../use-vacation-request-form'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockHandleSubmit = vi.fn((e?: React.BaseSyntheticEvent) => {
    e?.preventDefault?.()
})
const mockRegister = vi.fn((name: string) => ({ name }))
const mockReset = vi.fn()

vi.mock('react-hook-form', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-hook-form')>()
    return {
        ...actual,
        Controller: ({ render }: { render: (args: { field: { value: string[]; onChange: (v: string[]) => void } }) => React.ReactNode }) =>
            render({ field: { value: ['2026-08-10'], onChange: vi.fn() } }),
    }
})

const defaultHookResult = {
    form: {
        register: mockRegister,
        control: {},
        formState: { errors: {} },
        reset: mockReset,
    } as unknown as UseVacationRequestFormResult['form'],
    daysCount: 0,
    remainingDays: null as number | null,
    isInsufficientBalance: false,
    isPending: false,
    handleSubmit: mockHandleSubmit,
}

let currentHookResult = { ...defaultHookResult }

vi.mock('../use-vacation-request-form', () => ({
    useVacationRequestForm: () => currentHookResult,
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

describe('VacationRequestForm', () => {
    beforeEach(() => {
        currentHookResult = { ...defaultHookResult, form: { ...defaultHookResult.form } }
    })

    afterEach(() => {
        cleanup()
        vi.clearAllMocks()
    })

    it('renders nothing when isOpen is false', () => {
        const { container } = render(
            <VacationRequestForm isOpen={false} employeeId="emp-1" onClose={vi.fn()} />
        )
        expect(container.firstChild).toBeNull()
    })

    it('renders the panel title and days calendar field', () => {
        render(<VacationRequestForm isOpen employeeId="emp-1" onClose={vi.fn()} />)

        expect(screen.getByText('Solicitar vacaciones')).toBeDefined()
        expect(screen.getByText('Días')).toBeDefined()
    })

    it('shows the selected day count and remaining balance', () => {
        currentHookResult = { ...defaultHookResult, daysCount: 2, remainingDays: 9 }
        render(<VacationRequestForm isOpen employeeId="emp-1" onClose={vi.fn()} />)

        expect(screen.getByText(/2 días solicitados/)).toBeDefined()
        expect(screen.getByText(/Saldo disponible: 9/)).toBeDefined()
    })

    it('shows an insufficient balance warning', () => {
        currentHookResult = { ...defaultHookResult, daysCount: 10, remainingDays: 2, isInsufficientBalance: true }
        render(<VacationRequestForm isOpen employeeId="emp-1" onClose={vi.fn()} />)

        expect(screen.getByText(/No tienes saldo de vacaciones suficiente/)).toBeDefined()
    })

    it('shows the "requires approval" notice', () => {
        render(<VacationRequestForm isOpen employeeId="emp-1" onClose={vi.fn()} />)

        expect(screen.getByText(/requiere aprobación del Manager/)).toBeDefined()
    })

    it('calls handleSubmit on form submission', () => {
        render(<VacationRequestForm isOpen employeeId="emp-1" onClose={vi.fn()} />)

        fireEvent.click(screen.getByText('Enviar solicitud'))

        expect(mockHandleSubmit).toHaveBeenCalled()
    })

    it('calls onClose when Cancelar is clicked', () => {
        const onClose = vi.fn()
        render(<VacationRequestForm isOpen employeeId="emp-1" onClose={onClose} />)

        fireEvent.click(screen.getByText('Cancelar'))

        expect(onClose).toHaveBeenCalled()
    })

    it('disables the submit button while pending', () => {
        currentHookResult = { ...defaultHookResult, isPending: true }
        render(<VacationRequestForm isOpen employeeId="emp-1" onClose={vi.fn()} />)

        const submitBtn = screen.getByText('Enviar solicitud').closest('button')
        expect(submitBtn?.disabled).toBe(true)
    })
})
