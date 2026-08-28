import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ChangeEventHandler, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useToast } from '@/components/ui/toast-context'
import { useSuggestedCode } from '@/hooks/use-suggested-code'
import { getApiErrorMessage, isApiError } from '@/lib/api-error'
import { cashRegisterApi } from '@/services/cash-api'
import { useUpdateCashRegister } from '@/services/cash-hooks'
import { CashRegisterType, type CashRegister } from '@/types/cash'

const cashRegisterSchema = z
  .object({
    code: z.string().min(1, 'Este campo es requerido'),
    name: z.string().min(1, 'Este campo es requerido'),
    branch_id: z.number().min(1, 'La sucursal es requerida'),
    operating_unit_id: z.number().nullable(),
    type: z.nativeEnum(CashRegisterType),
    is_active: z.boolean(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => !(data.type === CashRegisterType.EVENT && !data.operating_unit_id), {
    message: 'La unidad operativa es requerida para cajas de eventos',
    path: ['operating_unit_id'],
  })

export type CashRegisterFormValues = z.infer<typeof cashRegisterSchema>

/** Extra keys the create endpoint adds to the standard 422 body on a code race. */
interface CodeCollisionResponse {
  rejected_code?: string
  suggested_code?: string
  errors?: { code?: string[] }
}

/**
 * The 422 body of a lost create-time code race, or `undefined` for any other
 * error. A race is recovered inline (fresh suggestion + explicit action), so the
 * create mutation deliberately stays silent for it instead of showing the
 * generic red failure toast.
 */
function collisionResponse(error: unknown): CodeCollisionResponse | undefined {
  const body = isApiError(error)
    ? (error.response?.data as CodeCollisionResponse | undefined)
    : undefined

  return body?.suggested_code ? body : undefined
}

export interface CashRegisterCodeCollision {
  rejectedCode: string
  suggestedCode: string
}

export interface UseCashRegisterFormOptions {
  register?: CashRegister | null
  /**
   * Whether the create/edit panel is currently visible. `CashRegistersPage`
   * keeps `CashRegisterForm` mounted even while its `SlidePanel` is closed, so
   * the suggested-code query must be gated on this rather than on create-mode
   * alone — otherwise it fetches once on page load and never refreshes when the
   * panel is reopened (presenting a stale, possibly already-taken code).
   */
  isOpen: boolean
  onSuccess: () => void
  onClose: () => void
}

function defaultsFor(register?: CashRegister | null): CashRegisterFormValues {
  return {
    code: register?.code ?? '',
    name: register?.name ?? '',
    branch_id: register?.branch_id ?? 1,
    operating_unit_id: register?.operating_unit_id ?? null,
    type: register?.type ?? CashRegisterType.ON_PREMISE,
    is_active: register?.is_active ?? true,
    meta: register?.meta ?? undefined,
  }
}

export function useCashRegisterForm({
  register,
  isOpen,
  onSuccess,
  onClose,
}: Readonly<UseCashRegisterFormOptions>) {
  const isEditing = Boolean(register)

  const {
    register: registerField,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CashRegisterFormValues>({
    resolver: zodResolver(cashRegisterSchema),
    defaultValues: defaultsFor(register),
  })

  // ── Server-suggested code (create mode, panel open only) ────────────────────
  // `staleTime: 0` inside useSuggestedCode means re-enabling this query when the
  // panel reopens triggers a fresh fetch, so a code taken since the last open is
  // never presented.
  const suggestion = useSuggestedCode(
    ['cash-registers', 'next-code'],
    async () => (await cashRegisterApi.nextCode()).data,
    isOpen && !isEditing,
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
  const [collision, setCollision] = useState<CashRegisterCodeCollision | null>(null)
  // The server's Spanish `errors.code` message from a lost create-time race,
  // shown inline under the field until the operator edits, refreshes, adopts
  // the fresh suggestion, or resubmits.
  const [serverCodeError, setServerCodeError] = useState<string | null>(null)

  // The panel stays mounted across open/close and register swaps, so re-sync the
  // form and the suggested-code bookkeeping every time it opens or its target
  // register changes. Gating on `isOpen` also means reopening a create panel
  // clears a previously typed value and lets the re-enabled query hand back a
  // fresh code.
  useEffect(() => {
    if (!isOpen) return
    reset(defaultsFor(register))
    setManualEdited(false)
    setPinnedCode(null)
    setCollision(null)
    setServerCodeError(null)
  }, [isOpen, register, reset])

  const prefillCode = pinnedCode ?? suggestion.suggestedCode

  useEffect(() => {
    if (!isEditing && !codeManuallyEdited && prefillCode) {
      setValue('code', prefillCode, { shouldValidate: false })
    }
  }, [isEditing, codeManuallyEdited, prefillCode, setValue])

  const codeField = registerField('code')
  const onCodeChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    void codeField.onChange(event)
    setManualEdited(true)
    setPinnedCode(null)
    setCollision(null)
    setServerCodeError(null)
  }

  const handleRefreshCode = () => {
    setManualEdited(false)
    setPinnedCode(null)
    setCollision(null)
    setServerCodeError(null)
    suggestion.refresh()
  }

  // ── Mutations ──────────────────────────────────────────────────────────────
  // Create is owned here (not the shared useCreateCashRegister) so a lost
  // code race can stay silent: `collisionResponse` errors are recovered by the
  // inline suggestion UI below, and the generic failure toast would contradict
  // that graceful path.
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()
  const createMutation = useMutation({
    mutationFn: (values: CashRegisterFormValues) => cashRegisterApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-registers'] })
      showSuccess('La caja registradora ha sido creada exitosamente.', 'Caja registradora creada')
    },
    onError: (error: unknown) => {
      if (collisionResponse(error)) return
      showError(getApiErrorMessage(error, 'No se pudo crear la caja registradora.'), 'Error')
    },
  })
  const updateMutation = useUpdateCashRegister()
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const applyCollision = (values: CashRegisterFormValues, body: CodeCollisionResponse) => {
    const next: CashRegisterCodeCollision = {
      rejectedCode: body.rejected_code ?? values.code,
      suggestedCode: body.suggested_code as string,
    }
    setCollision(next)
    setServerCodeError(body.errors?.code?.[0] ?? null)
    // An untouched generated value is replaced in place; the operator still has
    // to submit again. The stale "code already taken" field error is cleared —
    // it applied to the rejected code, not the fresh one. A manually chosen
    // value is left alone (error kept) — the view offers an explicit "use this
    // instead" action driven by `collision`.
    if (!codeManuallyEditedRef.current) {
      setPinnedCode(next.suggestedCode)
      setValue('code', next.suggestedCode, { shouldValidate: false })
      setServerCodeError(null)
    }
  }

  const applySuggestedCode = () => {
    if (!collision) return
    setValue('code', collision.suggestedCode, { shouldValidate: true })
    setPinnedCode(collision.suggestedCode)
    setManualEdited(false)
    setCollision(null)
    setServerCodeError(null)
  }

  const onSubmit = async (values: CashRegisterFormValues) => {
    setServerCodeError(null)
    try {
      if (isEditing && register) {
        await updateMutation.mutateAsync({ id: register.id, data: values })
      } else {
        await createMutation.mutateAsync(values)
      }
      setCollision(null)
      setPinnedCode(null)
      onSuccess()
      onClose()
    } catch (error) {
      const body = collisionResponse(error)
      if (body) {
        applyCollision(values, body)
      }
    }
  }

  return {
    isEditing,
    registerField,
    codeField,
    onCodeChange,
    handleSubmit,
    setValue,
    onSubmit,
    errors,
    codeError: errors.code?.message ?? serverCodeError ?? undefined,
    values: {
      code: watch('code'),
      name: watch('name'),
      branchId: watch('branch_id'),
      operatingUnitId: watch('operating_unit_id'),
      type: watch('type'),
      isActive: watch('is_active'),
    },
    isSubmitting,
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
