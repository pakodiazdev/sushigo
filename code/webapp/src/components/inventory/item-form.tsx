import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Textarea, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useCreateUpdateMutation } from '@/hooks/use-form-mutation'
import { itemApi } from '@/services/inventory-api'
import type { Item } from '@/types/inventory'

const itemSchema = z.object({
  sku: z.string().min(2, 'SKU must be at least 2 characters'),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string(),
  type: z.enum(['INSUMO', 'PRODUCTO', 'ACTIVO']),
  is_stocked: z.boolean(),
  is_perishable: z.boolean(),
  is_active: z.boolean(),
})

type ItemFormValues = z.infer<typeof itemSchema>

interface ItemFormProps {
  item?: Item | null
  onSuccess: () => void
  onCancel: () => void
}

export function ItemForm({ item, onSuccess, onCancel }: Readonly<ItemFormProps>) {
  const isEditing = !!item

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      sku: item?.sku || '',
      name: item?.name || '',
      description: item?.description || '',
      type: item?.type || 'PRODUCTO',
      is_stocked: item?.is_stocked ?? true,
      is_perishable: item?.is_perishable ?? false,
      is_active: item?.is_active ?? true,
    },
  })

  const { execute, validationErrors, isPending } = useCreateUpdateMutation({
    createFn: (data: ItemFormValues) => itemApi.create(data),
    updateFn: (data: ItemFormValues) => itemApi.update(item!.id, data),
    entityName: 'Item',
    isEditing,
    onSuccess,
  })

  // Merge client and server validation errors
  const allErrors = {
    sku: errors.sku?.message || validationErrors.sku,
    name: errors.name?.message || validationErrors.name,
  }

  const onSubmit = async (data: ItemFormValues) => {
    await execute(data)
  }

  const isSubmitting = isPending

  // Watch values for controlled checkboxes
  const isStocked = watch('is_stocked')
  const isPerishable = watch('is_perishable')
  const isActive = watch('is_active')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <FormField
          label="SKU (Stock Keeping Unit)"
          required
          error={allErrors.sku}
          hint="Unique identifier for this item"
        >
          <Input
            {...register('sku', {
              onChange: (e) => setValue('sku', e.target.value.toUpperCase()),
            })}
            placeholder="e.g., SAL-001"
            error={!!allErrors.sku}
            disabled={isEditing}
          />
        </FormField>

        <FormField
          label="Item Name"
          required
          error={allErrors.name}
        >
          <Input
            {...register('name')}
            placeholder="e.g., Fresh Salmon"
            error={!!allErrors.name}
          />
        </FormField>

        <FormField label="Description">
          <Textarea
            {...register('description')}
            rows={3}
            placeholder="Additional description or notes"
          />
        </FormField>

        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900">Item Properties</h4>

          <Checkbox
            checked={isStocked}
            onChange={(e) => setValue('is_stocked', e.target.checked)}
            label="Track inventory for this item"
          />

          <Checkbox
            checked={isPerishable}
            onChange={(e) => setValue('is_perishable', e.target.checked)}
            label="Perishable (has expiration date)"
          />

          <Checkbox
            checked={isActive}
            onChange={(e) => setValue('is_active', e.target.checked)}
            label="Active"
          />
        </div>
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update' : 'Create'} Item
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
