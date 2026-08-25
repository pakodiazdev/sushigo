import { Loader2 } from 'lucide-react'
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
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    isActive,
    isSubmitting,
  } = useSupplierForm({ supplier, onSuccess })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-5">
        <FormField label="Código" required error={allErrors.code}>
          <Input aria-label="Código" {...register('code')} error={Boolean(allErrors.code)} placeholder="PROV-001" />
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
