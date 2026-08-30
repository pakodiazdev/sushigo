import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Checkbox, Select } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import type { PurchasePresentationTemplate } from '@/types/inventory'
import { PACKAGE_TYPE_OPTIONS, usePurchasePresentationTemplateForm } from './use-purchase-presentation-template-form'

interface PurchasePresentationTemplateFormProps {
  template?: PurchasePresentationTemplate | null
  onSuccess: (template: PurchasePresentationTemplate) => void
  onCancel: () => void
}

export function PurchasePresentationTemplateForm({
  template,
  onSuccess,
  onCancel,
}: Readonly<PurchasePresentationTemplateFormProps>) {
  const isEditing = !!template
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
    isSubmitting,
    canSuggestCode,
    isCodeSuggested,
    isSuggestionLoading,
    isRefreshingCode,
    suggestionFailed,
    handleRefreshCode,
    collision,
    canApplySuggestedCode,
    applySuggestedCode,
  } = usePurchasePresentationTemplateForm({ template, onSuccess })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <FormField label="Código" required error={allErrors.code}>
          <div className="flex gap-2">
            <Input {...codeField} onChange={onCodeChange} placeholder="BOX_24" error={!!allErrors.code} />
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Regenerar código"
                onClick={handleRefreshCode}
                disabled={!canSuggestCode || isSuggestionLoading || isRefreshingCode}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshingCode ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
          {!isEditing && isCodeSuggested && !suggestionFailed && (
            <p className="mt-1 text-xs text-muted-foreground">Sugerido automáticamente; puedes modificarlo.</p>
          )}
          {!isEditing && suggestionFailed && (
            <p className="mt-1 text-xs text-amber-600">No se pudo sugerir un código; escríbelo manualmente o vuelve a intentarlo.</p>
          )}
          {collision && (
            <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
              <p>El código {collision.rejectedCode} acaba de ser utilizado. Te proponemos {collision.suggestedCode}. Vuelve a enviar para confirmar.</p>
              {canApplySuggestedCode && (
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={applySuggestedCode}>
                  Usar {collision.suggestedCode}
                </Button>
              )}
            </div>
          )}
        </FormField>

        <FormField label="Nombre" required error={allErrors.name}>
          <Input {...register('name')} placeholder="Ej. Caja x24" error={!!allErrors.name} />
        </FormField>

        <FormField label="Tipo de empaque" required error={allErrors.package_type}>
          <Select {...register('package_type')} error={!!allErrors.package_type}>
            <option value="">Selecciona un tipo de empaque…</option>
            {PACKAGE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Cantidad base"
          required
          error={allErrors.base_unit_quantity}
          hint="Cuántas unidades compatibles contiene este empaque; por ejemplo, 24 para una caja de 24."
        >
          <Input
            {...register('base_unit_quantity')}
            type="number"
            step="0.0001"
            min="0.0001"
            placeholder="Ej. 24"
            error={!!allErrors.base_unit_quantity}
          />
        </FormField>

        <FormField label="Unidad compatible" required error={allErrors.compatible_dimension_uom_id}>
          <Select
            {...register('compatible_dimension_uom_id')}
            error={!!allErrors.compatible_dimension_uom_id}
            disabled={isUomsLoading}
          >
            <option value="">Selecciona una unidad…</option>
            {uoms.map((uom) => (
              <option key={uom.id} value={uom.id}>
                {uom.name} ({uom.symbol})
              </option>
            ))}
          </Select>
        </FormField>

        <Checkbox
          id="template-is-active"
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Actualizar' : 'Crear'} plantilla
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
