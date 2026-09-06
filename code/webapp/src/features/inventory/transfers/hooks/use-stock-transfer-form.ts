import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useFormMutation } from '@/hooks/use-form-mutation'
import { stockTransferApi, type StockTransferPayload } from '../api/stock-transfer-api'
import { stockTransferQueryKeys } from '../api/query-keys'
import type { StockTransfer } from '../types'

const lineSchema = z.object({
  // Client-only bookkeeping, never sent to the API.
  _label: z.string().optional(),
  item_variant_id: z.string().min(1, 'Selecciona una variante'),
  entry_uom_id: z.string().min(1, 'Selecciona una unidad'),
  entry_quantity: z
    .number({ message: 'Ingresa una cantidad válida' })
    .positive('La cantidad debe ser mayor a 0'),
})

const transferSchema = z
  .object({
    source_location_id: z.string().min(1, 'Selecciona la ubicación de origen'),
    destination_location_id: z.string().min(1, 'Selecciona la ubicación de destino'),
    reference: z.string(),
    transfer_date: z.string().min(1, 'La fecha es requerida'),
    notes: z.string(),
    lines: z.array(lineSchema).min(1, 'Agrega al menos una línea'),
  })
  .superRefine((values, context) => {
    if (
      values.source_location_id &&
      values.source_location_id === values.destination_location_id
    ) {
      context.addIssue({
        code: 'custom',
        path: ['destination_location_id'],
        message: 'El destino debe ser distinto del origen',
      })
    }

    const seen = new Set<string>()
    values.lines.forEach((line, index) => {
      if (!line.item_variant_id) return
      if (seen.has(line.item_variant_id)) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'item_variant_id'],
          message: 'Esta variante ya está en otra línea',
        })
      }
      seen.add(line.item_variant_id)
    })
  })

export type StockTransferFormValues = z.infer<typeof transferSchema>
export type StockTransferLineFormValues = StockTransferFormValues['lines'][number]

export function newLine(): StockTransferLineFormValues {
  return { item_variant_id: '', entry_uom_id: '', entry_quantity: 1 }
}

function lineToFormValues(line: StockTransfer['lines'][number]): StockTransferLineFormValues {
  return {
    _label: line.variant ? `${line.variant.name} (${line.variant.code})` : 'Variante no disponible',
    item_variant_id: line.variant?.id ?? '',
    entry_uom_id: line.entry_uom?.id ?? '',
    entry_quantity: line.entry_quantity,
  }
}

function toPayload(values: StockTransferFormValues): StockTransferPayload {
  return {
    source_location_id: values.source_location_id,
    destination_location_id: values.destination_location_id,
    reference: values.reference || null,
    transfer_date: values.transfer_date,
    notes: values.notes || null,
    lines: values.lines.map((line) => ({
      item_variant_id: line.item_variant_id,
      entry_uom_id: line.entry_uom_id,
      entry_quantity: line.entry_quantity,
    })),
  }
}

export interface UseStockTransferFormOptions {
  transfer?: StockTransfer | null
  onSuccess: (transfer: StockTransfer) => void
}

export function useStockTransferForm({ transfer, onSuccess }: UseStockTransferFormOptions) {
  const isEditing = Boolean(transfer)
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StockTransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      source_location_id: transfer?.source_location?.id ?? '',
      destination_location_id: transfer?.destination_location?.id ?? '',
      reference: transfer?.reference ?? '',
      transfer_date: transfer?.transfer_date ?? '',
      notes: transfer?.notes ?? '',
      lines: transfer?.lines.length ? transfer.lines.map(lineToFormValues) : [newLine()],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  const { execute, validationErrors, isPending } = useFormMutation({
    mutationFn: (values: StockTransferFormValues) => {
      const payload = toPayload(values)
      return transfer ? stockTransferApi.update(transfer.id, payload) : stockTransferApi.create(payload)
    },
    successMessage: isEditing ? 'Traslado actualizado' : 'Traslado creado',
    errorMessageFallback: 'No fue posible guardar el traslado',
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: stockTransferQueryKeys.all })
      onSuccess(response.data.data)
    },
  })

  const onSubmit = async (values: StockTransferFormValues) => {
    await execute(values)
  }

  const addLine = () => append(newLine())
  const removeLine = (index: number) => {
    if (fields.length > 1) remove(index)
  }

  // Changing the destination invalidates every line's variant selection — the
  // per-line picker is scoped to the destination's assortment (#569), so a
  // variant that was valid for the previous destination may not be assignable
  // to the new one.
  const onDestinationChange = (nextDestinationId: string) => {
    setValue('destination_location_id', nextDestinationId)
    fields.forEach((_, index) => setValue(`lines.${index}.item_variant_id`, ''))
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
    onDestinationChange,
    validationErrors,
    isSubmitting: isPending,
    sourceLocationId: watch('source_location_id'),
    destinationLocationId: watch('destination_location_id'),
  }
}
