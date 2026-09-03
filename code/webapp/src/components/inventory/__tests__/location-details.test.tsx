/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LocationDetails } from '../location-details'
import type { InventoryLocation } from '@/types/inventory'

// Mock stockApi
vi.mock('@/services/inventory-api', () => ({
    stockApi: {
        byLocation: vi.fn().mockResolvedValue({
            data: {
                data: {
                    summary: {
                        total_variants: 15,
                        total_on_hand: 100,
                        total_reserved: 10,
                        total_available: 90,
                        total_inventory_value: 2500.50,
                    },
                    items: [],
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

describe('LocationDetails', () => {
    const mockLocation: InventoryLocation = {
        id: 'location-01',
        operating_unit_id: 1,
        name: 'Main Warehouse',
        type: 'MAIN',
        priority: 1,
        is_primary: true,
        is_active: true,
        can_receive_purchases: true,
        notes: 'Primary storage location',
        operating_unit: {
            id: 1,
            name: 'Central Unit',
            type: 'BRANCH_MAIN',
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

    it('renders location type', () => {
        render(
            <LocationDetails
                location={mockLocation}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('MAIN')).toBeDefined()
    })

    it('displays operating unit name', () => {
        render(
            <LocationDetails
                location={mockLocation}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Central Unit')).toBeDefined()
    })

    it('displays priority', () => {
        render(
            <LocationDetails
                location={mockLocation}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('1')).toBeDefined()
    })

    it('displays Location Information header', () => {
        render(
            <LocationDetails
                location={mockLocation}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Location Information')).toBeDefined()
    })

    it('shows the receiving capability as "Sí" when the location can receive purchases', () => {
        render(
            <LocationDetails
                location={mockLocation}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Puede recibir compras')).toBeDefined()
        expect(screen.getByText('Sí')).toBeDefined()
    })

    it('shows the receiving capability as "No" when the location cannot receive purchases', () => {
        render(
            <LocationDetails
                location={{ ...mockLocation, can_receive_purchases: false }}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('Puede recibir compras')).toBeDefined()
        expect(screen.getByText('No')).toBeDefined()
    })

    it('shows N/A when operating unit is missing', () => {
        const locationWithoutOU: InventoryLocation = {
            ...mockLocation,
            operating_unit: undefined,
        }

        render(
            <LocationDetails
                location={locationWithoutOU}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() },
        )

        expect(screen.getByText('N/A')).toBeDefined()
    })

    it('renders component without crashing', () => {
        const { container } = render(
            <LocationDetails
                location={mockLocation}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />,
            { wrapper: createWrapper() },
        )

        expect(container).toBeDefined()
    })
})
