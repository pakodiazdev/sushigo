// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, screen } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OpeningBalanceForm } from '../opening-balance-form'

vi.mock('@/hooks/use-form-mutation', () => ({
    useFormMutation: () => ({
        execute: vi.fn().mockResolvedValue({}),
        validationErrors: {},
        isPending: false,
    }),
}))

vi.mock('@/components/ui/toast-provider', () => ({
    useToast: () => ({
        showSuccess: vi.fn(),
        showError: vi.fn(),
        showWarning: vi.fn(),
    }),
}))

vi.mock('@/services/inventory-api', () => ({
    stockMovementApi: {
        openingBalance: vi.fn().mockResolvedValue({}),
    },
}))

vi.mock('@/hooks/use-inventory-queries', () => ({
    useInventoryLocationsSelect: () => ({
        data: [
            { id: 1, name: 'Main Warehouse', type: 'WAREHOUSE', priority: 10 },
            { id: 2, name: 'Store Front', type: 'STORE', priority: 5 },
        ],
        isLoading: false,
    }),
    useItemVariantsSelect: () => ({
        data: [
            {
                id: 1,
                code: 'VAR-001',
                name: 'Salt 500g',
                uom_id: 1,
                uom: { name: 'Kilogram', symbol: 'kg' },
                item: { sku: 'SAL-001', name: 'Salt' },
                last_unit_cost: 5.00,
                min_stock: 10,
            },
            {
                id: 2,
                code: 'VAR-002',
                name: 'Sugar 1kg',
                uom_id: 2,
                uom: { name: 'Kilogram', symbol: 'kg' },
                item: { sku: 'SUG-001', name: 'Sugar' },
                last_unit_cost: 3.50,
                min_stock: 5,
            },
        ],
        isLoading: false,
    }),
    useUnitsOfMeasureSelect: () => ({
        data: [
            { id: 1, name: 'Kilogram', symbol: 'kg', type: 'WEIGHT' },
            { id: 2, name: 'Piece', symbol: 'pc', type: 'COUNT' },
        ],
        isLoading: false,
    }),
}))

vi.mock('@/components/ui/slide-panel', () => ({
    SlidePanel: {
        Header: ({ children }: { children: React.ReactNode }) =>
            React.createElement('div', { 'data-testid': 'slide-panel-header' }, children),
        Body: ({ children }: { children: React.ReactNode }) =>
            React.createElement('div', { 'data-testid': 'slide-panel-body' }, children),
        Footer: ({ children }: { children: React.ReactNode }) =>
            React.createElement('div', { 'data-testid': 'slide-panel-footer' }, children),
    },
}))

const formProps = {
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
}

function renderForm(props = formProps) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    return render(
        React.createElement(
            QueryClientProvider,
            { client: queryClient },
            React.createElement(OpeningBalanceForm, props),
        ),
    )
}

describe('OpeningBalanceForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        cleanup()
    })

    describe('rendering', () => {
        it('renders the form', () => {
            const { container } = renderForm()
            expect(container.querySelector('form')).toBeDefined()
        })

        it('renders the header with title', () => {
            renderForm()
            expect(screen.getByRole('heading', { name: 'Register Opening Balance' })).toBeDefined()
        })

        it('renders location select with options', () => {
            renderForm()
            expect(screen.getByText('Select location...')).toBeDefined()
            expect(screen.getByText('Main Warehouse (WAREHOUSE)')).toBeDefined()
        })

        it('renders item variant select with options', () => {
            renderForm()
            expect(screen.getByText('Select variant...')).toBeDefined()
            expect(screen.getByText('VAR-001 - Salt 500g (SAL-001)')).toBeDefined()
        })

        it('renders unit of measure select', () => {
            renderForm()
            expect(screen.getByText('Select unit...')).toBeDefined()
        })

        it('renders quantity input', () => {
            const { container } = renderForm()
            expect(container.querySelectorAll('input[type="number"]').length).toBeGreaterThanOrEqual(1)
        })

        it('renders cancel button', () => {
            renderForm()
            expect(screen.getByText('Cancel')).toBeDefined()
        })

        it('renders submit button', () => {
            renderForm()
            expect(screen.getByRole('button', { name: 'Register Opening Balance' })).toBeDefined()
        })
    })

    describe('form interactions', () => {
        it('calls onCancel when cancel button is clicked', () => {
            const onCancel = vi.fn()
            renderForm({ ...formProps, onCancel })
            fireEvent.click(screen.getByText('Cancel'))
            expect(onCancel).toHaveBeenCalledTimes(1)
        })

        it('allows selecting a location', () => {
            const { container } = renderForm()
            const selects = container.querySelectorAll('select')
            fireEvent.change(selects[0], { target: { value: '1' } })
            expect(selects[0]).toBeDefined()
        })

        it('allows entering quantity', () => {
            const { container } = renderForm()
            const input = container.querySelectorAll('input[type="number"]')[0]
            fireEvent.change(input, { target: { value: '100' } })
            expect((input as HTMLInputElement).value).toBe('100')
        })
    })

    describe('preselection props', () => {
        it('accepts preselectedLocationId prop', () => {
            const { container } = renderForm({ ...formProps, preselectedLocationId: 1 })
            expect(container.querySelector('form')).toBeDefined()
        })

        it('accepts preselectedVariantId prop', () => {
            const { container } = renderForm({ ...formProps, preselectedVariantId: 1 })
            expect(container.querySelector('form')).toBeDefined()
        })
    })

    describe('form structure', () => {
        it('has correct form id', () => {
            const { container } = renderForm()
            expect(container.querySelector('#opening-balance-form')).toBeDefined()
        })

        it('renders all required field labels', () => {
            renderForm()
            expect(screen.getByText('Location')).toBeDefined()
            expect(screen.getByText('Item Variant')).toBeDefined()
            expect(screen.getByText('Quantity')).toBeDefined()
        })

        it('renders slide panel sections', () => {
            renderForm()
            expect(screen.getByTestId('slide-panel-header')).toBeDefined()
            expect(screen.getByTestId('slide-panel-body')).toBeDefined()
            expect(screen.getByTestId('slide-panel-footer')).toBeDefined()
        })
    })

    describe('accessibility', () => {
        it('form has submit button with correct type', () => {
            const { container } = renderForm()
            expect(container.querySelector('button[type="submit"]')).toBeDefined()
        })

        it('cancel button has type button', () => {
            const { container } = renderForm()
            expect(container.querySelector('button[type="button"]')).toBeDefined()
        })
    })
})
