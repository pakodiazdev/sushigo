import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Textarea, Checkbox, Select } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import type { ProductVariant } from '@/types/inventory'
import { useVariantForm } from './use-variant-form'

interface VariantFormProps {
  productId: string
  variant?: ProductVariant | null
  onSuccess: (variant: ProductVariant) => void
  onCancel: () => void
}

export function VariantForm({ productId, variant, onSuccess, onCancel }: Readonly<VariantFormProps>) {
  const isEditing = !!variant
  const {
    uoms,
    isUomsLoading,
    register,
    codeField,
    onCodeChange,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    isActive,
    trackLot,
    trackSerial,
    isSubmitting,
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
  } = useVariantForm({ productId, variant, onSuccess })

  let codeHint: string | undefined
  if (isSuggestionLoading) {
    codeHint = 'Generando una sugerencia contextual…'
  } else if (isCodeSuggested) {
    codeHint = 'Sugerencia editable; puedes reemplazarla.'
  } else if (suggestionFailed) {
    codeHint = 'No fue posible generar una sugerencia. Puedes capturar el SKU manualmente.'
  } else if (!isEditing && !canSuggestCode) {
    codeHint = 'Completa el nombre y la unidad base para generar una sugerencia.'
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <FormField label="Nombre de la variante" required error={allErrors.name}>
          <Input
            {...register('name')}
            placeholder="Ej. 1 kg"
            error={!!allErrors.name}
          />
        </FormField>

        <FormField
          label="SKU"
          required
          error={allErrors.code}
          hint={codeHint}
        >
          <div className="flex gap-2">
            <Input {...codeField} onChange={onCodeChange} placeholder="Ej. ARR-KG" error={!!allErrors.code} />
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRefreshCode}
                disabled={!canSuggestCode || isRefreshingCode}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshingCode ? 'animate-spin' : ''}`} />
                Regenerar
              </Button>
            )}
          </div>
        </FormField>

        {!isEditing && collision && (
          <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <p>
              El SKU {collision.rejectedCode} acaba de ser utilizado. Te proponemos{' '}
              {collision.suggestedCode}. Vuelve a enviar el formulario para confirmar.
            </p>
            {canApplySuggestedCode && (
              <Button type="button" variant="outline" className="mt-2" onClick={applySuggestedCode}>
                Usar {collision.suggestedCode}
              </Button>
            )}
          </div>
        )}

        <FormField label="Código de barras" error={allErrors.barcode}>
          <Input {...register('barcode')} placeholder="Opcional" error={!!allErrors.barcode} />
        </FormField>

        <FormField label="Unidad base" required error={allErrors.uom_id}>
          <Select {...register('uom_id')} error={!!allErrors.uom_id} disabled={isUomsLoading}>
            <option value="">Selecciona una unidad base…</option>
            {uoms.map((uom) => (
              <option key={uom.id} value={uom.id}>
                {uom.name} ({uom.symbol})
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Descripción">
          <Textarea {...register('description')} rows={3} placeholder="Notas opcionales…" />
        </FormField>

        <Checkbox
          id="variant-track-lot"
          checked={trackLot}
          onChange={(e) => setValue('track_lot', e.target.checked)}
          label="Rastrear lotes"
        />

        <Checkbox
          id="variant-track-serial"
          checked={trackSerial}
          onChange={(e) => setValue('track_serial', e.target.checked)}
          label="Rastrear números de serie"
        />

        <Checkbox
          id="variant-is-active"
          checked={isActive}
          onChange={(e) => setValue('is_active', e.target.checked)}
          label="Activa"
        />
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitDisabled}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Actualizar' : 'Crear'} variante
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
