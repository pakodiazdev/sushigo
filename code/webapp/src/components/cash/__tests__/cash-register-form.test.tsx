/**
 * @vitest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CashRegisterForm } from '../cash-register-form'
import { CashRegisterType } from '@/types/cash'

const cashApiMocks = vi.hoisted(() => ({ nextCode: vi.fn(), create: vi.fn() }))
const toastMocks = vi.hoisted(() => ({ showSuccess: vi.fn(), showError: vi.fn() }))
const mockUpdateMutation = {
    mutateAsync: vi.fn().mockResolvedValue({ data: { data: { id: '1' } } }),
    isPending: false,
}

vi.mock('@/services/cash-hooks', () => ({
    useUpdateCashRegister: () => mockUpdateMutation,
}))

vi.mock('@/services/cash-api', () => ({
    cashRegisterApi: { nextCode: cashApiMocks.nextCode, create: cashApiMocks.create },
}))

vi.mock('@/components/ui/toast-context', () => ({
    useToast: () => toastMocks,
}))

vi.mock('@/lib/api-error', () => ({
    isApiError: (error: unknown) =>
        Boolean(error && typeof error === 'object' && 'response' in error),
    getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}))

vi.mock('@/components/ui/slide-panel', () => ({
    SlidePanel: ({ children, isOpen, title, description, noPadding }: {
        children: ReactNode
        isOpen: boolean
        title: string
        description: string
        noPadding?: boolean
    }) =>
        isOpen ? (
            <div data-testid="slide-panel" data-no-padding={noPadding}>
                <h2>{title}</h2>
                <p>{description}</p>
                {children}
            </div>
        ) : null,
}))

function renderForm(ui: ReactNode) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(createElement(QueryClientProvider, { client }, ui))
}

const editableRegister = {
    id: '1',
    code: 'REG-042',
    name: 'Main Register',
    branch_id: 1,
    operating_unit_id: null,
    type: CashRegisterType.ON_PREMISE,
    is_active: true,
    meta: {},
    created_at: '',
    updated_at: '',
}

const defaultProps = {
    register: null,
    operatingUnits: [
        { id: 1, name: 'Main Unit', branch_id: 1, type: 'EVENT_TEMP' as const, is_active: true, created_at: '', updated_at: '' },
    ],
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
}

describe('CashRegisterForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        cashApiMocks.nextCode.mockResolvedValue({ data: { code: 'REG-001', prefix: 'REG-' } })
        cashApiMocks.create.mockResolvedValue({ data: { data: { id: 'new' } } })
    })

    afterEach(() => {
        cleanup()
    })

    it('renders the new-register title and description when creating', () => {
        const { getByText } = renderForm(<CashRegisterForm {...defaultProps} />)
        expect(getByText('Nueva Caja Registradora')).toBeDefined()
        expect(getByText('Crea una nueva caja registradora')).toBeDefined()
    })

    it('renders the edit-register title when editing', () => {
        const { getByText } = renderForm(
            <CashRegisterForm {...defaultProps} register={editableRegister} />
        )
        expect(getByText('Editar Caja Registradora')).toBeDefined()
    })

    it('does not render when isOpen is false', () => {
        const { queryByTestId } = renderForm(
            <CashRegisterForm {...defaultProps} isOpen={false} />
        )
        expect(queryByTestId('slide-panel')).toBeNull()
    })

    it('prefills the server-suggested code and shows the hint in create mode', async () => {
        const { getByLabelText, getByText } = renderForm(<CashRegisterForm {...defaultProps} />)

        await waitFor(() =>
            expect((getByLabelText('Código') as HTMLInputElement).value).toBe('REG-001')
        )
        expect(getByText('Sugerido automáticamente; puedes modificarlo.')).toBeDefined()
        expect(cashApiMocks.nextCode).toHaveBeenCalledTimes(1)
    })

    it('exposes an accessible refresh action that requests another suggestion', async () => {
        cashApiMocks.nextCode
            .mockResolvedValueOnce({ data: { code: 'REG-001', prefix: 'REG-' } })
            .mockResolvedValueOnce({ data: { code: 'REG-009', prefix: 'REG-' } })
        const { getByLabelText } = renderForm(<CashRegisterForm {...defaultProps} />)

        await waitFor(() =>
            expect((getByLabelText('Código') as HTMLInputElement).value).toBe('REG-001')
        )
        fireEvent.click(getByLabelText('Sugerir otro código'))
        await waitFor(() =>
            expect((getByLabelText('Código') as HTMLInputElement).value).toBe('REG-009')
        )
    })

    it('keeps the persisted code, disables it, and fetches no suggestion in edit mode', async () => {
        const { getByLabelText, queryByLabelText, queryByText } = renderForm(
            <CashRegisterForm {...defaultProps} register={editableRegister} />
        )

        const codeInput = getByLabelText('Código') as HTMLInputElement
        expect(codeInput.value).toBe('REG-042')
        expect(codeInput.disabled).toBe(true)
        expect(queryByLabelText('Sugerir otro código')).toBeNull()
        expect(queryByText('Sugerido automáticamente; puedes modificarlo.')).toBeNull()
        await Promise.resolve()
        expect(cashApiMocks.nextCode).not.toHaveBeenCalled()
    })

    it('calls onClose when cancel is clicked', () => {
        const onClose = vi.fn()
        const { getByText } = renderForm(
            <CashRegisterForm {...defaultProps} onClose={onClose} />
        )
        fireEvent.click(getByText('Cancelar'))
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('submits the create mutation with the suggested code accepted as-is', async () => {
        const { container, getByLabelText } = renderForm(<CashRegisterForm {...defaultProps} />)

        await waitFor(() =>
            expect((getByLabelText('Código') as HTMLInputElement).value).toBe('REG-001')
        )
        fireEvent.change(getByLabelText('Nombre'), { target: { value: 'Caja Nueva' } })
        fireEvent.submit(container.querySelector('form')!)

        await waitFor(() => expect(cashApiMocks.create).toHaveBeenCalled())
        expect(cashApiMocks.create).toHaveBeenCalledWith(
            expect.objectContaining({ code: 'REG-001', name: 'Caja Nueva' })
        )
    })

    it('submits the update mutation in edit mode', async () => {
        const { container } = renderForm(
            <CashRegisterForm {...defaultProps} register={editableRegister} />
        )
        fireEvent.submit(container.querySelector('form')!)

        await waitFor(() =>
            expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
                id: '1',
                data: expect.objectContaining({ name: 'Main Register', code: 'REG-042' }),
            })
        )
    })

    it('surfaces a Spanish collision message and a fresh suggestion without creating', async () => {
        cashApiMocks.create.mockRejectedValueOnce({
            response: {
                data: {
                    message: 'Ya existe una caja registradora con este código.',
                    errors: { code: ['Ya existe una caja registradora con este código.'] },
                    rejected_code: 'REG-001',
                    suggested_code: 'REG-002',
                },
            },
        })
        const onSuccess = vi.fn()
        const { container, getByLabelText, getByText } = renderForm(
            <CashRegisterForm {...defaultProps} onSuccess={onSuccess} />
        )

        await waitFor(() =>
            expect((getByLabelText('Código') as HTMLInputElement).value).toBe('REG-001')
        )
        fireEvent.change(getByLabelText('Nombre'), { target: { value: 'Caja Nueva' } })
        fireEvent.submit(container.querySelector('form')!)

        await waitFor(() =>
            expect(getByText(/El código REG-001 acaba de ser utilizado/)).toBeDefined()
        )
        expect((getByLabelText('Código') as HTMLInputElement).value).toBe('REG-002')
        expect(onSuccess).not.toHaveBeenCalled()
    })
})
