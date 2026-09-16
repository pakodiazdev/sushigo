import { Loader2, Trash2 } from 'lucide-react'
import type { UseFormRegister } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { FormField, Select } from '@/components/ui/form-fields'
import { Input } from '@/components/ui/input'
import type { VariantAssignmentRow } from '@/features/inventory/assignments'
import type { UnitOfMeasure } from '@/types/inventory'
import { useStockTransferLinePreview } from '../hooks/use-stock-transfer-line-preview'
import type { StockTransferFormValues } from '../hooks/use-stock-transfer-form'

interface StockTransferLineFieldsProps {
  index: number
  fieldId: string
  fieldLabel?: string
  fieldVariantId: string
  currentVariantId: string
  entryUomId: string
  entryQuantity: number
  sourceLocationId: string
  destinationLocationId: string
  register: UseFormRegister<StockTransferFormValues>
  variantError?: string
  uomError?: string
  quantityError?: string
  uoms: UnitOfMeasure[]
  selectableVariants: VariantAssignmentRow[]
  canRemove: boolean
  onRemove: () => void
}

/**
 * One Stock Transfer line's fields (#573), plus its non-authoritative
 * source-availability preview (#613) — the source Location's current
 * on-hand/available for the chosen Variant and the normalized base-UOM
 * quantity the line would move if posted. Extracted from `StockTransferForm`
 * so each line's preview query is its own hook instance (calling a hook
 * inside the parent's `.map()` would violate the Rules of Hooks once lines
 * are added/removed).
 */
export function StockTransferLineFields({
  index,
  fieldId,
  fieldLabel,
  fieldVariantId,
  currentVariantId,
  entryUomId,
  entryQuantity,
  sourceLocationId,
  destinationLocationId,
  register,
  variantError,
  uomError,
  quantityError,
  uoms,
  selectableVariants,
  canRemove,
  onRemove,
}: Readonly<StockTransferLineFieldsProps>) {
  const { preview, previewLoading, previewErrorMessage } = useStockTransferLinePreview({
    sourceLocationId,
    itemVariantId: currentVariantId,
    entryUomId,
    entryQuantity,
  })

  return (
    <div key={fieldId} className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Línea {index + 1}</p>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Quitar línea ${index + 1}`}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <FormField label="Variante" required error={variantError}>
        <Select
          aria-label={`Variante línea ${index + 1}`}
          error={Boolean(variantError)}
          disabled={!destinationLocationId}
          {...register(`lines.${index}.item_variant_id`)}
        >
          <option value="">Selecciona una variante</option>
          {fieldLabel &&
            currentVariantId === fieldVariantId &&
            !selectableVariants.some((row) => row.item_variant_id === currentVariantId) && (
              <option value={fieldVariantId}>{fieldLabel}</option>
            )}
          {selectableVariants.map((row) => (
            <option key={row.item_variant_id} value={row.item_variant_id}>
              {row.item_variant_name} ({row.item_variant_code})
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Unidad" required error={uomError}>
          <Select
            aria-label={`Unidad línea ${index + 1}`}
            error={Boolean(uomError)}
            {...register(`lines.${index}.entry_uom_id`)}
          >
            <option value="">Selecciona una unidad</option>
            {uoms.map((uom) => (
              <option key={uom.id} value={uom.id}>
                {uom.code} — {uom.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Cantidad" required error={quantityError}>
          <Input
            aria-label={`Cantidad línea ${index + 1}`}
            type="number"
            step="any"
            min="0"
            error={Boolean(quantityError)}
            {...register(`lines.${index}.entry_quantity`, { valueAsNumber: true })}
          />
        </FormField>
      </div>

      {previewLoading && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Calculando disponibilidad en origen…
        </p>
      )}

      {!previewLoading && previewErrorMessage && (
        <p className="text-xs text-destructive">{previewErrorMessage}</p>
      )}

      {!previewLoading && !previewErrorMessage && preview && (
        <p className="text-xs text-muted-foreground">
          Disponible en origen (referencial): <strong>{preview.source_available}</strong>{' '}
          {preview.base_uom} de {preview.source_on_hand} en existencia
          {preview.conversion_applies && (
            <>
              {' '}
              · Esta línea moverá <strong>{preview.base_quantity}</strong> {preview.base_uom}
            </>
          )}
          . Este dato es solo referencial — la disponibilidad real se valida al confirmar el
          traslado.
        </p>
      )}
    </div>
  )
}
