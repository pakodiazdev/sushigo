import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { FormField, Select, Textarea } from '@/components/ui/form-fields'
import { Input } from '@/components/ui/input'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useInventoryLocationsSelect, useUnitsOfMeasureSelect } from '@/hooks/use-inventory-queries'
import { fetchAllPages } from '@/lib/fetch-all-pages'
import { variantAssignmentApi } from '@/features/inventory/assignments'
import { useStockTransferForm } from '../hooks/use-stock-transfer-form'
import type { StockTransfer } from '../types'

interface StockTransferFormProps {
  transfer?: StockTransfer | null
  onSuccess: (transfer: StockTransfer) => void
  onCancel: () => void
}

export function StockTransferForm({ transfer, onSuccess, onCancel }: Readonly<StockTransferFormProps>) {
  const {
    isEditing,
    register,
    handleSubmit,
    errors,
    fields,
    addLine,
    removeLine,
    onSubmit,
    onDestinationChange,
    validationErrors,
    isSubmitting,
    sourceLocationId,
    destinationLocationId,
  } = useStockTransferForm({ transfer, onSuccess })

  const locationsQuery = useInventoryLocationsSelect()
  const uomsQuery = useUnitsOfMeasureSelect()

  // The destination scopes which Variants can be moved — an internal move never
  // expands the assortment (#569), so only offer Variants already assigned there.
  // The assignment list is paginated (ordered by variant code); page through it in
  // full so a Variant past the first 100 is still selectable, matching the other
  // catalog selectors.
  const assignedVariantsQuery = useQuery({
    queryKey: ['stock-transfer-form', 'assigned-variants', destinationLocationId],
    queryFn: () =>
      fetchAllPages((page) =>
        variantAssignmentApi.list(destinationLocationId, { state: 'assigned', page, per_page: 100 })
      ),
    enabled: Boolean(destinationLocationId),
  })

  const locations = locationsQuery.data ?? []
  const uoms = uomsQuery.data ?? []
  const assignedVariants = assignedVariantsQuery.data?.data.data ?? []

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Origen" required error={errors.source_location_id?.message}>
            <Select
              aria-label="Origen"
              error={Boolean(errors.source_location_id)}
              {...register('source_location_id')}
            >
              <option value="">Selecciona una ubicación</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Destino" required error={errors.destination_location_id?.message}>
            <Select
              aria-label="Destino"
              error={Boolean(errors.destination_location_id)}
              value={destinationLocationId}
              onChange={(event) => onDestinationChange(event.target.value)}
            >
              <option value="">Selecciona una ubicación</option>
              {locations
                .filter((location) => location.id !== sourceLocationId)
                .map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Referencia" error={errors.reference?.message}>
            <Input aria-label="Referencia" {...register('reference')} error={Boolean(errors.reference)} />
          </FormField>
          <FormField label="Fecha del traslado" required error={errors.transfer_date?.message}>
            <Input
              aria-label="Fecha del traslado"
              type="date"
              error={Boolean(errors.transfer_date)}
              {...register('transfer_date')}
            />
          </FormField>
        </div>

        <FormField label="Notas" error={errors.notes?.message}>
          <Textarea aria-label="Notas" rows={2} {...register('notes')} />
        </FormField>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Líneas del traslado</p>
            <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1">
              <Plus className="h-4 w-4" />
              Agregar línea
            </Button>
          </div>

          {errors.lines?.message && <p className="text-sm text-destructive">{errors.lines.message}</p>}
          {!destinationLocationId && (
            <p className="text-sm text-muted-foreground">
              Selecciona un destino para elegir las variantes que se pueden trasladar.
            </p>
          )}

          {fields.map((field, index) => {
            const lineErrors = errors.lines?.[index]
            return (
              <div key={field.id} className="space-y-3 rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Línea {index + 1}</p>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Quitar línea ${index + 1}`}
                      onClick={() => removeLine(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <FormField label="Variante" required error={lineErrors?.item_variant_id?.message}>
                  <Select
                    aria-label={`Variante línea ${index + 1}`}
                    error={Boolean(lineErrors?.item_variant_id)}
                    disabled={!destinationLocationId}
                    {...register(`lines.${index}.item_variant_id`)}
                  >
                    <option value="">Selecciona una variante</option>
                    {field._label && !assignedVariants.some((row) => row.item_variant_id === field.item_variant_id) && (
                      <option value={field.item_variant_id}>{field._label}</option>
                    )}
                    {assignedVariants.map((row) => (
                      <option key={row.item_variant_id} value={row.item_variant_id}>
                        {row.item_variant_name} ({row.item_variant_code})
                      </option>
                    ))}
                  </Select>
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Unidad" required error={lineErrors?.entry_uom_id?.message}>
                    <Select
                      aria-label={`Unidad línea ${index + 1}`}
                      error={Boolean(lineErrors?.entry_uom_id)}
                      {...register(`lines.${index}.entry_uom_id`)}
                    >
                      <option value="">Selecciona una unidad</option>
                      {uoms.map((uom) => (
                        <option key={uom.id} value={uom.id}>{uom.code} — {uom.name}</option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField label="Cantidad" required error={lineErrors?.entry_quantity?.message}>
                    <Input
                      aria-label={`Cantidad línea ${index + 1}`}
                      type="number"
                      step="any"
                      min="0"
                      error={Boolean(lineErrors?.entry_quantity)}
                      {...register(`lines.${index}.entry_quantity`, { valueAsNumber: true })}
                    />
                  </FormField>
                </div>

                {validationErrors?.[`lines.${index}.item_variant_id`] && (
                  <p className="text-sm text-destructive">
                    {validationErrors[`lines.${index}.item_variant_id`]}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Actualizar' : 'Crear'} traslado
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
