/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProductWizard } from '../product-wizard'

const showSuccess = vi.fn()
const showError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
    useToast: () => ({
        showSuccess,
        showError,
        showToast: vi.fn(),
        showWarning: vi.fn(),
        showInfo: vi.fn(),
        removeToast: vi.fn(),
    }),
}))

const createItem = vi.fn()
const createVariant = vi.fn()
const listLocations = vi.fn()

vi.mock('@/services/inventory-api', () => ({
    itemApi: { create: (...args: unknown[]) => createItem(...args) },
    itemVariantApi: { create: (...args: unknown[]) => createVariant(...args) },
    inventoryLocationApi: { list: (...args: unknown[]) => listLocations(...args) },
}))

const apiGet = vi.fn()
const apiPost = vi.fn()

vi.mock('@/lib/api-client', () => ({
    apiClient: {
        get: (...args: unknown[]) => apiGet(...args),
        post: (...args: unknown[]) => apiPost(...args),
    },
}))

const UNITS = [{ id: 1, code: 'KG', name: 'Kilogramo', symbol: 'kg', type: 'WEIGHT', precision: 2, is_base: true, is_active: true }]
const LOCATIONS = [{ id: 1, operating_unit_id: 1, name: 'Almacén Principal', type: 'MAIN', priority: 1, is_primary: true, is_active: true }]

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
}

describe('ProductWizard', () => {
    const onSuccess = vi.fn()
    const onCancel = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        apiGet.mockResolvedValue({ data: { data: UNITS } })
        listLocations.mockResolvedValue({ data: { data: LOCATIONS } })
    })

    afterEach(() => {
        cleanup()
    })

    // Checkbox order in Step 1 DOM: is_stocked, is_perishable, is_manufactured, is_active
    const fillStep1 = () => {
        fireEvent.change(screen.getByPlaceholderText('ej., ROLL-001'), { target: { value: 'ROLL-001' } })
        fireEvent.change(screen.getByPlaceholderText('ej., California Roll'), { target: { value: 'California Roll' } })
        fireEvent.change(screen.getByPlaceholderText('Descripción detallada del producto'), { target: { value: 'Rico' } })
        fireEvent.change(screen.getByDisplayValue('Producto Terminado'), { target: { value: 'INSUMO' } })
        const checkboxes = screen.getAllByRole('checkbox')
        fireEvent.click(checkboxes[1]!) // is_perishable
        fireEvent.click(checkboxes[2]!) // is_manufactured
        fireEvent.click(checkboxes[3]!) // is_active
    }

    it('walks through the full wizard and creates a product with stock', async () => {
        createItem.mockResolvedValue({ data: { data: { id: 100 } } })
        createVariant.mockResolvedValue({ data: { data: { id: 200 } } })
        apiPost.mockResolvedValue({ data: {} })

        render(<ProductWizard onSuccess={onSuccess} onCancel={onCancel} />, { wrapper: createWrapper() })

        await waitFor(() => expect(apiGet).toHaveBeenCalled())
        await fillStep1()

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
        })
        await waitFor(() => expect(createItem).toHaveBeenCalled())
        expect(showSuccess).toHaveBeenCalledWith('Producto creado exitosamente', 'Paso 1 Completo')

        // Step 2: Variant
        await waitFor(() => expect(screen.getByText('Variante del Producto')).toBeDefined())
        fireEvent.change(screen.getByPlaceholderText('ej., ROLL-001-8PZ'), { target: { value: 'ROLL-001-8PZ' } })
        fireEvent.change(screen.getByPlaceholderText('ej., California Roll 8 piezas'), { target: { value: 'California Roll 8pz' } })
        fireEvent.change(screen.getByDisplayValue('Seleccione una unidad'), { target: { value: '1' } })
        fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '55.5' } })

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
        })
        await waitFor(() => expect(createVariant).toHaveBeenCalled())
        expect(showSuccess).toHaveBeenCalledWith('Variante creada exitosamente', 'Paso 2 Completo')

        // Step 3: Conversions
        await waitFor(() => expect(screen.getByText('Conversiones de Unidad')).toBeDefined())
        fireEvent.click(screen.getByText('+ Agregar Conversión'))
        const conversionSelects = screen.getAllByDisplayValue('Seleccione')
        fireEvent.change(conversionSelects[0]!, { target: { value: '1' } }) // from_uom_id
        fireEvent.change(conversionSelects[1]!, { target: { value: '1' } }) // to_uom_id
        fireEvent.change(screen.getByPlaceholderText('1.0'), { target: { value: '2' } })

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
        })
        await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/uom-conversions', expect.objectContaining({ factor: 2 })))

        // Step 4: Opening balances
        await waitFor(() => expect(screen.getByText('Existencias Iniciales')).toBeDefined())
        fireEvent.click(screen.getByText('+ Agregar Ubicación'))
        fireEvent.change(screen.getByDisplayValue('Seleccione ubicación'), { target: { value: '1' } })
        // uom_id is auto-filled from the variant's uom_id, no need to select it
        // Step 4 has two '0.00' placeholders (Cantidad, Costo Unitario) — take the first (Cantidad)
        fireEvent.change(screen.getAllByPlaceholderText('0.00')[0]!, { target: { value: '10' } })

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /finalizar/i }))
        })

        await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/inventory/opening-balance', expect.objectContaining({ item_variant_id: 200 })))
        expect(onSuccess).toHaveBeenCalled()
    })

    it('shows validation errors when item creation fails', async () => {
        createItem.mockRejectedValue(new Error('boom'))

        render(<ProductWizard onSuccess={onSuccess} onCancel={onCancel} />, { wrapper: createWrapper() })

        await waitFor(() => expect(apiGet).toHaveBeenCalled())
        await fillStep1()

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
        })

        await waitFor(() => expect(showError).toHaveBeenCalledWith('boom', 'Error'))
        expect(screen.getByText('Datos del Producto')).toBeDefined()
    })

    it('shows validation errors when variant creation fails', async () => {
        createItem.mockResolvedValue({ data: { data: { id: 100 } } })
        createVariant.mockRejectedValue(new Error('variant boom'))

        render(<ProductWizard onSuccess={onSuccess} onCancel={onCancel} />, { wrapper: createWrapper() })

        await waitFor(() => expect(apiGet).toHaveBeenCalled())
        await fillStep1()

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
        })
        await waitFor(() => expect(screen.getByText('Variante del Producto')).toBeDefined())

        fireEvent.change(screen.getByPlaceholderText('ej., ROLL-001-8PZ'), { target: { value: 'ROLL-001-8PZ' } })
        fireEvent.change(screen.getByPlaceholderText('ej., California Roll 8 piezas'), { target: { value: 'California Roll 8pz' } })
        fireEvent.change(screen.getByDisplayValue('Seleccione una unidad'), { target: { value: '1' } })
        fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '55.5' } })

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
        })

        await waitFor(() => expect(showError).toHaveBeenCalledWith('variant boom', 'Error'))
        expect(screen.getByText('Variante del Producto')).toBeDefined()
    })

    it('removes a conversion and an opening balance while keeping the remaining values', async () => {
        createItem.mockResolvedValue({ data: { data: { id: 100 } } })
        createVariant.mockResolvedValue({ data: { data: { id: 200 } } })
        apiPost.mockResolvedValue({ data: {} })

        render(<ProductWizard onSuccess={onSuccess} onCancel={onCancel} />, { wrapper: createWrapper() })

        await waitFor(() => expect(apiGet).toHaveBeenCalled())
        await fillStep1()

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
        })
        await waitFor(() => expect(createItem).toHaveBeenCalled())

        await waitFor(() => expect(screen.getByText('Variante del Producto')).toBeDefined())
        fireEvent.change(screen.getByPlaceholderText('ej., ROLL-001-8PZ'), { target: { value: 'ROLL-001-8PZ' } })
        fireEvent.change(screen.getByPlaceholderText('ej., California Roll 8 piezas'), { target: { value: 'California Roll 8pz' } })
        fireEvent.change(screen.getByDisplayValue('Seleccione una unidad'), { target: { value: '1' } })
        fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '55.5' } })

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
        })
        await waitFor(() => expect(createVariant).toHaveBeenCalled())

        // Step 3: add two conversions, remove the first, keep the second's value
        await waitFor(() => expect(screen.getByText('Conversiones de Unidad')).toBeDefined())
        fireEvent.click(screen.getByText('+ Agregar Conversión'))
        fireEvent.change(screen.getByPlaceholderText('1.0'), { target: { value: '2' } })

        fireEvent.click(screen.getByText('+ Agregar Conversión'))
        const conversionSelects = screen.getAllByDisplayValue('Seleccione')
        fireEvent.change(conversionSelects[2]!, { target: { value: '1' } }) // second conversion from_uom_id
        fireEvent.change(conversionSelects[3]!, { target: { value: '1' } }) // second conversion to_uom_id
        fireEvent.change(screen.getAllByPlaceholderText('1.0')[1]!, { target: { value: '3' } })

        fireEvent.click(screen.getAllByText('Eliminar')[0]!)

        const remainingFactorInputs = screen.getAllByPlaceholderText('1.0')
        expect(remainingFactorInputs.length).toBe(1)
        expect((remainingFactorInputs[0] as HTMLInputElement).value).toBe('3')

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
        })

        // Step 4: add two opening balances, remove the first, keep the second's quantity
        await waitFor(() => expect(screen.getByText('Existencias Iniciales')).toBeDefined())
        fireEvent.click(screen.getByText('+ Agregar Ubicación'))
        fireEvent.change(screen.getAllByPlaceholderText('0.00')[0]!, { target: { value: '10' } })

        fireEvent.click(screen.getByText('+ Agregar Ubicación'))
        fireEvent.change(screen.getAllByPlaceholderText('0.00')[2]!, { target: { value: '20' } })

        fireEvent.click(screen.getAllByText('Eliminar')[0]!)

        const remainingQuantityInputs = screen.getAllByPlaceholderText('0.00')
        expect(remainingQuantityInputs.length).toBe(2)
        expect((remainingQuantityInputs[0] as HTMLInputElement).value).toBe('20')
    })

    it('shows an error when registering the opening balance fails', async () => {
        createItem.mockResolvedValue({ data: { data: { id: 100 } } })
        createVariant.mockResolvedValue({ data: { data: { id: 200 } } })
        apiPost.mockImplementation((url: string) => {
            if (url === '/inventory/opening-balance') {
                return Promise.reject(new Error('balance boom'))
            }
            return Promise.resolve({ data: {} })
        })

        render(<ProductWizard onSuccess={onSuccess} onCancel={onCancel} />, { wrapper: createWrapper() })

        await waitFor(() => expect(apiGet).toHaveBeenCalled())
        await fillStep1()
        fireEvent.click(screen.getAllByRole('checkbox')[0]!) // toggle is_stocked off

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
        })
        await waitFor(() => expect(screen.getByText('Variante del Producto')).toBeDefined())

        fireEvent.change(screen.getByPlaceholderText('ej., ROLL-001-8PZ'), { target: { value: 'ROLL-001-8PZ' } })
        fireEvent.change(screen.getByPlaceholderText('ej., California Roll 8 piezas'), { target: { value: 'California Roll 8pz' } })
        fireEvent.change(screen.getByDisplayValue('Seleccione una unidad'), { target: { value: '1' } })
        fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '55.5' } })

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
        })

        // is_stocked was toggled off in step 1, so the conversions step has nothing to submit —
        // one more "Siguiente" click is needed to reach the balances step
        await waitFor(() => expect(screen.getByText('Conversiones de Unidad')).toBeDefined())
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
        })

        await waitFor(() => expect(screen.getByText('Existencias Iniciales')).toBeDefined())
        fireEvent.click(screen.getByText('+ Agregar Ubicación'))
        fireEvent.change(screen.getByDisplayValue('Seleccione ubicación'), { target: { value: '1' } })
        // uom_id is auto-filled from the variant's uom_id, no need to select it
        // Step 4 has two '0.00' placeholders (Cantidad, Costo Unitario) — take the first (Cantidad)
        fireEvent.change(screen.getAllByPlaceholderText('0.00')[0]!, { target: { value: '10' } })

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /finalizar/i }))
        })

        await waitFor(() => expect(showError).toHaveBeenCalledWith('balance boom', 'Error'))
    })
})
