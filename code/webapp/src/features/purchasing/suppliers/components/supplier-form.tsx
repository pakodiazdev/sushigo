import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField, Checkbox } from '@/components/ui/form-fields'
import { Input } from '@/components/ui/input'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useSupplierForm } from '../hooks/use-supplier-form'
import type { Supplier } from '../types'

interface SupplierFormProps {
  supplier?: Supplier | null
  onSuccess: () => void
  onCancel: () => void
}

export function SupplierForm({ supplier, onSuccess, onCancel }: Readonly<SupplierFormProps>) {
  const {
    isEditing,
    register,
    codeField,
    onCodeChange,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    isActive,
    isSubmitting,
    isCodeSuggested,
    isSuggestionLoading,
    isRefreshingCode,
    suggestionFailed,
    handleRefreshCode,
    collision,
    canApplySuggestedCode,
    applySuggestedCode,
  } = useSupplierForm({ supplier, onSuccess })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-5">
        <FormField label="Código" required error={allErrors.code}>
          <div className="flex gap-2">
            <Input
              aria-label="Código"
              {...codeField}
              onChange={onCodeChange}
              error={Boolean(allErrors.code)}
              placeholder="PROV-001"
            />
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Sugerir otro código"
                onClick={handleRefreshCode}
                disabled={isSuggestionLoading || isRefreshingCode}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshingCode ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
          {!isEditing && isCodeSuggested && !suggestionFailed && (
            <p className="mt-1 text-xs text-muted-foreground">
              Sugerido automáticamente; puedes modificarlo.
            </p>
          )}
          {!isEditing && suggestionFailed && (
            <p className="mt-1 text-xs text-amber-600">
              No se pudo sugerir un código; escríbelo manualmente o vuelve a intentarlo.
            </p>
          )}
          {collision && (
            <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
              <p>
                El código {collision.rejectedCode} acaba de ser utilizado. Te proponemos{' '}
                {collision.suggestedCode}.
              </p>
              {canApplySuggestedCode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={applySuggestedCode}
                >
                  Usar {collision.suggestedCode}
                </Button>
              )}
            </div>
          )}
        </FormField>
        <FormField label="Nombre del proveedor" required error={allErrors.name}>
          <Input aria-label="Nombre del proveedor" {...register('name')} error={Boolean(allErrors.name)} />
        </FormField>
        <FormField label="Contacto" error={allErrors.contact_name}>
          <Input aria-label="Contacto" {...register('contact_name')} error={Boolean(allErrors.contact_name)} />
        </FormField>
        <FormField label="Correo" error={allErrors.email}>
          <Input aria-label="Correo" type="email" {...register('email')} error={Boolean(allErrors.email)} />
        </FormField>
        <FormField label="Teléfono" error={allErrors.phone}>
          <Input aria-label="Teléfono" {...register('phone')} error={Boolean(allErrors.phone)} />
        </FormField>
        <Checkbox id="supplier-active" checked={isActive} onChange={(event) => setValue('is_active', event.target.checked)} label="Proveedor activo" />
      </SlidePanel.Body>
      <SlidePanel.Footer>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Actualizar' : 'Crear'} proveedor
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
