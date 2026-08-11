/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { DishForm } from '../dish-form'
import type { Dish, DishCategory, DishExtraGroup } from '@/types/dishes'

const mockHandleSubmit = vi.fn((cb: (data: unknown) => void) => (e?: { preventDefault?: () => void }) => {
  e?.preventDefault?.()
  cb({})
})
const mockOnSubmit = vi.fn()
const mockSetValue = vi.fn()
const mockRegister = vi.fn((name: string) => ({ name }))
const mockAddExtraGroup = vi.fn()
const mockRemoveExtraGroup = vi.fn()
const mockAddExtraOption = vi.fn()
const mockRemoveExtraOption = vi.fn()
const mockSetIsUploaderBusy = vi.fn()

const rollos: DishCategory = { id: 'cat-rollos', name: 'Rollos', position: 0, is_active: true }
const ramen: DishCategory = { id: 'cat-ramen', name: 'Ramen', position: 1, is_active: true }

const mockHookState = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('../use-dish-form', () => ({
  useDishForm: () => mockHookState.value,
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

function baseGroup(overrides: Partial<DishExtraGroup> = {}): DishExtraGroup {
  return {
    id: 'group-1',
    dish_id: 'dish-1',
    name: 'Elige tu salsa',
    is_required: true,
    selection_type: 'SINGLE',
    options: [
      { id: 'opt-1', dish_extra_group_id: 'group-1', name: 'Soya', price_delta: 0, is_active: true, position: 0 },
    ],
    ...overrides,
  }
}

function setHookState(overrides: Partial<ReturnType<typeof defaultState>> = {}) {
  mockHookState.value = { ...defaultState(), ...overrides }
}

function defaultState() {
  return {
    isEditing: false,
    categories: [rollos, ramen],
    register: mockRegister,
    handleSubmit: mockHandleSubmit,
    setValue: mockSetValue,
    onSubmit: mockOnSubmit,
    allErrors: {},
    isActive: true,
    isSubmitting: false,
    isSubmitDisabled: false,
    setIsUploaderBusy: mockSetIsUploaderBusy,
    extraGroups: [] as DishExtraGroup[],
    isMutatingExtras: false,
    addExtraGroup: mockAddExtraGroup,
    removeExtraGroup: mockRemoveExtraGroup,
    addExtraOption: mockAddExtraOption,
    removeExtraOption: mockRemoveExtraOption,
  }
}

const existingDish: Dish = {
  id: 'dish-1',
  dish_category_id: 'cat-rollos',
  name: 'California Roll',
  base_price: 120,
  is_active: true,
  position: 0,
  photo_url: null,
}

describe('DishForm', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('create mode', () => {
    it('renders category options', () => {
      setHookState()
      const { getByText } = render(<DishForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText('Rollos')).toBeDefined()
      expect(getByText('Ramen')).toBeDefined()
    })

    it('renders the uploader and not the edit-mode notice', () => {
      setHookState()
      const { getByTestId, queryByText } = render(<DishForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByTestId('media-uploader-stub')).toBeDefined()
      expect(queryByText(/Photo management for existing dishes/)).toBeNull()
    })

    it('wires uploader onChange into setValue', () => {
      setHookState()
      const { getByTestId } = render(<DishForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(getByTestId('media-uploader-stub'))
      expect(mockSetValue).toHaveBeenCalledWith('media_gallery_id', 'g-1')
      expect(mockSetValue).toHaveBeenCalledWith('owner_token', 'o-1')
    })

    it('wires uploader onBusyChange into setIsUploaderBusy', () => {
      setHookState()
      const { getByTestId } = render(<DishForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(getByTestId('media-uploader-busy-stub'))
      expect(mockSetIsUploaderBusy).toHaveBeenCalledWith(true)
    })

    it('shows the extras-after-saving notice instead of the editor', () => {
      setHookState()
      const { getByText } = render(<DishForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText(/can only be configured once the/)).toBeDefined()
    })

    it('calls onCancel when Cancel is clicked', () => {
      setHookState()
      const onCancel = vi.fn()
      const { getByText } = render(<DishForm onSuccess={vi.fn()} onCancel={onCancel} />)
      fireEvent.click(getByText('Cancel'))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('renders "Create Dish" as the submit label', () => {
      setHookState()
      const { getByText } = render(<DishForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText('Create Dish')).toBeDefined()
    })

    it('calls handleSubmit/onSubmit when the form is submitted', () => {
      setHookState()
      const { container } = render(<DishForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.submit(container.querySelector('form')!)
      expect(mockOnSubmit).toHaveBeenCalled()
    })

    it('disables the submit button when isSubmitDisabled is true', () => {
      setHookState({ isSubmitDisabled: true })
      const { getByText } = render(<DishForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect((getByText('Create Dish').closest('button') as HTMLButtonElement).disabled).toBe(true)
    })

    it('shows a spinner while submitting', () => {
      setHookState({ isSubmitting: true, isSubmitDisabled: true })
      const { container } = render(<DishForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(container.querySelector('.animate-spin')).toBeDefined()
    })

    it('surfaces field errors', () => {
      setHookState({ allErrors: { name: 'Name is required' } })
      const { getByText } = render(<DishForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText('Name is required')).toBeDefined()
    })
  })

  describe('edit mode', () => {
    it('shows "Update Dish" as the submit label', () => {
      setHookState({ isEditing: true })
      const { getByText } = render(<DishForm dish={existingDish} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText('Update Dish')).toBeDefined()
    })

    it('shows the edit-mode photo notice instead of the uploader', () => {
      setHookState({ isEditing: true })
      const { queryByTestId, getByText } = render(<DishForm dish={existingDish} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(queryByTestId('media-uploader-stub')).toBeNull()
      expect(getByText(/Photo management for existing dishes/)).toBeDefined()
    })

    it('renders existing extra groups with their options', () => {
      setHookState({ isEditing: true, extraGroups: [baseGroup()] })
      const { getByText } = render(<DishForm dish={existingDish} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText('Elige tu salsa')).toBeDefined()
      expect(getByText('Single choice · Required')).toBeDefined()
      expect(getByText('Soya')).toBeDefined()
    })

    it('shows a price delta on an option only when it is greater than zero', () => {
      setHookState({
        isEditing: true,
        extraGroups: [
          baseGroup({
            options: [
              { id: 'opt-1', dish_extra_group_id: 'group-1', name: 'Soya', price_delta: 0, is_active: true, position: 0 },
              { id: 'opt-2', dish_extra_group_id: 'group-1', name: 'Anguila', price_delta: 15, is_active: true, position: 1 },
            ],
          }),
        ],
      })
      const { getByText, queryByText } = render(<DishForm dish={existingDish} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect(getByText('+$15.00')).toBeDefined()
      expect(queryByText('+$0.00')).toBeNull()
    })

    it('calls removeExtraGroup when a group is removed', () => {
      setHookState({ isEditing: true, extraGroups: [baseGroup()] })
      const { getByLabelText } = render(<DishForm dish={existingDish} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(getByLabelText('Remove extra group'))
      expect(mockRemoveExtraGroup).toHaveBeenCalledWith('group-1')
    })

    it('calls removeExtraOption when an option is removed', () => {
      setHookState({ isEditing: true, extraGroups: [baseGroup()] })
      const { getByLabelText } = render(<DishForm dish={existingDish} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(getByLabelText('Remove option'))
      expect(mockRemoveExtraOption).toHaveBeenCalledWith('group-1', 'opt-1')
    })

    // zodResolver validates asynchronously — handleSubmit's returned handler is a Promise
    // the component's onClick doesn't await, so assertions must wait for the microtask
    // queue to drain rather than checking the mock synchronously right after the click.
    it('adds a new extra group with the chosen selection type and required flag', async () => {
      setHookState({ isEditing: true })
      const { getByPlaceholderText, getByText, getByLabelText } = render(
        <DishForm dish={existingDish} onSuccess={vi.fn()} onCancel={vi.fn()} />
      )

      fireEvent.change(getByPlaceholderText('e.g., Elige tu salsa'), { target: { value: 'Nivel de picor' } })
      fireEvent.click(getByText('Required').closest('div')!.querySelector('input')!)
      fireEvent.click(getByLabelText('Add extra group'))

      await waitFor(() =>
        expect(mockAddExtraGroup).toHaveBeenCalledWith({
          name: 'Nivel de picor',
          selectionType: 'SINGLE',
          isRequired: true,
        })
      )
    })

    it('adds the extra group on Enter instead of falling through to the outer form\'s submit', async () => {
      // These fields sit inside DishForm's own <form> (no nested <form> is possible), so
      // Enter's browser default is "submit the nearest form" — the row's onKeyDown must
      // intercept it and trigger the add action instead of saving/closing the whole dish.
      setHookState({ isEditing: true })
      const { getByPlaceholderText } = render(
        <DishForm dish={existingDish} onSuccess={vi.fn()} onCancel={vi.fn()} />
      )

      const nameInput = getByPlaceholderText('e.g., Elige tu salsa')
      fireEvent.change(nameInput, { target: { value: 'Nivel de picor' } })
      fireEvent.keyDown(nameInput, { key: 'Enter' })

      await waitFor(() =>
        expect(mockAddExtraGroup).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Nivel de picor' })
        )
      )
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('does not add a group when the name is blank', async () => {
      setHookState({ isEditing: true })
      const { getByLabelText } = render(<DishForm dish={existingDish} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(getByLabelText('Add extra group'))
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockAddExtraGroup).not.toHaveBeenCalled()
    })

    it('adds a new option to a group', async () => {
      setHookState({ isEditing: true, extraGroups: [baseGroup()] })
      const { getByPlaceholderText, getByLabelText } = render(
        <DishForm dish={existingDish} onSuccess={vi.fn()} onCancel={vi.fn()} />
      )

      fireEvent.change(getByPlaceholderText('Option name'), { target: { value: 'Sriracha' } })
      fireEvent.change(getByPlaceholderText('+$'), { target: { value: '10' } })
      fireEvent.click(getByLabelText('Add option'))

      await waitFor(() =>
        expect(mockAddExtraOption).toHaveBeenCalledWith('group-1', { name: 'Sriracha', priceDelta: 10 })
      )
    })

    it('adds the option on Enter instead of falling through to the outer form\'s submit', async () => {
      setHookState({ isEditing: true, extraGroups: [baseGroup()] })
      const { getByPlaceholderText } = render(
        <DishForm dish={existingDish} onSuccess={vi.fn()} onCancel={vi.fn()} />
      )

      const nameInput = getByPlaceholderText('Option name')
      fireEvent.change(nameInput, { target: { value: 'Sriracha' } })
      fireEvent.keyDown(nameInput, { key: 'Enter' })

      await waitFor(() =>
        expect(mockAddExtraOption).toHaveBeenCalledWith(
          'group-1',
          expect.objectContaining({ name: 'Sriracha' })
        )
      )
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('adds an option with a leftover blank price as 0 instead of silently failing', async () => {
      // valueAsNumber would have read an emptied price input as NaN, which zod's number
      // type rejects with no rendered error — the add would silently do nothing.
      setHookState({ isEditing: true, extraGroups: [baseGroup()] })
      const { getByPlaceholderText, getByLabelText } = render(
        <DishForm dish={existingDish} onSuccess={vi.fn()} onCancel={vi.fn()} />
      )

      fireEvent.change(getByPlaceholderText('Option name'), { target: { value: 'Sriracha' } })
      fireEvent.change(getByPlaceholderText('+$'), { target: { value: '' } })
      fireEvent.click(getByLabelText('Add option'))

      await waitFor(() =>
        expect(mockAddExtraOption).toHaveBeenCalledWith('group-1', { name: 'Sriracha', priceDelta: 0 })
      )
    })

    it('does not add an option when the name is blank', async () => {
      setHookState({ isEditing: true, extraGroups: [baseGroup()] })
      const { getByLabelText } = render(<DishForm dish={existingDish} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      fireEvent.click(getByLabelText('Add option'))
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockAddExtraOption).not.toHaveBeenCalled()
    })

    it('disables extras controls while isMutatingExtras is true', () => {
      setHookState({ isEditing: true, extraGroups: [baseGroup()], isMutatingExtras: true })
      const { getByLabelText } = render(<DishForm dish={existingDish} onSuccess={vi.fn()} onCancel={vi.fn()} />)
      expect((getByLabelText('Remove extra group') as HTMLButtonElement).disabled).toBe(true)
    })
  })
})
