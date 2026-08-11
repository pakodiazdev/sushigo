import { Edit, ImageOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SlidePanel } from '@/components/ui/slide-panel'
import type { Dish } from '@/types/dishes'

interface DishDetailsProps {
  dish: Dish
  categoryName?: string
  onEdit: () => void
  onDelete: () => void
}

export function DishDetails({ dish, categoryName, onEdit, onDelete }: Readonly<DishDetailsProps>) {
  return (
    <div className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          {categoryName && (
            <span className="rounded-md bg-muted px-3 py-1 text-sm font-medium text-foreground">
              {categoryName}
            </span>
          )}
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${dish.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
              : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
              }`}
          >
            {dish.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {dish.photo_url ? (
          <img
            src={dish.photo_url}
            alt={dish.name}
            className="h-48 w-full rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed border-input text-muted-foreground">
            <ImageOff className="h-8 w-8" />
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold text-foreground">{dish.name}</h2>
          <p className="mt-1 text-2xl font-bold text-foreground">${dish.base_price.toFixed(2)}</p>
        </div>

        {dish.description && (
          <p className="text-sm text-muted-foreground">{dish.description}</p>
        )}

        {dish.extra_groups && dish.extra_groups.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Extras</h3>
            {dish.extra_groups.map((group) => (
              <div key={group.id} className="rounded-md border border-border p-3">
                <div className="text-sm font-medium text-foreground">
                  {group.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {group.selection_type === 'SINGLE' ? 'Single choice' : 'Multiple choice'} ·{' '}
                    {group.is_required ? 'Required' : 'Optional'}
                  </span>
                </div>
                {group.options && group.options.length > 0 && (
                  <ul className="mt-1 text-sm text-muted-foreground">
                    {group.options.map((option) => (
                      <li key={option.id}>
                        {option.name}
                        {option.price_delta > 0 && ` (+$${option.price_delta.toFixed(2)})`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-between">
          <Button variant="outline-danger" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Dish
          </Button>
        </div>
      </SlidePanel.Footer>
    </div>
  )
}
