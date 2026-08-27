/**
 * @vitest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { createElement, type ComponentProps, type ReactNode } from 'react'
import { ItemForm } from '../item-form'

const mockMutateAsync = vi.hoisted(() => vi.fn().mockResolvedValue({}))
const mockClearValidationErrors = vi.hoisted(() => vi.fn())
const nextSku = vi.hoisted(() => vi.fn().mockResolvedValue({ data: { sku: 'SUG-001', prefix: 'SUG-' } }))

// Mock useCreateUpdateMutation — the form drives it via `mutation.mutateAsync` so it can
// catch the 422 SKU-collision body; `execute` is kept for shape parity but unused.
vi.mock('@/hooks/use-form-mutation', () => ({
    useCreateUpdateMutation: (config: {
        createFn: (v: unknown) => Promise<unknown>
        updateFn: (v: unknown) => Promise<unknown>
        isEditing: boolean
        onSuccess: () => void
    }) => ({
        mutation: {
            mutateAsync: async (values: unknown) => {
                const result = await mockMutateAsync(values, config)
                config.onSuccess()
                return result
            },
            error: null,
        },
        execute: mockMutateAsync,
        validationErrors: {},
        clearValidationErrors: mockClearValidationErrors,
        isPending: false,
    }),
}))

vi.mock('@/services/inventory-api', () => ({
    itemApi: {
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        nextSku,
    },
}))

vi.mock('@/lib/api-error', () => ({
    isApiError: (error: unknown) => Boolean(error && typeof error === 'object' && 'response' in error),
}))

// Mock SlidePanel components
vi.mock('@/components/ui/slide-panel', () => ({
    SlidePanel: {
        Body: ({ children, className }: { children: React.ReactNode; className?: string }) => (
            <div data-testid="slide-panel-body" className={className}>
                {children}
            </div>
        ),
        Footer: ({ children, className }: { children: React.ReactNode; className?: string }) => (
            <div data-testid="slide-panel-footer" className={className}>
                {children}
            </div>
        ),
    },
}))

// Mock MediaGalleryUploader — its own behavior is covered by
// src/components/media/__tests__/*; here we only need to verify item-form
// wires its onChange/onBusyChange callbacks into the form's state.
vi.mock('@/components/media', () => ({
    MediaGalleryUploader: ({
        disabled,
        onChange,
        onBusyChange,
    }: {
        disabled?: boolean
        onChange?: (galleryId?: string, ownerToken?: string) => void
        onBusyChange?: (isBusy: boolean) => void
    }) => (
        <>
            <span data-testid="media-gallery-uploader-disabled-stub">{String(!!disabled)}</span>
            <button
                type="button"
                data-testid="media-gallery-uploader-stub"
                onClick={() => onChange?.('gallery-123', 'owner-token-123')}
            >
                Simulate upload
            </button>
            <button
                type="button"
                data-testid="media-gallery-uploader-busy-stub"
                onClick={() => onBusyChange?.(true)}
            >
                Simulate upload in progress
            </button>
        </>
    ),
}))

const defaultProps = {
    item: null,
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
}

function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return createElement(QueryClientProvider, { client }, children)
}

const renderForm = (props: Partial<ComponentProps<typeof ItemForm>> = {}) =>
    render(<ItemForm {...defaultProps} {...props} />, { wrapper })

const editingItem = {
    id: 1,
    sku: 'SAL-001',
    name: 'Salt',
    description: '',
    type: 'INSUMO' as const,
    is_stocked: true,
    is_perishable: false,
    is_active: true,
    created_at: '',
    updated_at: '',
}

describe('ItemForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockMutateAsync.mockResolvedValue({})
        nextSku.mockResolvedValue({ data: { sku: 'SUG-001', prefix: 'SUG-' } })
    })

    afterEach(() => {
        cleanup()
    })

    describe('rendering', () => {
        it('renders the form', () => {
            const { container } = renderForm()
            expect(container.querySelector('form')).toBeDefined()
        })

        it('renders SKU field', () => {
            const { getByPlaceholderText } = renderForm()
            expect(getByPlaceholderText('e.g., SAL-001')).toBeDefined()
        })

        it('renders item name field', () => {
            const { container } = renderForm()
            expect(container.querySelectorAll('input').length).toBeGreaterThan(0)
        })

        it('does not render a Type selector', () => {
            const { queryByText } = renderForm()
            expect(queryByText('Type')).toBeNull()
        })

        it('renders cancel button', () => {
            const { getByText } = renderForm()
            expect(getByText('Cancel')).toBeDefined()
        })

        it('renders save button for new item', () => {
            const { getByText } = renderForm()
            expect(getByText('Create Item')).toBeDefined()
        })

        it('renders update button when editing', () => {
            const { getByText } = renderForm({ item: editingItem })
            expect(getByText('Update Item')).toBeDefined()
        })
    })

    describe('SKU suggestion affordances', () => {
        it('shows the Spanish auto-suggestion hint in create mode', () => {
            const { getByText } = renderForm()
            expect(getByText(/Sugerencia automática a partir del nombre/)).toBeDefined()
        })

        it('renders a "Regenerar SKU" control in create mode', () => {
            const { getByLabelText } = renderForm()
            expect(getByLabelText('Regenerar SKU')).toBeDefined()
        })

        it('does not render the regenerate control when editing', () => {
            const { queryByLabelText } = renderForm({ item: editingItem })
            expect(queryByLabelText('Regenerar SKU')).toBeNull()
        })

        it('prefills the SKU field with the server suggestion once a name is typed', async () => {
            const { getByPlaceholderText } = renderForm()
            const skuInput = getByPlaceholderText('e.g., SAL-001') as HTMLInputElement
            const nameInput = getByPlaceholderText('e.g., Fresh Salmon')

            fireEvent.change(nameInput, { target: { value: 'Salmón fresco' } })

            await waitFor(() => expect(nextSku).toHaveBeenCalledWith({ name: 'Salmón fresco' }))
            await waitFor(() => expect(skuInput.value).toBe('SUG-001'))
        })

        it('surfaces a Spanish collision alert and keeps a manually chosen SKU on a race', async () => {
            mockMutateAsync.mockRejectedValueOnce({
                response: { data: { rejected_sku: 'MINE-1', suggested_sku: 'SUG-002' } },
            })
            const { getByPlaceholderText, container, findByText } = renderForm()
            const skuInput = getByPlaceholderText('e.g., SAL-001') as HTMLInputElement

            fireEvent.change(skuInput, { target: { value: 'MINE-1' } })
            fireEvent.change(getByPlaceholderText('e.g., Fresh Salmon'), { target: { value: 'Salmón' } })
            fireEvent.submit(container.querySelector('form')!)

            expect(await findByText(/acaba de ser utilizado/)).toBeDefined()
            // Manual value preserved; an explicit "use this instead" action is offered.
            expect(skuInput.value).toBe('MINE-1')
            const applyButton = await findByText('Usar SUG-002')
            fireEvent.click(applyButton)
            await waitFor(() => expect(skuInput.value).toBe('SUG-002'))
        })
    })

    describe('edit mode', () => {
        it('disables SKU field when editing', () => {
            const { getByPlaceholderText } = renderForm({ item: editingItem })
            expect((getByPlaceholderText('e.g., SAL-001') as HTMLInputElement).disabled).toBe(true)
        })

        it('does not render the MediaGalleryUploader while editing', () => {
            const { queryByTestId } = renderForm({ item: editingItem })
            expect(queryByTestId('media-gallery-uploader-stub')).toBeNull()
        })

        it('shows an explanatory note in place of the uploader', () => {
            const { getByText } = renderForm({ item: editingItem })
            expect(getByText(/Photo management for existing items isn.t available yet/)).toBeDefined()
        })

        it('does not request a SKU suggestion in edit mode', async () => {
            renderForm({ item: editingItem })
            await new Promise((r) => setTimeout(r, 50))
            expect(nextSku).not.toHaveBeenCalled()
        })
    })

    describe('form structure', () => {
        it('renders SlidePanel.Body component', () => {
            const { getByTestId } = renderForm()
            expect(getByTestId('slide-panel-body')).toBeDefined()
        })

        it('renders SlidePanel.Footer component', () => {
            const { getByTestId } = renderForm()
            expect(getByTestId('slide-panel-footer')).toBeDefined()
        })
    })

    describe('form submission', () => {
        it('submits on a valid create', async () => {
            const { getByPlaceholderText, container } = renderForm()

            fireEvent.change(getByPlaceholderText('e.g., SAL-001'), { target: { value: 'SA-001' } })
            fireEvent.change(getByPlaceholderText('e.g., Fresh Salmon'), { target: { value: 'Salt Item' } })
            fireEvent.submit(container.querySelector('form')!)

            await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled())
        })

        it('submits new items with type INSUMO by default', async () => {
            const { getByPlaceholderText, container } = renderForm()

            fireEvent.change(getByPlaceholderText('e.g., SAL-001'), { target: { value: 'SA-001' } })
            fireEvent.change(getByPlaceholderText('e.g., Fresh Salmon'), { target: { value: 'Salt Item' } })
            fireEvent.submit(container.querySelector('form')!)

            await waitFor(() =>
                expect(mockMutateAsync).toHaveBeenCalledWith(
                    expect.objectContaining({ type: 'INSUMO' }),
                    expect.anything(),
                ),
            )
        })

        it('submits on a valid update', async () => {
            const { container } = renderForm({ item: { ...editingItem, name: 'Salt Item' } })
            fireEvent.submit(container.querySelector('form')!)
            await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1))
        })

        it('preserves an existing ACTIVO item type unchanged on update', async () => {
            const item = { ...editingItem, sku: 'ACT-001', name: 'Rice Cooker', type: 'ACTIVO' as const, is_stocked: false }
            const { container } = renderForm({ item })
            fireEvent.submit(container.querySelector('form')!)

            await waitFor(() =>
                expect(mockMutateAsync).toHaveBeenCalledWith(
                    expect.objectContaining({ type: 'ACTIVO' }),
                    expect.anything(),
                ),
            )
        })
    })

    describe('media gallery wiring', () => {
        it('renders the MediaGalleryUploader', () => {
            const { getByTestId } = renderForm()
            expect(getByTestId('media-gallery-uploader-stub')).toBeDefined()
        })

        it('includes media_gallery_id and owner_token in the submitted payload once the uploader reports them', async () => {
            const { getByPlaceholderText, getByTestId, container } = renderForm()

            fireEvent.change(getByPlaceholderText('e.g., SAL-001'), { target: { value: 'SA-001' } })
            fireEvent.change(getByPlaceholderText('e.g., Fresh Salmon'), { target: { value: 'Salt Item' } })
            fireEvent.click(getByTestId('media-gallery-uploader-stub'))
            fireEvent.submit(container.querySelector('form')!)

            await waitFor(() =>
                expect(mockMutateAsync).toHaveBeenCalledWith(
                    expect.objectContaining({ media_gallery_id: 'gallery-123', owner_token: 'owner-token-123' }),
                    expect.anything(),
                ),
            )
        })

        it('disables the submit button while the uploader reports it is busy', async () => {
            const { getByTestId, getByText } = renderForm()

            fireEvent.click(getByTestId('media-gallery-uploader-busy-stub'))

            await waitFor(() => {
                const submitButton = getByText('Create Item').closest('button') as HTMLButtonElement
                expect(submitButton.disabled).toBe(true)
            })
        })

        it('does not submit while the uploader is busy, even if the form is otherwise valid', async () => {
            const { getByPlaceholderText, getByTestId, container } = renderForm()

            fireEvent.change(getByPlaceholderText('e.g., SAL-001'), { target: { value: 'SA-001' } })
            fireEvent.change(getByPlaceholderText('e.g., Fresh Salmon'), { target: { value: 'Salt Item' } })
            fireEvent.click(getByTestId('media-gallery-uploader-busy-stub'))

            await waitFor(() => {
                const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement
                expect(submitButton.disabled).toBe(true)
            })

            fireEvent.submit(container.querySelector('form')!)
            expect(mockMutateAsync).not.toHaveBeenCalled()
        })

        it('passes disabled=false to the uploader while the form is idle', () => {
            const { getByTestId } = renderForm()
            expect(getByTestId('media-gallery-uploader-disabled-stub').textContent).toBe('false')
        })
    })
})
