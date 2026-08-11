/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { DishCategoryManager } from '../dish-category-manager'
import type { DishCategory } from '@/types/dishes'

const mockCreateCategory = vi.fn((e?: { preventDefault?: () => void }) => e?.preventDefault?.())
const mockRegister = vi.fn((name: string) => ({ name }))
const mockToggleActive = vi.fn()
const mockMove = vi.fn()

const rollos: DishCategory = { id: 'cat-rollos', name: 'Rollos', position: 0, is_active: true, dishes_count: 2 }
const ramen: DishCategory = { id: 'cat-ramen', name: 'Ramen', position: 1, is_active: true, dishes_count: 1 }

const mockHookState = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('../use-dish-category-manager', () => ({
  useDishCategoryManager: () => mockHookState.value,
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean
    title?: string
    children: React.ReactNode
  }) => (isOpen ? <div data-testid="slide-panel">{title}{children}</div> : null),
}))

function setHookState(overrides: Partial<ReturnType<typeof defaultState>> = {}) {
  mockHookState.value = { ...defaultState(), ...overrides }
}

function defaultState() {
  return {
    categories: [rollos, ramen],
    isLoading: false,
    form: { register: mockRegister, formState: { errors: {} as Record<string, { message?: string }> } },
    isMutating: false,
    createCategory: mockCreateCategory,
    toggleActive: mockToggleActive,
    move: mockMove,
  }
}

describe('DishCategoryManager', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders nothing when closed', () => {
    setHookState()
    const { queryByTestId } = render(<DishCategoryManager isOpen={false} onClose={vi.fn()} />)
    expect(queryByTestId('slide-panel')).toBeNull()
  })

  it('lists categories with their dish counts', () => {
    setHookState()
    const { getByText } = render(<DishCategoryManager isOpen onClose={vi.fn()} />)
    expect(getByText('Rollos')).toBeDefined()
    expect(getByText('2 dishes')).toBeDefined()
    expect(getByText('Ramen')).toBeDefined()
  })

  it('shows a loading spinner while loading', () => {
    setHookState({ isLoading: true, categories: [] })
    const { container } = render(<DishCategoryManager isOpen onClose={vi.fn()} />)
    expect(container.querySelector('.animate-spin')).toBeDefined()
  })

  it('registers the new-category name field', () => {
    setHookState()
    render(<DishCategoryManager isOpen onClose={vi.fn()} />)
    expect(mockRegister).toHaveBeenCalledWith('name')
  })

  it('calls createCategory when the add button is clicked', () => {
    setHookState()
    const { getByLabelText } = render(<DishCategoryManager isOpen onClose={vi.fn()} />)
    fireEvent.click(getByLabelText('Add category'))
    expect(mockCreateCategory).toHaveBeenCalledTimes(1)
  })

  it('shows a validation error under the name field', () => {
    setHookState({ form: { register: mockRegister, formState: { errors: { name: { message: 'Name is required' } } } } })
    const { getByText } = render(<DishCategoryManager isOpen onClose={vi.fn()} />)
    expect(getByText('Name is required')).toBeDefined()
  })

  it('disables move-up for the first category and move-down for the last', () => {
    setHookState()
    const { getAllByLabelText } = render(<DishCategoryManager isOpen onClose={vi.fn()} />)
    const upButtons = getAllByLabelText('Move up') as HTMLButtonElement[]
    const downButtons = getAllByLabelText('Move down') as HTMLButtonElement[]
    expect(upButtons[0]!.disabled).toBe(true)
    expect(downButtons[downButtons.length - 1]!.disabled).toBe(true)
  })

  it('calls move when a move button is clicked', () => {
    setHookState()
    const { getAllByLabelText } = render(<DishCategoryManager isOpen onClose={vi.fn()} />)
    fireEvent.click(getAllByLabelText('Move down')[0]!)
    expect(mockMove).toHaveBeenCalledWith(rollos, 'down')
  })

  it('calls toggleActive when the active checkbox is toggled', () => {
    setHookState()
    const { getAllByRole } = render(<DishCategoryManager isOpen onClose={vi.fn()} />)
    const checkboxes = getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]!)
    expect(mockToggleActive).toHaveBeenCalledWith(rollos)
  })
})
