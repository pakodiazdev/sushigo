import { useEffect, useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useOvertimeValuationPreview } from '@/services/attendance-hooks'
import { getApiFieldError } from '@/lib/api-error'
import type { OvertimeValuationMethod } from '@/types/attendance'

const methodSchema = z
  .object({
    valuation_method: z.enum(['LFT_PROPORTIONAL', 'AGREED_RATE', 'SALARY_FACTOR']),
    agreed_rate: z.string().optional(),
    agreed_factor: z.string().optional(),
  })
  .refine(
    (data) => data.valuation_method !== 'AGREED_RATE' || Number(data.agreed_rate) > 0,
    { message: 'La tarifa pactada debe ser un número mayor a 0', path: ['agreed_rate'] },
  )
  .refine(
    (data) => data.valuation_method !== 'SALARY_FACTOR' || Number(data.agreed_factor) > 0,
    { message: 'El factor debe ser un número mayor a 0', path: ['agreed_factor'] },
  )

export type OvertimeMethodFormValues = z.infer<typeof methodSchema>

interface PreviewParams {
  valuation_method: OvertimeValuationMethod
  agreed_rate?: number
  agreed_factor?: number
}

interface UseOvertimeDecisionDialogArgs {
  isOpen: boolean
  attendanceId: string | null
  onAuthorize: (method: OvertimeValuationMethod, agreedRate?: number, agreedFactor?: number) => void
}

const PREVIEW_DEBOUNCE_MS = 400

/**
 * Manages the two-step overtime decision dialog: confirm pay/no-pay, then
 * (if paying) pick the valuation method with a debounced live cost preview.
 */
export function useOvertimeDecisionDialog({ isOpen, attendanceId, onAuthorize }: UseOvertimeDecisionDialogArgs) {
  const [step, setStep] = useState<'confirm' | 'method'>('confirm')

  const form = useForm<OvertimeMethodFormValues>({
    resolver: zodResolver(methodSchema),
    defaultValues: { valuation_method: 'LFT_PROPORTIONAL', agreed_rate: '', agreed_factor: '' },
  })

  // Reset to the first step and clear the form whenever a new decision opens.
  useEffect(() => {
    if (isOpen) {
      setStep('confirm')
      form.reset({ valuation_method: 'LFT_PROPORTIONAL', agreed_rate: '', agreed_factor: '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handlePagar = () => setStep('method')
  const handleBack = () => setStep('confirm')

  const onSubmitMethod: SubmitHandler<OvertimeMethodFormValues> = (values) => {
    onAuthorize(
      values.valuation_method,
      values.valuation_method === 'AGREED_RATE' ? Number(values.agreed_rate) : undefined,
      values.valuation_method === 'SALARY_FACTOR' ? Number(values.agreed_factor) : undefined,
    )
  }

  // ── Live cost preview ────────────────────────────────────────────────────

  const valuationMethod = form.watch('valuation_method')
  const agreedRate = form.watch('agreed_rate')
  const agreedFactor = form.watch('agreed_factor')

  const readyParams: PreviewParams | null = (() => {
    if (valuationMethod === 'AGREED_RATE') {
      const rate = Number(agreedRate)
      return rate > 0 ? { valuation_method: valuationMethod, agreed_rate: rate } : null
    }
    if (valuationMethod === 'SALARY_FACTOR') {
      const factor = Number(agreedFactor)
      return factor > 0 ? { valuation_method: valuationMethod, agreed_factor: factor } : null
    }
    return { valuation_method: valuationMethod }
  })()

  const [debouncedParams, setDebouncedParams] = useState<PreviewParams | null>(readyParams)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedParams(readyParams), PREVIEW_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuationMethod, agreedRate, agreedFactor])

  const previewQuery = useOvertimeValuationPreview(
    step === 'method' ? attendanceId : null,
    step === 'method' ? debouncedParams : null,
  )

  const previewError = previewQuery.isError
    ? getApiFieldError(previewQuery.error, 'valuation_method', 'No se pudo calcular el monto estimado.')
    : null

  return {
    step,
    form,
    handlePagar,
    handleBack,
    onSubmitMethod,
    preview: previewQuery.data,
    isPreviewLoading: previewQuery.isFetching,
    previewError,
  }
}
