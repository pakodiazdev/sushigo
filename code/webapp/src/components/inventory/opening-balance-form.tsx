import { Loader2, DollarSign, Package, Info } from 'lucide-react'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Textarea } from '@/components/ui/form-fields'
import type { InventoryLocation } from '@/types/inventory'
import { UnitOfMeasureSelectField, VariantSelectField } from './stock-reference-fields'
import { useOpeningBalanceForm } from './use-opening-balance-form'

interface OpeningBalanceFormProps {
  onSuccess: () => void
  onCancel: () => void
  preselectedLocationId?: string
  preselectedVariantId?: string
}

export function OpeningBalanceForm({
  onSuccess,
  onCancel,
  preselectedLocationId,
  preselectedVariantId,
}: Readonly<OpeningBalanceFormProps>) {
  const {
    register,
    handleSubmit,
    onSubmit,
    setFieldValue,
    values,
    errors,
    locations,
    variants,
    units,
    selectedVariant,
    preview,
    previewLoading,
    previewErrorMessage,
    isPending,
  } = useOpeningBalanceForm({ onSuccess, preselectedLocationId, preselectedVariantId })

  return (
    <>
      <SlidePanel.Header>
        <div>
          <h2 className="text-lg font-semibold">Registrar saldo inicial</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Carga las existencias iniciales de una variante en una ubicación
          </p>
        </div>
      </SlidePanel.Header>

      <SlidePanel.Body>
        <form
          id="opening-balance-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          aria-busy={isPending}
        >
          {/* What this action does */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex gap-2">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-amber-900">
              Esta acción <strong>inicializa o suma</strong> existencias y deja evidencia de
              auditoría permanente. No es una recepción de compra ni un borrador: para corregir un
              registro se usa una reversión o un ajuste, nunca la edición del historial.
            </p>
          </div>

          {/* Location Select */}
          <FormField label="Ubicación" required error={errors.inventory_location_id}>
            <Select
              value={values.inventoryLocationId}
              onChange={(e) => setFieldValue('inventory_location_id', e.target.value)}
              error={!!errors.inventory_location_id}
            >
              <option value="">Selecciona una ubicación...</option>
              {locations.map((location: InventoryLocation) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.type})
                </option>
              ))}
            </Select>
          </FormField>

          {/* Item Variant Select */}
          <VariantSelectField
            label="Variante"
            placeholder="Selecciona una variante..."
            value={values.itemVariantId}
            error={errors.item_variant_id}
            hint="Elige la variante de producto a inicializar"
            variants={variants}
            onChange={(value) => setFieldValue('item_variant_id', value)}
          />

          {/* Selected Variant Info */}
          {selectedVariant && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <span className="font-semibold text-blue-900">Datos de la variante</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Producto:</span>
                  <span className="font-medium">{selectedVariant.item?.name || 'N/D'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unidad base:</span>
                  <span className="font-medium">
                    {selectedVariant.uom?.name || 'N/D'} ({selectedVariant.uom?.symbol})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quantity */}
          <FormField
            label="Cantidad"
            required
            error={errors.quantity}
            hint="Cantidad a agregar al inventario"
          >
            <Input
              type="number"
              {...register('quantity', { valueAsNumber: true })}
              min="0"
              step="0.01"
              placeholder="0.00"
              error={!!errors.quantity}
            />
          </FormField>

          {/* Unit of Measure */}
          <UnitOfMeasureSelectField
            label="Unidad de medida"
            placeholder="Selecciona una unidad..."
            hint="Se completa con la unidad base de la variante"
            value={values.uomId}
            error={errors.uom_id}
            units={units}
            onChange={(value) => setFieldValue('uom_id', value)}
          />

          {/* Unit Cost */}
          <FormField
            label="Costo unitario"
            error={errors.unit_cost}
            hint="Costo por unidad de medida de entrada (opcional)"
          >
            <Input
              type="number"
              {...register('unit_cost', {
                // Optional field: a cleared input registers as undefined (omit
                // the cost) rather than NaN; an explicit 0 stays 0.
                setValueAs: (v) =>
                  v === '' || v === null || Number.isNaN(Number(v)) ? undefined : Number(v),
              })}
              min="0"
              step="0.01"
              placeholder="0.00"
              error={!!errors.unit_cost}
            />
          </FormField>

          {/* Conversion + valuation preview (matches the backend result) */}
          <div aria-live="polite">
            {previewLoading && (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                Calculando conversión...
              </p>
            )}

            {previewErrorMessage && !previewLoading && (
              <p className="text-sm text-red-600 dark:text-red-400">{previewErrorMessage}</p>
            )}

            {preview && !previewLoading && !previewErrorMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" aria-hidden="true" />
                  <span className="font-semibold text-green-900">Resumen antes de registrar</span>
                </div>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Cantidad ingresada:</dt>
                    <dd className="font-medium">
                      {preview.entry_quantity} {preview.entry_uom}
                    </dd>
                  </div>
                  {preview.conversion_applies && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Cantidad en unidad base:</dt>
                      <dd className="font-medium">
                        {preview.base_quantity} {preview.base_uom}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Costo unitario (base):</dt>
                    <dd className="font-medium">
                      {preview.base_unit_cost === null
                        ? 'Sin costo'
                        : `$${preview.base_unit_cost.toFixed(2)} / ${preview.base_uom}`}
                    </dd>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-green-200">
                    <dt className="font-semibold text-green-900">Valor total:</dt>
                    <dd className="font-bold text-green-700 text-lg">
                      {preview.total_value === null
                        ? '—'
                        : `$${preview.total_value.toFixed(2)}`}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          {/* Notes */}
          <FormField label="Notas" error={errors.notes} hint="Referencia o comentarios opcionales">
            <Textarea
              {...register('notes')}
              rows={3}
              placeholder="p. ej., Conteo inicial de inventario, referencia interna..."
            />
          </FormField>
        </form>
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="submit"
            form="opening-balance-form"
            disabled={isPending}
            className="flex-1"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
            Registrar saldo inicial
          </Button>
        </div>
      </SlidePanel.Footer>
    </>
  )
}
