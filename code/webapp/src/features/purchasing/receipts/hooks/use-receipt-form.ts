import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useFormMutation } from '@/hooks/use-form-mutation'
import { receiptApi, type ReceiptPayload } from '../api/receipt-api'
import { receiptQueryKeys } from '../api/query-keys'
import type { Receipt } from '../types'

// Money fields follow the string-decimal(15,4) convention from #436 (VariantPrice) — the form
// sends gross_amount/discounts/allocated_expenses/non_recoverable_taxes as decimal strings so the
// value the user typed reaches the backend's decimal(15,4) validation unchanged, without an
// intermediate JS-number parse/reformat step. Floats are still fine for display and for the live
// preview math (compute-receipt-line-totals.ts) and are what the API actually returns — this
// convention only protects the outgoing payload. Package quantities follow #431's plain-number
// convention instead, since they're counts, not currency.
const moneyString = z
  .string()
  .min(1, 'Ingresa un monto')
  .regex(/^\d+(\.\d{1,4})?$/, 'Usa un monto válido con hasta 4 decimales')

// discounts/allocated_expenses/non_recoverable_taxes are optional on the backend
// (ReceiptRequest: 'nullable') — unlike gross_amount, clearing the field entirely must be a
// valid, submittable state, not a validation error.
const optionalMoneyString = z
  .string()
  .regex(/^$|^\d+(\.\d{1,4})?$/, 'Usa un monto válido con hasta 4 decimales')

const receiptLineSchema = z
  .object({
    // Client-only bookkeeping, never sent to the API — see toPayload() below.
    _isNew: z.boolean().optional(),
    _label: z.string().optional(),
    variant_purchase_presentation_id: z.string().min(1, 'Selecciona una presentación de compra'),
    supplier_offering_id: z.string(),
    ordered_packages: z.union([z.number().min(0, 'No puede ser negativo'), z.nan()]),
    received_packages: z
      .number({ message: 'Ingresa una cantidad válida' })
      .positive('Debe recibir al menos un paquete'),
    bonus_packages: z.union([z.number().min(0, 'No puede ser negativo'), z.nan()]),
    // Snapshotted from the chosen presentation's template — never sent to the API, the backend
    // always recomputes and snapshots its own factor server-side (ReceiptService::createLine()).
    // Used here purely to drive the live preview.
    presentation_factor: z.number(),
    gross_amount: moneyString,
    discounts: optionalMoneyString,
    allocated_expenses: optionalMoneyString,
    non_recoverable_taxes: optionalMoneyString,
  })
  .superRefine((line, context) => {
    const bonus = Number.isNaN(line.bonus_packages) ? 0 : line.bonus_packages
    if (bonus > line.received_packages) {
      context.addIssue({
        code: 'custom',
        path: ['bonus_packages'],
        message: 'No puede exceder los paquetes recibidos',
      })
    }
  })

const receiptSchema = z.object({
  supplier_id: z.string().min(1, 'Selecciona un proveedor'),
  destination_location_id: z.string().min(1, 'Selecciona una ubicación destino'),
  reference: z.string(),
  receipt_date: z.string().min(1, 'La fecha es requerida'),
  notes: z.string(),
  lines: z.array(receiptLineSchema).min(1, 'Agrega al menos una línea'),
})

export type ReceiptFormValues = z.infer<typeof receiptSchema>
export type ReceiptLineFormValues = ReceiptFormValues['lines'][number]

function newLine(): ReceiptLineFormValues {
  return {
    _isNew: true,
    variant_purchase_presentation_id: '',
    supplier_offering_id: '',
    ordered_packages: Number.NaN,
    received_packages: 1,
    bonus_packages: 0,
    presentation_factor: 0,
    gross_amount: '0',
    discounts: '0',
    allocated_expenses: '0',
    non_recoverable_taxes: '0',
  }
}

function lineToFormValues(line: Receipt['lines'][number]): ReceiptLineFormValues {
  return {
    _isNew: false,
    _label: line.variant ? `${line.variant.name} (${line.variant.code})` : 'Variante no disponible',
    variant_purchase_presentation_id: line.variant_purchase_presentation_id ?? '',
    supplier_offering_id: line.supplier_offering_id ?? '',
    ordered_packages: line.ordered_packages ?? Number.NaN,
    received_packages: line.received_packages,
    bonus_packages: line.bonus_packages,
    presentation_factor: line.presentation_factor,
    gross_amount: String(line.gross_amount),
    discounts: String(line.discounts),
    allocated_expenses: String(line.allocated_expenses),
    non_recoverable_taxes: String(line.non_recoverable_taxes),
  }
}

function toPayload(values: ReceiptFormValues): ReceiptPayload {
  return {
    supplier_id: values.supplier_id,
    destination_location_id: values.destination_location_id,
    reference: values.reference || null,
    receipt_date: values.receipt_date,
    notes: values.notes || null,
    lines: values.lines.map((line) => ({
      variant_purchase_presentation_id: line.variant_purchase_presentation_id,
      supplier_offering_id: line.supplier_offering_id || null,
      ordered_packages: Number.isNaN(line.ordered_packages) ? null : line.ordered_packages,
      received_packages: line.received_packages,
      bonus_packages: Number.isNaN(line.bonus_packages) ? 0 : line.bonus_packages,
      gross_amount: line.gross_amount,
      discounts: line.discounts || null,
      allocated_expenses: line.allocated_expenses || null,
      non_recoverable_taxes: line.non_recoverable_taxes || null,
    })),
  }
}

export interface UseReceiptFormOptions {
  receipt?: Receipt | null
  onSuccess: (receipt: Receipt) => void
}

export function useReceiptForm({ receipt, onSuccess }: UseReceiptFormOptions) {
  const isEditing = Boolean(receipt)
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      supplier_id: receipt?.supplier?.id ?? '',
      destination_location_id: receipt?.destination_location?.id ?? '',
      reference: receipt?.reference ?? '',
      receipt_date: receipt?.receipt_date ?? '',
      notes: receipt?.notes ?? '',
      lines: receipt?.lines.length ? receipt.lines.map(lineToFormValues) : [newLine()],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  const { execute, validationErrors, isPending } = useFormMutation({
    mutationFn: (values: ReceiptFormValues) => {
      const payload = toPayload(values)
      return receipt ? receiptApi.update(receipt.id, payload) : receiptApi.create(payload)
    },
    successMessage: isEditing ? 'Recepción actualizada' : 'Recepción creada',
    errorMessageFallback: 'No fue posible guardar la recepción',
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: receiptQueryKeys.all })
      onSuccess(response.data.data)
    },
  })

  const onSubmit = async (values: ReceiptFormValues) => {
    await execute(values)
  }

  const addLine = () => append(newLine())
  const removeLine = (index: number) => {
    if (fields.length > 1) remove(index)
  }

  // A Supplier Offering always belongs to exactly one Supplier (#431 contract) — changing the
  // header Supplier invalidates every line's currently-selected offering, since react-hook-form
  // never emits a change event for a select whose chosen option simply disappeared from the
  // (now supplier-scoped) options list.
  const onSupplierChange = (nextSupplierId: string) => {
    setValue('supplier_id', nextSupplierId)
    fields.forEach((_, index) => setValue(`lines.${index}.supplier_offering_id`, ''))
  }

  return {
    isEditing,
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    errors,
    fields,
    addLine,
    removeLine,
    onSubmit,
    onSupplierChange,
    validationErrors,
    isSubmitting: isPending,
    supplierId: watch('supplier_id'),
  }
}
