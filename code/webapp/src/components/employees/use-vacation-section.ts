import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getApiValidationErrors } from '@/lib/api-error'
import { useVacationEntitlements, useRegisterEntitlement } from '@/services/vacation-hooks'

const currentYear = new Date().getFullYear()

const schema = z.object({
  year: z.number().int().min(2000).max(2100),
})

type FormValues = z.infer<typeof schema>

export function useVacationSection(employeeId: string) {
  const [showForm, setShowForm] = useState(false)

  const { data: entitlements = [], isLoading } = useVacationEntitlements(employeeId)
  const mutation = useRegisterEntitlement(employeeId)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { year: currentYear },
  })

  function openForm() {
    form.reset({ year: currentYear })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    form.clearErrors()
  }

  async function handleSubmit(values: FormValues) {
    try {
      await mutation.mutateAsync(values)
      closeForm()
    } catch (error: unknown) {
      const fieldErrors = getApiValidationErrors(error)
      if (fieldErrors.year) {
        form.setError('year', { message: fieldErrors.year })
      }
    }
  }

  return {
    entitlements,
    isLoading,
    showForm,
    openForm,
    closeForm,
    form,
    handleSubmit: form.handleSubmit(handleSubmit),
    isPending: mutation.isPending,
  }
}
