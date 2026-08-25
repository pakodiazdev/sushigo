import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useFormMutation } from '@/hooks/use-form-mutation'
import { supplierApi } from '../api/supplier-api'
import type { Supplier } from '../types'

const supplierSchema = z.object({
  code: z.string().trim().min(1, 'El código es requerido').max(50, 'El código no puede exceder 50 caracteres'),
  name: z.string().trim().min(1, 'El nombre es requerido').max(255, 'El nombre no puede exceder 255 caracteres'),
  contact_name: z.string().trim().max(255, 'El contacto no puede exceder 255 caracteres'),
  email: z.union([z.literal(''), z.string().email('Ingresa un correo válido')]),
  phone: z.string().trim().max(50, 'El teléfono no puede exceder 50 caracteres'),
  is_active: z.boolean(),
})

export type SupplierFormValues = z.infer<typeof supplierSchema>

export interface UseSupplierFormOptions {
  supplier?: Supplier | null
  onSuccess: () => void
}

export function useSupplierForm({ supplier, onSuccess }: Readonly<UseSupplierFormOptions>) {
  const isEditing = Boolean(supplier)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      code: supplier?.code ?? '',
      name: supplier?.name ?? '',
      contact_name: supplier?.contact_name ?? '',
      email: supplier?.email ?? '',
      phone: supplier?.phone ?? '',
      is_active: supplier?.is_active ?? true,
    },
  })

  const { execute, validationErrors, isPending } = useFormMutation({
    mutationFn: (values: SupplierFormValues) => {
      const data = {
        ...values,
        code: values.code.toUpperCase(),
        contact_name: values.contact_name || null,
        email: values.email || null,
        phone: values.phone || null,
      }
      return supplier ? supplierApi.update(supplier.id, data) : supplierApi.create(data)
    },
    successMessage: isEditing ? 'Proveedor actualizado' : 'Proveedor creado',
    errorMessageFallback: 'No fue posible guardar el proveedor',
    onSuccess,
  })

  const allErrors = {
    code: errors.code?.message || validationErrors.code,
    name: errors.name?.message || validationErrors.name,
    contact_name: errors.contact_name?.message || validationErrors.contact_name,
    email: errors.email?.message || validationErrors.email,
    phone: errors.phone?.message || validationErrors.phone,
  }

  const onSubmit = async (values: SupplierFormValues) => {
    await execute(values)
  }

  return {
    isEditing,
    register,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    isActive: watch('is_active'),
    isSubmitting: isPending,
  }
}
