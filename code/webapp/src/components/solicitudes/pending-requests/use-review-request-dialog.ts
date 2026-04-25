import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useApproveEmployeeRequest, useRejectEmployeeRequest } from '@/services/employee-request-hooks'
import type { EmployeeRequest, ExtraDayPayload } from '@/types/employee-request'

const schema = z.object({
  salary_type: z.enum(['registered', 'agreed']),
  salary_pct: z.number().min(0).max(100),
  prima_type: z.enum(['legal', 'agreed']),
  prima_pct: z.number().min(0).max(200),
  notes: z.string().max(1000).optional(),
  reject_reason: z.string().max(1000).optional(),
})

type FormValues = z.infer<typeof schema>

export type { FormValues as ReviewRequestFormValues }

export function useReviewRequestDialog(request: EmployeeRequest, onClose: () => void) {
  const payload = request.payload as ExtraDayPayload | null
  const proposedSalaryPct = payload?.salary_pct ?? 100
  const proposedSalaryDay = payload?.salary_day ?? 0
  const proposedPrimaPct = payload?.prima_pct ?? 100
  const baseDailyWage = proposedSalaryPct > 0 ? (proposedSalaryDay / proposedSalaryPct) * 100 : proposedSalaryDay

  const [showRejectConfirm, setShowRejectConfirm] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      salary_type: 'registered',
      salary_pct: proposedSalaryPct,
      prima_type: 'legal',
      prima_pct: 100,
      notes: '',
      reject_reason: '',
    },
  })

  const approveMutation = useApproveEmployeeRequest()
  const rejectMutation = useRejectEmployeeRequest()

  const watchedSalaryType = form.watch('salary_type')
  const watchedSalaryPct = form.watch('salary_pct')
  const watchedPrimaType = form.watch('prima_type')
  const watchedPrimaPct = form.watch('prima_pct')

  const salaryDay =
    watchedSalaryType === 'registered'
      ? proposedSalaryDay
      : (baseDailyWage * watchedSalaryPct) / 100

  const effectivePrimaPct = watchedPrimaType === 'legal' ? 100 : watchedPrimaPct
  const prima = (salaryDay * effectivePrimaPct) / 100
  const seventhDay = salaryDay
  const total = salaryDay + seventhDay + prima

  function handleApprove(values: FormValues) {
    const overrides = {
      salary_pct: watchedSalaryType === 'agreed' ? values.salary_pct : proposedSalaryPct,
      salary_day: salaryDay,
      prima_pct: effectivePrimaPct,
      prima,
      seventh_day: seventhDay,
      total,
      notes: values.notes || undefined,
    }

    approveMutation.mutate(
      { id: request.id, data: overrides },
      { onSuccess: () => { form.reset(); onClose() } },
    )
  }

  function handleReject(values: FormValues) {
    rejectMutation.mutate(
      { id: request.id, reason: values.reject_reason || undefined },
      { onSuccess: () => { form.reset(); setShowRejectConfirm(false); onClose() } },
    )
  }

  return {
    form,
    salaryDay,
    prima,
    seventhDay,
    total,
    effectivePrimaPct,
    proposedSalaryDay,
    proposedPrimaPct,
    baseDailyWage,
    showRejectConfirm,
    setShowRejectConfirm,
    handleApprove,
    handleReject,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  }
}
