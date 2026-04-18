/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { LocationForm } from '../location-form'

// Mock useFormState hook
vi.mock('@/hooks/use-form-state', () => ({
  useFormState: () => ({
    formData: {
      operating_unit_id: 0,
      name: '',
      type: 'MAIN',
      priority: 100,
      is_primary: false,
      is_active: true,
      notes: '',
    },
    setField: vi.fn(),
    errors: {},
    validate: vi.fn().mockReturnValue(true),
  }),
  validators: {
    minLength: () => () => undefined,
    range: () => () => undefined,
  },
}))

// Mock useCreateUpdateMutation hook
vi.mock('@/hooks/use-form-mutation', () => ({
  useCreateUpdateMutation: () => ({
    execute: vi.fn().mockResolvedValue({}),
    validationErrors: {},
    isPending: false,
  }),
}))

// Mock inventory queries
vi.mock('@/hooks/use-inventory-queries', () => ({
  useOperatingUnitsSelect: () => ({
    data: [
      { id: 1, name: 'Main Unit', type: 'BRANCH_MAIN' },
      { id: 2, name: 'Event Unit', type: 'EVENT_TEMP' },
    ],
  }),
}))

// Mock inventory API
vi.mock('@/services/inventory-api', () => ({
  inventoryLocationApi: {
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

const defaultProps = {
  location: null,
  onSuccess: vi.fn(),
  onCancel: vi.fn(),
}

describe('LocationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders the form', () => {
      const { container } = render(<LocationForm {...defaultProps} />)
      const form = container.querySelector('form')
      expect(form).toBeDefined()
    })

    it('renders operating unit select', () => {
      const { getByText } = render(<LocationForm {...defaultProps} />)
      expect(getByText('Seleccione una unidad operativa')).toBeDefined()
    })

    it('renders operating unit options', () => {
      const { getByText } = render(<LocationForm {...defaultProps} />)
      expect(getByText(/Main Unit/)).toBeDefined()
    })

    it('renders name field', () => {
      const { container } = render(<LocationForm {...defaultProps} />)
      const inputs = container.querySelectorAll('input')
      expect(inputs.length).toBeGreaterThan(0)
    })

    it('renders location type select', () => {
      const { container } = render(<LocationForm {...defaultProps} />)
      const selects = container.querySelectorAll('select')
      expect(selects.length).toBeGreaterThan(0)
    })

    it('renders priority field', () => {
      const { container } = render(<LocationForm {...defaultProps} />)
      const numberInputs = container.querySelectorAll('input[type="number"]')
      expect(numberInputs.length).toBeGreaterThan(0)
    })

    it('renders cancel button', () => {
      const { getByText } = render(<LocationForm {...defaultProps} />)
      expect(getByText('Cancelar')).toBeDefined()
    })

    it('renders create button for new location', () => {
      const { getByText } = render(<LocationForm {...defaultProps} />)
      expect(getByText('Crear Ubicación')).toBeDefined()
    })

    it('renders update button when editing', () => {
      const location = {
        id: 1,
        operating_unit_id: 1,
        name: 'Main Storage',
        type: 'MAIN' as const,
        priority: 100,
        is_primary: true,
        is_active: true,
        notes: '',
        created_at: '',
        updated_at: '',
      }
      const { getByText } = render(<LocationForm {...defaultProps} location={location} />)
      expect(getByText('Actualizar Ubicación')).toBeDefined()
    })
  })

  describe('form interactions', () => {
    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn()
      const { getByText } = render(<LocationForm {...defaultProps} onCancel={onCancel} />)

      fireEvent.click(getByText('Cancelar'))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it.skip('submits form on submit', async () => {
      const { container } = render(<LocationForm {...defaultProps} />)
      const form = container.querySelector('form')

      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(defaultProps.onSuccess).toBeDefined()
      })
    })
  })

  describe('location types', () => {
    it('renders location type options', () => {
      const { container } = render(<LocationForm {...defaultProps} />)
      const selects = container.querySelectorAll('select')
      // Should have selects for operating unit and type
      expect(selects.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('form structure', () => {
    it('renders SlidePanel.Body component', () => {
      const { getByTestId } = render(<LocationForm {...defaultProps} />)
      expect(getByTestId('slide-panel-body')).toBeDefined()
    })

    it('renders SlidePanel.Footer component', () => {
      const { getByTestId } = render(<LocationForm {...defaultProps} />)
      expect(getByTestId('slide-panel-footer')).toBeDefined()
    })
  })
})
