import { Loader2, RefreshCw } from 'lucide-react'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Checkbox } from '@/components/ui/form-fields'
import type { ItemVariant, UnitOfMeasure, Item } from '@/types/inventory'
import { useLegacyVariantForm } from './use-legacy-variant-form'

interface VariantFormProps {
  variant?: ItemVariant | null
  onSuccess: () => void
  onCancel: () => void
  preselectedItemId?: string | number
}

export function VariantForm({ variant, onSuccess, onCancel, preselectedItemId }: Readonly<VariantFormProps>) {
  const isEditing = !!variant
  const {
    items,
    units,
    register,
    codeField,
    onCodeChange,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    itemId,
    uomId,
    isActive,
    isPending,
    isSubmitDisabled,
    canSuggestCode,
    isCodeSuggested,
    isSuggestionLoading,
    isRefreshingCode,
    suggestionFailed,
    handleRefreshCode,
    collision,
    canApplySuggestedCode,
    applySuggestedCode,
  } = useLegacyVariantForm({ variant, onSuccess, preselectedItemId })

  let codeHint: string | undefined
  if (isSuggestionLoading) {
    codeHint = 'Generando una sugerencia contextual…'
  } else if (isCodeSuggested) {
    codeHint = 'Sugerencia editable; puedes reemplazarla.'
  } else if (suggestionFailed) {
    codeHint = 'No fue posible generar una sugerencia. Puedes capturar el SKU manualmente.'
  } else if (!isEditing && !canSuggestCode) {
    codeHint = 'Completa el artículo, nombre y unidad para generar una sugerencia.'
  }

  return (
    <>
      <SlidePanel.Header>
        <h2 className="text-lg font-semibold">
          {isEditing ? 'Editar variante' : 'Nueva variante'}
        </h2>
      </SlidePanel.Header>

      <SlidePanel.Body>
        <form id="variant-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Item Select */}
          <FormField
            label="Artículo"
            required
            error={allErrors.item_id}
          >
            <Select
              value={itemId.toString()}
              onChange={(e) => setValue('item_id', e.target.value)}
              disabled={isEditing}
            >
              <option value="">Selecciona un artículo...</option>
              {items.map((item: Item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} - {item.name}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Code */}
          <FormField
            label="SKU de variante"
            required
            error={allErrors.code}
            hint={codeHint}
          >
            <div className="flex gap-2">
              <Input {...codeField} onChange={onCodeChange} placeholder="Ej. HAR-KG" error={!!allErrors.code} />
              {!isEditing && (
                <Button type="button" variant="outline" onClick={handleRefreshCode} disabled={!canSuggestCode || isRefreshingCode}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshingCode ? 'animate-spin' : ''}`} />
                  Regenerar
                </Button>
              )}
            </div>
          </FormField>

          {!isEditing && collision && (
            <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              <p>El SKU {collision.rejectedCode} acaba de ser utilizado. Te proponemos {collision.suggestedCode}. Vuelve a enviar para confirmar.</p>
              {canApplySuggestedCode && (
                <Button type="button" variant="outline" className="mt-2" onClick={applySuggestedCode}>
                  Usar {collision.suggestedCode}
                </Button>
              )}
            </div>
          )}

          {/* Name */}
          <FormField
            label="Nombre de la variante"
            required
            error={allErrors.name}
            hint="Nombre descriptivo (ej. Grande, 1 kilogramo, 500 ml)"
          >
            <Input
              {...register('name')}
              placeholder="Ej. 1 kilogramo"
              error={!!allErrors.name}
            />
          </FormField>

          {/* Unit of Measure */}
          <FormField
            label="Unidad de medida"
            required
            error={allErrors.uom_id}
          >
            <Select
              value={uomId.toString()}
              onChange={(e) => setValue('uom_id', e.target.value)}
            >
              <option value="">Selecciona una unidad...</option>
              {units.map((uom: UnitOfMeasure) => (
                <option key={uom.id} value={uom.id}>
                  {uom.name} ({uom.symbol}) - {uom.type}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Replenishment thresholds are configured per Inventory Location (#439) —
              see the Stock Dashboard's per-location "Replenishment thresholds" panel.
              Acquisition cost is derived from purchase receipts / opening balances
              (Stock.weighted_avg_cost, #434) and sale price from effective-dated
              price lists (#435); neither is a catalog field any more (#442). */}

          {/* Active Status */}
          <FormField label="">
            <Checkbox
              checked={isActive}
              onChange={(e) => setValue('is_active', e.target.checked)}
              label="Activa"
            />
          </FormField>
        </form>
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="variant-form"
            disabled={isSubmitDisabled}
            className="flex-1"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </SlidePanel.Footer>
    </>
  )
}
