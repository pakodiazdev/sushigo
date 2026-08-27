import { zodResolver } from '@hookform/resolvers/zod'
import { type ChangeEventHandler, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useFormMutation } from '@/hooks/use-form-mutation'
import { useSuggestedCode } from '@/hooks/use-suggested-code'
import { isApiError } from '@/lib/api-error'
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

/** Extra keys the create endpoint adds to the standard 422 body on a code race. */
interface CodeCollisionResponse {
  rejected_code?: string
  suggested_code?: string
}

export interface SupplierCodeCollision {
  rejectedCode: string
  suggestedCode: string
}

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

  // ── Server-suggested code (create mode only) ────────────────────────────────
  const suggestion = useSuggestedCode(
    ['suppliers', 'next-code'],
    async () => (await supplierApi.nextCode()).data,
    !isEditing,
  )

  // `true` once the operator types in the code field — their value is never
  // overwritten by a fetched or collision-regenerated suggestion after that.
  // The ref mirrors the state so async callbacks (submit → collision) read the
  // current value instead of a stale render's.
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false)
  const codeManuallyEditedRef = useRef(false)
  const setManualEdited = (value: boolean) => {
    codeManuallyEditedRef.current = value
    setCodeManuallyEdited(value)
  }
  // A suggestion we have committed to showing after a collision, overriding the
  // query's value until the operator refreshes or edits the field.
  const [pinnedCode, setPinnedCode] = useState<string | null>(null)
  const [collision, setCollision] = useState<SupplierCodeCollision | null>(null)

  const prefillCode = pinnedCode ?? suggestion.suggestedCode

  useEffect(() => {
    if (!isEditing && !codeManuallyEdited && prefillCode) {
      setValue('code', prefillCode, { shouldValidate: false })
    }
  }, [isEditing, codeManuallyEdited, prefillCode, setValue])

  const codeField = register('code')
  const onCodeChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    void codeField.onChange(event)
    setManualEdited(true)
    setPinnedCode(null)
    setCollision(null)
  }

  const handleRefreshCode = () => {
    setManualEdited(false)
    setPinnedCode(null)
    setCollision(null)
    suggestion.refresh()
  }

  // ── Mutation ───────────────────────────────────────────────────────────────
  const { mutation, validationErrors, clearValidationErrors, isPending } = useFormMutation({
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

  const applyCollision = (values: SupplierFormValues, body: CodeCollisionResponse) => {
    const next: SupplierCodeCollision = {
      rejectedCode: body.rejected_code ?? values.code.toUpperCase(),
      suggestedCode: body.suggested_code as string,
    }
    setCollision(next)
    // An untouched generated value is replaced in place; the operator still has
    // to submit again. The stale "code already taken" field error from the failed
    // submit is cleared — it applied to the rejected code, not the fresh one.
    // A manually chosen value is left alone (error kept) — the view offers an
    // explicit "use this instead" action driven by `collision`.
    if (!codeManuallyEditedRef.current) {
      setPinnedCode(next.suggestedCode)
      setValue('code', next.suggestedCode, { shouldValidate: false })
      clearValidationErrors()
    }
  }

  const applySuggestedCode = () => {
    if (!collision) return
    setValue('code', collision.suggestedCode, { shouldValidate: true })
    setPinnedCode(collision.suggestedCode)
    setManualEdited(false)
    setCollision(null)
    clearValidationErrors()
  }

  const onSubmit = async (values: SupplierFormValues) => {
    clearValidationErrors()
    try {
      await mutation.mutateAsync(values)
      setCollision(null)
      setPinnedCode(null)
    } catch (error) {
      const body = isApiError(error)
        ? (error.response?.data as CodeCollisionResponse | undefined)
        : undefined
      if (body?.suggested_code) {
        applyCollision(values, body)
      }
    }
  }

  const allErrors = {
    code: errors.code?.message || validationErrors.code,
    name: errors.name?.message || validationErrors.name,
    contact_name: errors.contact_name?.message || validationErrors.contact_name,
    email: errors.email?.message || validationErrors.email,
    phone: errors.phone?.message || validationErrors.phone,
  }

  return {
    isEditing,
    register,
    codeField,
    onCodeChange,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    isActive: watch('is_active'),
    isSubmitting: isPending,
    // Suggested-code UI
    isCodeSuggested: !isEditing && !codeManuallyEdited,
    isSuggestionLoading: suggestion.isLoading,
    isRefreshingCode: suggestion.isRefreshing,
    suggestionFailed: suggestion.isError,
    handleRefreshCode,
    collision,
    canApplySuggestedCode: collision !== null && codeManuallyEdited,
    applySuggestedCode,
  }
}
