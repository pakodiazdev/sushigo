/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ItemDetails } from '../item-details'
import type { Item } from '@/types/inventory'

// Mock itemVariantApi
vi.mock('@/services/inventory-api', () => ({
    itemVariantApi: {
        list: vi.fn().mockResolvedValue({
            data: {
                data: [
                    { id: 'v1', name: 'Variant 1' },
                    { id: 'v2', name: 'Variant 2' },
                ],
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

describe('ItemDetails', () => {
    const mockItem: Item = {
        id: 1,
        sku: 'SKU-001',
        name: 'Test Item',
        description: 'Test description',
        type: 'PRODUCTO',
        is_stocked: true,
        is_perishable: false,
        is_manufactured: false,
        is_active: true,
        created_at: '2025-01-15T00:00:00+00:00',
        updated_at: '2025-01-15T00:00:00+00:00',
    }

    const mockOnEdit = vi.fn()
    const mockOnDelete = vi.fn()
    const mockOnViewVariants = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        cleanup()
    })

    it('renders item SKU', async () => {
        render(
            <ItemDetails
                item={mockItem}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                onViewVariants={mockOnViewVariants}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('SKU-001')).toBeDefined()
    })

    it('shows Active badge for active item', async () => {
        render(
            <ItemDetails
                item={mockItem}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                onViewVariants={mockOnViewVariants}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Active')).toBeDefined()
    })

    it('shows Inactive badge for inactive item', async () => {
        const inactiveItem = { ...mockItem, is_active: false }

        render(
            <ItemDetails
                item={inactiveItem}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                onViewVariants={mockOnViewVariants}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Inactive')).toBeDefined()
    })

    it('displays type badge with correct label for PRODUCTO', async () => {
        render(
            <ItemDetails
                item={mockItem}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                onViewVariants={mockOnViewVariants}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Producto')).toBeDefined()
    })

    it('displays type badge with correct label for INSUMO', async () => {
        const insumoItem: Item = { ...mockItem, type: 'INSUMO' }

        render(
            <ItemDetails
                item={insumoItem}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                onViewVariants={mockOnViewVariants}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Insumo')).toBeDefined()
    })

    it('displays type badge with correct label for ACTIVO', async () => {
        const activoItem: Item = { ...mockItem, type: 'ACTIVO' }

        render(
            <ItemDetails
                item={activoItem}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                onViewVariants={mockOnViewVariants}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Activo')).toBeDefined()
    })

    it('displays variants count', async () => {
        render(
            <ItemDetails
                item={mockItem}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                onViewVariants={mockOnViewVariants}
            />,
            { wrapper: createWrapper() },
        )

        // Wait for the query to resolve
        await waitFor(() => {
            expect(screen.getByText('2')).toBeDefined()
        })
    })

    it('calls onViewVariants when View Variants button is clicked', async () => {
        render(
            <ItemDetails
                item={mockItem}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                onViewVariants={mockOnViewVariants}
            />,
            { wrapper: createWrapper() },
        )

        // Wait for variants to load and button to appear
        await waitFor(() => {
            const viewButton = screen.getByRole('button', { name: /view variants/i })
            expect(viewButton).toBeDefined()
        })

        const viewButton = screen.getByRole('button', { name: /view variants/i })
        fireEvent.click(viewButton)

        expect(mockOnViewVariants).toHaveBeenCalled()
    })

    it('displays description when provided', async () => {
        render(
            <ItemDetails
                item={mockItem}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                onViewVariants={mockOnViewVariants}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Test description')).toBeDefined()
    })

    it('shows inventory tracking enabled for stocked item', async () => {
        render(
            <ItemDetails
                item={mockItem}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                onViewVariants={mockOnViewVariants}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Inventory Tracking')).toBeDefined()
        expect(screen.getByText('Enabled')).toBeDefined()
    })

    it('shows perishable indicator correctly', async () => {
        const perishableItem = { ...mockItem, is_perishable: true }

        render(
            <ItemDetails
                item={perishableItem}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                onViewVariants={mockOnViewVariants}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Perishable')).toBeDefined()
        expect(screen.getByText('Yes')).toBeDefined()
    })
})
