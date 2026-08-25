import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Textarea, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import type { PriceList } from '../types'
import { usePriceListForm } from '../hooks/use-price-list-form'

interface PriceListFormProps {
  priceList?: PriceList | null
  onSuccess: (priceList: PriceList) => void
  onCancel: () => void
}

export function PriceListForm({ priceList, onSuccess, onCancel }: Readonly<PriceListFormProps>) {
  const isEditing = !!priceList
  const { register, handleSubmit, setValue, onSubmit, allErrors, isActive, isSubmitting } = usePriceListForm({
    priceList,
    onSuccess,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <FormField label="Code" required error={allErrors.code}>
          <Input {...register('code')} placeholder="e.g., STANDARD" error={!!allErrors.code} />
        </FormField>

        <FormField label="Name" required error={allErrors.name}>
          <Input {...register('name')} placeholder="e.g., Standard Pricing" error={!!allErrors.name} />
        </FormField>

        <FormField label="Description">
          <Textarea {...register('description')} rows={3} placeholder="Optional notes…" />
        </FormField>

        <FormField
          label="Priority"
          error={allErrors.priority}
          hint="Tiebreaker when multiple active lists resolve for the same context — higher wins"
        >
          <Input
            type="number"
            {...register('priority', { valueAsNumber: true })}
            error={!!allErrors.priority}
          />
        </FormField>

        <Checkbox
          id="price-list-is-active"
          checked={isActive}
          onChange={(e) => setValue('is_active', e.target.checked)}
          label="Active"
        />
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update' : 'Create'} Price List
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
