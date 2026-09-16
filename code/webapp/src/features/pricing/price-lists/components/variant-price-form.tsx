import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import type { VariantPrice } from '../types'
import { VariantPicker } from './variant-picker'
import { useVariantPriceForm } from '../hooks/use-variant-price-form'

interface VariantPriceFormProps {
  priceListId: string
  variantPrice?: VariantPrice | null
  onSuccess: (variantPrice: VariantPrice) => void
  onCancel: () => void
}

/**
 * Assign / edit a Variant's price within a Price List. The Variant itself is read-only once a
 * price entry exists — a price that needs to price a different Variant is a new entry, not an
 * edit of an existing one (its overlap validation is keyed on item_variant_id +
 * price_list_id, mirroring UpdateVariantPriceRequest's own restriction).
 */
export function VariantPriceForm({ priceListId, variantPrice, onSuccess, onCancel }: Readonly<VariantPriceFormProps>) {
  const isEditing = !!variantPrice
  const { register, handleSubmit, setValue, onSubmit, allErrors, itemVariantId, isActive, isSubmitting } =
    useVariantPriceForm({ priceListId, variantPrice, onSuccess })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        {isEditing ? (
          <FormField label="Variante del Producto">
            <p className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground">
              La variante de esta entrada de precio no puede cambiarse — crea una nueva entrada en su lugar.
            </p>
          </FormField>
        ) : (
          <VariantPicker
            value={itemVariantId}
            onChange={(value) => setValue('item_variant_id', value)}
            error={allErrors.item_variant_id}
          />
        )}

        <FormField label="Precio" required error={allErrors.price} hint="Decimal exacto, hasta 4 decimales">
          <Input
            type="text"
            inputMode="decimal"
            {...register('price')}
            placeholder="Ej. 129.5000"
            error={!!allErrors.price}
          />
        </FormField>

        <FormField label="Vigente desde" required error={allErrors.effective_from}>
          <Input type="date" {...register('effective_from')} error={!!allErrors.effective_from} />
        </FormField>

        <FormField label="Vigente hasta" error={allErrors.effective_to} hint="Opcional — déjalo en blanco para no tener fecha de fin">
          <Input type="date" {...register('effective_to')} error={!!allErrors.effective_to} />
        </FormField>

        <Checkbox
          id="variant-price-is-active"
          checked={isActive}
          onChange={(e) => setValue('is_active', e.target.checked)}
          label="Activo"
        />
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Actualizar' : 'Crear'} Precio
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
