/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VariantDetails } from '../variant-details'
import type { ItemVariant } from '@/types/inventory'

// Mock stockApi
vi.mock('@/services/inventory-api', () => ({
    stockApi: {
        byVariant: vi.fn().mockResolvedValue({
            data: {
                data: {
                    on_hand: 100,
                    reserved: 10,
                    available: 90,
                },
            },
        }),
    },
}))

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
}

describe('VariantDetails', () => {
    const mockVariant: ItemVariant = {
        id: 'variant-01',
        item_id: 1,
        code: 'VAR-001',
        name: 'Test Variant',
        uom_id: 1,
        avg_unit_cost: 25.5,
        last_unit_cost: 26.0,
        is_active: true,
        item: {
            id: 1,
            sku: 'SKU-001',
            name: 'Test Item',
            type: 'PRODUCTO',
            is_stocked: true,
            is_perishable: false,
            is_active: true,
        },
        uom: {
            id: '01UOM',
            code: 'KG',
            name: 'Kilogramo',
            symbol: 'kg',
            type: 'WEIGHT',
            precision: 2,
            is_base: true,
            is_active: true,
        },
        created_at: '2025-01-15T00:00:00+00:00',
        updated_at: '2025-01-15T00:00:00+00:00',
    }

    const mockOnEdit = vi.fn()
    const mockOnDelete = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        cleanup()
    })

    it('renders variant code', () => {
        render(
            <VariantDetails
                variant={mockVariant}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('VAR-001')).toBeDefined()
    })

    it('renders variant name', () => {
        render(
            <VariantDetails
                variant={mockVariant}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Test Variant')).toBeDefined()
    })

    it('displays active status when variant is active', () => {
        render(
            <VariantDetails
                variant={mockVariant}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Active')).toBeDefined()
    })

    it('displays inactive status when variant is inactive', () => {
        const inactiveVariant = { ...mockVariant, is_active: false }

        render(
            <VariantDetails
                variant={inactiveVariant}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Inactive')).toBeDefined()
    })

    it('displays item name when item is present', () => {
        render(
            <VariantDetails
                variant={mockVariant}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Test Item (SKU-001)')).toBeDefined()
    })

    it('renders Variant Details header', () => {
        render(
            <VariantDetails
                variant={mockVariant}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Variant Details')).toBeDefined()
    })

    it('renders without crashing', () => {
        const { container } = render(
            <VariantDetails
                variant={mockVariant}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() },
        )

        expect(container).toBeDefined()
    })
})
