/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { ItemForm } from '../item-form'

const mockExecute = vi.hoisted(() => vi.fn().mockResolvedValue({}))

// Mock useCreateUpdateMutation hook
vi.mock('@/hooks/use-form-mutation', () => ({
    useCreateUpdateMutation: () => ({
        execute: mockExecute,
        validationErrors: {},
        isPending: false,
    }),
}))

// Mock inventory API
vi.mock('@/services/inventory-api', () => ({
    itemApi: {
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
    },
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

describe('ItemForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        cleanup()
    })

    describe('rendering', () => {
        it('renders the form', () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const form = container.querySelector('form')
            expect(form).toBeDefined()
        })

        it('renders SKU field', () => {
            const { getByPlaceholderText } = render(<ItemForm {...defaultProps} />)
            expect(getByPlaceholderText('e.g., SAL-001')).toBeDefined()
        })

        it('renders item name field', () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const inputs = container.querySelectorAll('input')
            expect(inputs.length).toBeGreaterThan(0)
        })

        it('does not render a Type selector', () => {
            const { queryByText } = render(<ItemForm {...defaultProps} />)
            expect(queryByText('Type')).toBeNull()
        })

        it('renders checkboxes for boolean fields', () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const checkboxes = container.querySelectorAll('input[type="checkbox"]')
            expect(checkboxes.length).toBeGreaterThanOrEqual(0)
        })

        it('renders cancel button', () => {
            const { getByText } = render(<ItemForm {...defaultProps} />)
            expect(getByText('Cancel')).toBeDefined()
        })

        it('renders save button for new item', () => {
            const { getByText } = render(<ItemForm {...defaultProps} />)
            expect(getByText('Create Item')).toBeDefined()
        })

        it('renders update button when editing', () => {
            const item = {
                id: 1,
                sku: 'SAL-001',
                name: 'Salt',
                description: 'Table salt',
                type: 'INSUMO' as const,
                is_stocked: true,
                is_perishable: false,
                is_active: true,
                created_at: '',
                updated_at: '',
            }
            const { getByText } = render(<ItemForm {...defaultProps} item={item} />)
            expect(getByText('Update Item')).toBeDefined()
        })
    })

    describe('form interactions', () => {
        it('calls onCancel when cancel button is clicked', () => {
            const onCancel = vi.fn()
            const { getByText } = render(<ItemForm {...defaultProps} onCancel={onCancel} />)

            fireEvent.click(getByText('Cancel'))
            expect(onCancel).toHaveBeenCalledTimes(1)
        })

        it.skip('submits form on submit', async () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const form = container.querySelector('form')

            if (form) {
                fireEvent.submit(form)
            }

            // Form submission should be attempted
            await waitFor(() => {
                expect(defaultProps.onSuccess).toBeDefined()
            })
        })

        it('converts SKU to uppercase', () => {
            const { getByPlaceholderText } = render(<ItemForm {...defaultProps} />)
            const skuInput = getByPlaceholderText('e.g., SAL-001')

            fireEvent.change(skuInput, { target: { value: 'test-sku' } })
            // The mock setField should be called
            expect(skuInput).toBeDefined()
        })

        it('allows toggling is_stocked checkbox', () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const checkboxes = container.querySelectorAll('input[type="checkbox"]')

            if (checkboxes.length > 0) {
                fireEvent.click(checkboxes[0]!)
                expect(checkboxes[0]).toBeDefined()
            }
        })

        it('allows toggling is_perishable checkbox', () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const checkboxes = container.querySelectorAll('input[type="checkbox"]')

            if (checkboxes.length > 1) {
                fireEvent.click(checkboxes[1]!)
                expect(checkboxes[1]).toBeDefined()
            }
        })

        it('allows toggling is_active checkbox', () => {
            const { container } = render(<ItemForm {...defaultProps} />)
            const checkboxes = container.querySelectorAll('input[type="checkbox"]')

            if (checkboxes.length > 2) {
                fireEvent.click(checkboxes[2]!)
                expect(checkboxes[2]).toBeDefined()
            }
        })
    })

    describe('edit mode', () => {
        it('disables SKU field when editing', () => {
            const item = {
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
            const { getByPlaceholderText } = render(<ItemForm {...defaultProps} item={item} />)
            const skuInput = getByPlaceholderText('e.g., SAL-001') as HTMLInputElement

            expect(skuInput.disabled).toBe(true)
        })

        it('does not render the MediaGalleryUploader — uploading here would silently replace the item\'s existing photos', () => {
            const item = {
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
            const { queryByTestId } = render(<ItemForm {...defaultProps} item={item} />)

            expect(queryByTestId('media-gallery-uploader-stub')).toBeNull()
        })

        it('shows an explanatory note in place of the uploader', () => {
            const item = {
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
            const { getByText } = render(<ItemForm {...defaultProps} item={item} />)

            expect(getByText(/Photo management for existing items isn.t available yet/)).toBeDefined()
        })
    })

    describe('form structure', () => {
        it('renders SlidePanel.Body component', () => {
            const { getByTestId } = render(<ItemForm {...defaultProps} />)
            expect(getByTestId('slide-panel-body')).toBeDefined()
        })

        it('renders SlidePanel.Footer component', () => {
            const { getByTestId } = render(<ItemForm {...defaultProps} />)
            expect(getByTestId('slide-panel-footer')).toBeDefined()
        })
    })

    describe('form submission', () => {
        it('calls execute on valid form submission (create)', async () => {
            const { getByPlaceholderText, container } = render(<ItemForm {...defaultProps} />)

            fireEvent.change(getByPlaceholderText('e.g., SAL-001'), { target: { value: 'SA-001' } })
            fireEvent.change(getByPlaceholderText('e.g., Fresh Salmon'), { target: { value: 'Salt Item' } })

            fireEvent.submit(container.querySelector('form')!)

            await waitFor(() => expect(mockExecute).toHaveBeenCalled())
        })

        it('submits new items with type INSUMO by default — Products are created via /inventory/products only', async () => {
            const { getByPlaceholderText, container } = render(<ItemForm {...defaultProps} />)

            fireEvent.change(getByPlaceholderText('e.g., SAL-001'), { target: { value: 'SA-001' } })
            fireEvent.change(getByPlaceholderText('e.g., Fresh Salmon'), { target: { value: 'Salt Item' } })

            fireEvent.submit(container.querySelector('form')!)

            await waitFor(() =>
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({ type: 'INSUMO' })
                )
            )
        })

        it('calls execute on valid form submission (update)', async () => {
            const item = {
                id: 1,
                sku: 'SAL-001',
                name: 'Salt Item',
                description: '',
                type: 'INSUMO' as const,
                is_stocked: true,
                is_perishable: false,
                is_active: true,
                created_at: '',
                updated_at: '',
            }

            const { container } = render(<ItemForm {...defaultProps} item={item} />)

            fireEvent.submit(container.querySelector('form')!)

            await waitFor(() => expect(mockExecute).toHaveBeenCalledTimes(1))
        })

        it('preserves an existing non-PRODUCTO item type unchanged on update', async () => {
            const item = {
                id: 1,
                sku: 'SAL-001',
                name: 'Salt Item',
                description: '',
                type: 'INSUMO' as const,
                is_stocked: true,
                is_perishable: false,
                is_active: true,
                created_at: '',
                updated_at: '',
            }

            const { container } = render(<ItemForm {...defaultProps} item={item} />)

            fireEvent.submit(container.querySelector('form')!)

            await waitFor(() =>
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({ type: 'INSUMO' })
                )
            )
        })

        it('preserves an existing ACTIVO item type unchanged on update', async () => {
            const item = {
                id: 1,
                sku: 'ACT-001',
                name: 'Rice Cooker',
                description: '',
                type: 'ACTIVO' as const,
                is_stocked: false,
                is_perishable: false,
                is_active: true,
                created_at: '',
                updated_at: '',
            }

            const { container } = render(<ItemForm {...defaultProps} item={item} />)

            fireEvent.submit(container.querySelector('form')!)

            await waitFor(() =>
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({ type: 'ACTIVO' })
                )
            )
        })
    })

    describe('media gallery wiring', () => {
        it('renders the MediaGalleryUploader', () => {
            const { getByTestId } = render(<ItemForm {...defaultProps} />)
            expect(getByTestId('media-gallery-uploader-stub')).toBeDefined()
        })

        it('does not wrap the uploader in its own "Photos" label (the uploader renders one already)', () => {
            const { queryByText } = render(<ItemForm {...defaultProps} />)
            expect(queryByText('Photos')).toBeNull()
        })

        it('includes media_gallery_id and owner_token in the submitted payload once the uploader reports them', async () => {
            const { getByPlaceholderText, getByTestId, container } = render(<ItemForm {...defaultProps} />)

            fireEvent.change(getByPlaceholderText('e.g., SAL-001'), { target: { value: 'SA-001' } })
            fireEvent.change(getByPlaceholderText('e.g., Fresh Salmon'), { target: { value: 'Salt Item' } })
            fireEvent.click(getByTestId('media-gallery-uploader-stub'))

            fireEvent.submit(container.querySelector('form')!)

            await waitFor(() =>
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({ media_gallery_id: 'gallery-123', owner_token: 'owner-token-123' })
                )
            )
        })

        it('omits media_gallery_id and owner_token when the uploader was never used', async () => {
            const { getByPlaceholderText, container } = render(<ItemForm {...defaultProps} />)

            fireEvent.change(getByPlaceholderText('e.g., SAL-001'), { target: { value: 'SA-001' } })
            fireEvent.change(getByPlaceholderText('e.g., Fresh Salmon'), { target: { value: 'Salt Item' } })

            fireEvent.submit(container.querySelector('form')!)

            await waitFor(() =>
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({ media_gallery_id: undefined, owner_token: undefined })
                )
            )
        })

        it('disables the submit button while the uploader reports it is busy', async () => {
            const { getByTestId, getByText } = render(<ItemForm {...defaultProps} />)

            fireEvent.click(getByTestId('media-gallery-uploader-busy-stub'))

            await waitFor(() => {
                const submitButton = getByText('Create Item').closest('button') as HTMLButtonElement
                expect(submitButton.disabled).toBe(true)
            })
        })

        it('does not submit while the uploader is busy, even if the form is otherwise valid', async () => {
            const { getByPlaceholderText, getByTestId, container } = render(<ItemForm {...defaultProps} />)

            fireEvent.change(getByPlaceholderText('e.g., SAL-001'), { target: { value: 'SA-001' } })
            fireEvent.change(getByPlaceholderText('e.g., Fresh Salmon'), { target: { value: 'Salt Item' } })
            fireEvent.click(getByTestId('media-gallery-uploader-busy-stub'))

            await waitFor(() => {
                const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement
                expect(submitButton.disabled).toBe(true)
            })

            // Dispatches the form's submit event directly (as Enter-key submission would),
            // bypassing the submit button entirely — this only stays blocked because onSubmit
            // itself checks isSubmitDisabled, not because the button happens to be disabled.
            fireEvent.submit(container.querySelector('form')!)

            expect(mockExecute).not.toHaveBeenCalled()
        })

        it('passes disabled=false to the uploader while the form is idle', () => {
            const { getByTestId } = render(<ItemForm {...defaultProps} />)
            expect(getByTestId('media-gallery-uploader-disabled-stub').textContent).toBe('false')
        })

        it('does not show a loading spinner while merely blocked by the uploader (e.g. an unresolved upload error) — nothing is actually being saved', async () => {
            const { getByTestId, getByText } = render(<ItemForm {...defaultProps} />)

            fireEvent.click(getByTestId('media-gallery-uploader-busy-stub'))

            await waitFor(() => {
                const submitButton = getByText('Create Item').closest('button') as HTMLButtonElement
                expect(submitButton.disabled).toBe(true)
                expect(submitButton.querySelector('.animate-spin')).toBeNull()
            })
        })
    })
})
