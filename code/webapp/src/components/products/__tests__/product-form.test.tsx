/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { ProductForm } from '../product-form'
import type { Brand, InventoryCategory, Product } from '@/types/inventory'

const mockHandleSubmit = vi.fn((cb: (data: unknown) => void) => (e?: { preventDefault?: () => void }) => {
  e?.preventDefault?.()
  cb({})
})
const mockOnSubmit = vi.fn()
const mockSetValue = vi.fn()
const mockRegister = vi.fn((name: string) => ({ name }))
const mockSetIsUploaderBusy = vi.fn()

const beverages: InventoryCategory = { id: 'cat-beverages', name: 'Beverages', position: 0, is_active: true }
const snacks: InventoryCategory = { id: 'cat-snacks', name: 'Snacks', position: 1, is_active: true }
const cocaCola: Brand = { id: 'brand-coca-cola', name: 'Coca-Cola', is_active: true }

const mockHookState = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('../use-product-form', () => ({
  useProductForm: () => mockHookState.value,
}))

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
      <span data-testid="media-uploader-disabled">{String(!!disabled)}</span>
      <button type="button" data-testid="media-uploader-stub" onClick={() => onChange?.('g-1', 'o-1')}>
        Simulate upload
      </button>
      <button type="button" data-testid="media-uploader-busy-stub" onClick={() => onBusyChange?.(true)}>
        Simulate busy
      </button>
    </>
  ),
}))

function setHookState(overrides: Partial<ReturnType<typeof defaultState>> = {}) {
  mockHookState.value = { ...defaultState(), ...overrides }
}

function defaultState() {
  return {
    brands: [cocaCola],
    categories: [beverages, snacks],
    register: mockRegister,
    handleSubmit: mockHandleSubmit,
    setValue: mockSetValue,
    onSubmit: mockOnSubmit,
    allErrors: {},
    isActive: true,
    isSubmitting: false,
    isSubmitDisabled: false,
    setIsUploaderBusy: mockSetIsUploaderBusy,
  }
}

const existingProduct: Product = {
  id: '42',
  name: 'Coca-Cola Original 600 ml',
  description: null,
  is_active: true,
  brand: { id: 'brand-coca-cola', name: 'Coca-Cola' },
  inventory_category: { id: 'cat-beverages', name: 'Beverages' },
  photo_url: null,
  variants_count: 0,
  warnings: [],
}

describe('ProductForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('create mode', () => {
    it('renders category and brand options', () => {
      setHookState()
      const { getByText } = render(<ProductForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText('Beverages')).toBeDefined()
      expect(getByText('Snacks')).toBeDefined()
      expect(getByText('Coca-Cola')).toBeDefined()
      expect(getByText('Sin marca')).toBeDefined()
    })

    it('renders the uploader and not the edit-mode notice', () => {
      setHookState()
      const { getByTestId, queryByText } = render(<ProductForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByTestId('media-uploader-stub')).toBeDefined()
      expect(queryByText(/gestión de fotos para productos existentes/)).toBeNull()
    })

    it('wires uploader onChange into setValue', () => {
      setHookState()
      const { getByTestId } = render(<ProductForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(getByTestId('media-uploader-stub'))
      expect(mockSetValue).toHaveBeenCalledWith('media_gallery_id', 'g-1')
      expect(mockSetValue).toHaveBeenCalledWith('owner_token', 'o-1')
    })

    it('wires uploader onBusyChange into setIsUploaderBusy', () => {
      setHookState()
      const { getByTestId } = render(<ProductForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(getByTestId('media-uploader-busy-stub'))
      expect(mockSetIsUploaderBusy).toHaveBeenCalledWith(true)
    })

    it('calls onCancel when Cancelar is clicked', () => {
      setHookState()
      const onCancel = vi.fn()
      const { getByText } = render(<ProductForm onSuccess={vi.fn()} onCancel={onCancel} />)
      fireEvent.click(getByText('Cancelar'))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('renders "Crear Producto" as the submit label', () => {
      setHookState()
      const { getByText } = render(<ProductForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText('Crear Producto')).toBeDefined()
    })

    it('calls handleSubmit/onSubmit when the form is submitted', () => {
      setHookState()
      const { container } = render(<ProductForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.submit(container.querySelector('form')!)
      expect(mockOnSubmit).toHaveBeenCalled()
    })

    it('disables the submit button when isSubmitDisabled is true', () => {
      setHookState({ isSubmitDisabled: true })
      const { getByText } = render(<ProductForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect((getByText('Crear Producto').closest('button') as HTMLButtonElement).disabled).toBe(true)
    })

    it('shows a spinner while submitting', () => {
      setHookState({ isSubmitting: true, isSubmitDisabled: true })
      const { container } = render(<ProductForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(container.querySelector('.animate-spin')).toBeDefined()
    })

    it('surfaces field errors', () => {
      setHookState({ allErrors: { name: 'El nombre debe tener al menos 2 caracteres' } })
      const { getByText } = render(<ProductForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText('El nombre debe tener al menos 2 caracteres')).toBeDefined()
    })
  })

  describe('edit mode', () => {
    it('shows "Actualizar Producto" as the submit label', () => {
      setHookState()
      const { getByText } = render(
        <ProductForm product={existingProduct} onSuccess={vi.fn()} onCancel={vi.fn()} />
      )
      expect(getByText('Actualizar Producto')).toBeDefined()
    })

    it('shows the edit-mode photo notice instead of the uploader', () => {
      setHookState()
      const { queryByTestId, getByText } = render(
        <ProductForm product={existingProduct} onSuccess={vi.fn()} onCancel={vi.fn()} />
      )
      expect(queryByTestId('media-uploader-stub')).toBeNull()
      expect(getByText(/gestión de fotos para productos existentes/)).toBeDefined()
    })
  })
})
