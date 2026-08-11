/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { DishDetails } from '../dish-details'
import type { Dish } from '@/types/dishes'

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

const baseDish: Dish = {
  id: 'dish-1',
  dish_category_id: 'cat-1',
  name: 'California Roll',
  description: 'Aguacate, pepino y surimi',
  base_price: 120,
  is_active: true,
  position: 0,
  photo_url: null,
}

describe('DishDetails', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the dish name and formatted price', () => {
    const { getByText } = render(
      <DishDetails dish={baseDish} onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    expect(getByText('California Roll')).toBeDefined()
    expect(getByText('$120.00')).toBeDefined()
  })

  it('renders the category badge when categoryName is provided', () => {
    const { getByText } = render(
      <DishDetails dish={baseDish} categoryName="Rollos" onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    expect(getByText('Rollos')).toBeDefined()
  })

  it('shows Active status for an active dish', () => {
    const { getByText } = render(
      <DishDetails dish={baseDish} onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    expect(getByText('Active')).toBeDefined()
  })

  it('shows Inactive status for an inactive dish', () => {
    const { getByText } = render(
      <DishDetails dish={{ ...baseDish, is_active: false }} onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    expect(getByText('Inactive')).toBeDefined()
  })

  it('renders a photo when photo_url is set', () => {
    const { getByAltText, queryByRole } = render(
      <DishDetails dish={{ ...baseDish, photo_url: 'https://example.com/photo.jpg' }} onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    expect(getByAltText('California Roll')).toBeDefined()
    expect(queryByRole('img')).toBeDefined()
  })

  it('renders a placeholder when photo_url is null', () => {
    const { container } = render(
      <DishDetails dish={baseDish} onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders the description when present', () => {
    const { getByText } = render(
      <DishDetails dish={baseDish} onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    expect(getByText('Aguacate, pepino y surimi')).toBeDefined()
  })

  it('renders extra groups and their options', () => {
    const dishWithExtras: Dish = {
      ...baseDish,
      extra_groups: [
        {
          id: 'group-1',
          dish_id: 'dish-1',
          name: 'Elige tu salsa',
          is_required: true,
          selection_type: 'SINGLE',
          options: [
            { id: 'opt-1', dish_extra_group_id: 'group-1', name: 'Soya', price_delta: 0, is_active: true, position: 0 },
            { id: 'opt-2', dish_extra_group_id: 'group-1', name: 'Anguila', price_delta: 15, is_active: true, position: 1 },
          ],
        },
      ],
    }
    const { getByText } = render(
      <DishDetails dish={dishWithExtras} onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    expect(getByText('Elige tu salsa')).toBeDefined()
    expect(getByText('Soya')).toBeDefined()
    expect(getByText(/Anguila/)).toBeDefined()
  })

  it('calls onEdit when the Edit button is clicked', () => {
    const onEdit = vi.fn()
    const { getByText } = render(
      <DishDetails dish={baseDish} onEdit={onEdit} onDelete={vi.fn()} />
    )
    fireEvent.click(getByText('Edit Dish'))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('calls onDelete when the Delete button is clicked', () => {
    const onDelete = vi.fn()
    const { getByText } = render(
      <DishDetails dish={baseDish} onEdit={vi.fn()} onDelete={onDelete} />
    )
    fireEvent.click(getByText('Delete'))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
