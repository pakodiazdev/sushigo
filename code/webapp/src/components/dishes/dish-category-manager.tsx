import { ArrowDown, ArrowUp, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useDishCategoryManager } from './use-dish-category-manager'

interface DishCategoryManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function DishCategoryManager({ isOpen, onClose }: Readonly<DishCategoryManagerProps>) {
  const { categories, isLoading, form, isMutating, createCategory, toggleActive, move } =
    useDishCategoryManager()
  const {
    register,
    formState: { errors },
  } = form

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title="Dish Categories" size="sm">
      <div className="space-y-4">
        <form onSubmit={createCategory} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="new-category-name">
              New category
            </label>
            <Input
              id="new-category-name"
              {...register('name')}
              placeholder="e.g., Rollos"
              disabled={isMutating}
              error={!!errors.name}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>}
          </div>
          <Button type="submit" disabled={isMutating} aria-label="Add category">
            {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="space-y-2">
            {categories.map((category, index) => (
              <li
                key={category.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="font-medium text-foreground">{category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.dishes_count ?? 0} dishes
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={isMutating || index === 0}
                    onClick={() => move(category, 'up')}
                    className={cn((isMutating || index === 0) && 'opacity-30')}
                  >
                    <ArrowUp className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={isMutating || index === categories.length - 1}
                    onClick={() => move(category, 'down')}
                    className={cn((isMutating || index === categories.length - 1) && 'opacity-30')}
                  >
                    <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <label className="ml-2 flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={category.is_active}
                      disabled={isMutating}
                      onChange={() => toggleActive(category)}
                    />{' '}
                    Active
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SlidePanel>
  )
}
