import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUnitsOfMeasureSelect } from '@/hooks/use-inventory-queries'
import { useCreateUpdateMutation } from '@/hooks/use-form-mutation'
import { purchasePresentationTemplateApi } from '@/services/inventory-api'
import type { PurchasePresentationPackageType, PurchasePresentationTemplate, UnitOfMeasure } from '@/types/inventory'

type UomOption = Pick<UnitOfMeasure, 'id' | 'name' | 'symbol'>

export const PACKAGE_TYPE_OPTIONS: { value: PurchasePresentationPackageType; label: string }[] = [
  { value: 'UNIT', label: 'Unit' },
  { value: 'PACK', label: 'Pack' },
  { value: 'BOX', label: 'Box' },
  { value: 'TRAY', label: 'Tray' },
]

// Package type / base quantity / compatible UOM become immutable server-side once a template
// has any assignment history (see UpdatePurchasePresentationTemplateRequest on the backend) —
// the form doesn't need to know that state up front, a resend of the current, unchanged value
// is always accepted, and any real attempt to change a locked field simply surfaces as a normal
// 422 field error (allErrors below), same as the duplicate/UOM-mismatch handling on the
// assignment form.
const templateSchema = z.object({
  code: z.string().trim().min(1, 'Code is required'),
  name: z.string().trim().min(1, 'Name is required'),
  package_type: z.string().min(1, 'Package type is required'),
  base_unit_quantity: z.string().trim().min(1, 'Quantity is required'),
  compatible_dimension_uom_id: z.string().min(1, 'Compatible unit is required'),
  is_active: z.boolean(),
})

export type PurchasePresentationTemplateFormValues = z.infer<typeof templateSchema>

export interface UsePurchasePresentationTemplateFormOptions {
  template?: PurchasePresentationTemplate | null
  onSuccess: (template: PurchasePresentationTemplate) => void
}

export function usePurchasePresentationTemplateForm({
  template,
  onSuccess,
}: Readonly<UsePurchasePresentationTemplateFormOptions>) {
  const isEditing = !!template

  const { data: uoms = [], isLoading: isUomsLoading } = useUnitsOfMeasureSelect()

  // useUnitsOfMeasureSelect only returns active UOMs. Editing a template whose compatible UOM
  // has since been deactivated must still show it as the selected option — otherwise the
  // required select renders with no matching value, and any update to the template (rename,
  // deactivate, ...) fails client-side with "Compatible unit is required" even though that
  // field isn't actually changing. Mirrors use-variant-form.ts's identical fix for a Variant's
  // own inactive current UOM. Only ever appends the template's current UOM — never widens the
  // list of *selectable new* units.
  const uomOptions: UomOption[] = useMemo(() => {
    if (!template?.compatible_dimension_uom || uoms.some((uom) => uom.id === template.compatible_dimension_uom!.id)) {
      return uoms
    }
    return [...uoms, template.compatible_dimension_uom]
  }, [uoms, template])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PurchasePresentationTemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      code: template?.code || '',
      name: template?.name || '',
      package_type: template?.package_type || '',
      base_unit_quantity: template?.base_unit_quantity != null ? String(template.base_unit_quantity) : '',
      compatible_dimension_uom_id: template?.compatible_dimension_uom?.id
        ? String(template.compatible_dimension_uom.id)
        : '',
      is_active: template?.is_active ?? true,
    },
  })

  const { execute, validationErrors, isPending } = useCreateUpdateMutation({
    createFn: (data: PurchasePresentationTemplateFormValues) =>
      purchasePresentationTemplateApi.create({
        code: data.code,
        name: data.name,
        package_type: data.package_type as PurchasePresentationPackageType,
        base_unit_quantity: Number(data.base_unit_quantity),
        compatible_dimension_uom_id: Number(data.compatible_dimension_uom_id),
        is_active: data.is_active,
      }),
    updateFn: (data: PurchasePresentationTemplateFormValues) =>
      purchasePresentationTemplateApi.update(template!.id, {
        code: data.code,
        name: data.name,
        package_type: data.package_type as PurchasePresentationPackageType,
        base_unit_quantity: Number(data.base_unit_quantity),
        compatible_dimension_uom_id: Number(data.compatible_dimension_uom_id),
        is_active: data.is_active,
      }),
    entityName: 'Template',
    isEditing,
    onSuccess: (response) => onSuccess(response.data.data),
  })

  const allErrors = {
    code: errors.code?.message || validationErrors.code,
    name: errors.name?.message || validationErrors.name,
    package_type: errors.package_type?.message || validationErrors.package_type,
    base_unit_quantity: errors.base_unit_quantity?.message || validationErrors.base_unit_quantity,
    compatible_dimension_uom_id:
      errors.compatible_dimension_uom_id?.message || validationErrors.compatible_dimension_uom_id,
  }

  const isSubmitting = isPending

  const onSubmit = async (data: PurchasePresentationTemplateFormValues) => {
    if (isSubmitting) return
    await execute(data)
  }

  const isActive = watch('is_active')

  return {
    isEditing,
    uoms: uomOptions,
    isUomsLoading,
    register,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    isActive,
    isSubmitting,
  }
}
