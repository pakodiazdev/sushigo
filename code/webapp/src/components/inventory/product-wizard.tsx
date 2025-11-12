import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, ChevronRight, ChevronLeft, Package, Layers, Scale, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Textarea, Checkbox } from '@/components/ui/form-fields'
import { useToast } from '@/components/ui/toast-provider'
import { itemApi, itemVariantApi, inventoryLocationApi } from '@/services/inventory-api'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface ProductWizardProps {
  onSuccess: () => void
  onCancel: () => void
}

interface WizardData {
  // Step 1: Item basics
  item: {
    sku: string
    name: string
    description: string
    type: 'INSUMO' | 'PRODUCTO' | 'ACTIVO'
    is_stocked: boolean
    is_perishable: boolean
    is_manufactured: boolean
    is_active: boolean
  }
  // Step 2: Variant
  variant: {
    code: string
    name: string
    uom_id: number
    min_stock: number
    max_stock: number
    is_active: boolean
  }
  // Step 3: UoM Conversions (solo para INSUMO)
  conversions: Array<{
    from_uom_id: number
    to_uom_id: number
    factor: number
  }>
  // Step 4: Opening Balances
  openingBalances: Array<{
    inventory_location_id: number
    quantity: number
    uom_id: number
    unit_cost: number
  }>
}

const INITIAL_DATA: WizardData = {
  item: {
    sku: '',
    name: '',
    description: '',
    type: 'PRODUCTO',
    is_stocked: true,
    is_perishable: false,
    is_manufactured: true,
    is_active: true,
  },
  variant: {
    code: '',
    name: '',
    uom_id: 0,
    min_stock: 0,
    max_stock: 0,
    is_active: true,
  },
  conversions: [],
  openingBalances: [],
}

const STEPS = [
  { id: 1, name: 'Producto', icon: Package },
  { id: 2, name: 'Variante', icon: Layers },
  { id: 3, name: 'Conversiones', icon: Scale },
  { id: 4, name: 'Existencias', icon: Database },
]

export function ProductWizard({ onSuccess, onCancel }: ProductWizardProps) {
  const { showSuccess, showError } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [wizardData, setWizardData] = useState<WizardData>(INITIAL_DATA)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [createdItemId, setCreatedItemId] = useState<number | null>(null)
  const [createdVariantId, setCreatedVariantId] = useState<number | null>(null)

  // Fetch UoMs
  const { data: uomData } = useQuery({
    queryKey: ['units-of-measure-wizard'],
    queryFn: async () => {
      const response = await apiClient.get('/units-of-measure', {
        params: { is_active: true, per_page: 100 },
      })
      return response
    },
  })

  // Fetch Locations
  const { data: locationsData } = useQuery({
    queryKey: ['inventory-locations-wizard'],
    queryFn: () => inventoryLocationApi.list({ is_active: true, per_page: 100 }),
  })

  const units = uomData?.data.data || []
  const locations = locationsData?.data.data || []

  // Create Item mutation
  const createItemMutation = useMutation({
    mutationFn: (data: WizardData['item']) => itemApi.create(data),
    onSuccess: (response) => {
      setCreatedItemId(response.data.data.id)
      showSuccess('Producto creado exitosamente', 'Paso 1 Completo')
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
      showError(
        error.response?.data?.message || 'Error al crear producto',
        'Error'
      )
    },
  })

  // Create Variant mutation
  const createVariantMutation = useMutation({
    mutationFn: (data: WizardData['variant'] & { item_id: number }) =>
      itemVariantApi.create(data),
    onSuccess: (response) => {
      setCreatedVariantId(response.data.data.id)
      showSuccess('Variante creada exitosamente', 'Paso 2 Completo')
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
      showError(
        error.response?.data?.message || 'Error al crear variante',
        'Error'
      )
    },
  })

  // Create Conversion mutation
  const createConversionMutation = useMutation({
    mutationFn: (conversion: { from_uom_id: number; to_uom_id: number; factor: number }) =>
      apiClient.post('/uom-conversions', conversion),
  })

  // Register Opening Balance mutation
  const registerBalanceMutation = useMutation({
    mutationFn: (balance: {
      inventory_location_id: number
      item_variant_id: number
      quantity: number
      uom_id: number
      unit_cost: number
    }) => apiClient.post('/inventory/opening-balance', balance),
  })

  const updateItemData = (field: keyof WizardData['item'], value: any) => {
    setWizardData((prev) => ({
      ...prev,
      item: { ...prev.item, [field]: value },
    }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const updateVariantData = (field: keyof WizardData['variant'], value: any) => {
    setWizardData((prev) => ({
      ...prev,
      variant: { ...prev.variant, [field]: value },
    }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const addConversion = () => {
    setWizardData((prev) => ({
      ...prev,
      conversions: [
        ...prev.conversions,
        { from_uom_id: 0, to_uom_id: 0, factor: 1 },
      ],
    }))
  }

  const updateConversion = (index: number, field: string, value: any) => {
    setWizardData((prev) => ({
      ...prev,
      conversions: prev.conversions.map((conv, i) =>
        i === index ? { ...conv, [field]: value } : conv
      ),
    }))
  }

  const removeConversion = (index: number) => {
    setWizardData((prev) => ({
      ...prev,
      conversions: prev.conversions.filter((_, i) => i !== index),
    }))
  }

  const addOpeningBalance = () => {
    setWizardData((prev) => ({
      ...prev,
      openingBalances: [
        ...prev.openingBalances,
        {
          inventory_location_id: 0,
          quantity: 0,
          uom_id: wizardData.variant.uom_id || 0,
          unit_cost: 0,
        },
      ],
    }))
  }

  const updateOpeningBalance = (index: number, field: string, value: any) => {
    setWizardData((prev) => ({
      ...prev,
      openingBalances: prev.openingBalances.map((balance, i) =>
        i === index ? { ...balance, [field]: value } : balance
      ),
    }))
  }

  const removeOpeningBalance = (index: number) => {
    setWizardData((prev) => ({
      ...prev,
      openingBalances: prev.openingBalances.filter((_, i) => i !== index),
    }))
  }

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!wizardData.item.sku || wizardData.item.sku.length < 2) {
      newErrors.sku = 'SKU debe tener al menos 2 caracteres'
    }
    if (!wizardData.item.name || wizardData.item.name.length < 3) {
      newErrors.name = 'Nombre debe tener al menos 3 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!wizardData.variant.code || wizardData.variant.code.length < 2) {
      newErrors.code = 'Código debe tener al menos 2 caracteres'
    }
    if (!wizardData.variant.name || wizardData.variant.name.length < 3) {
      newErrors.name = 'Nombre debe tener al menos 3 caracteres'
    }
    if (!wizardData.variant.uom_id) {
      newErrors.uom_id = 'Debe seleccionar una unidad de medida'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep3 = (): boolean => {
    if (wizardData.item.type !== 'INSUMO') return true

    const newErrors: Record<string, string> = {}

    wizardData.conversions.forEach((conv, index) => {
      if (!conv.from_uom_id) {
        newErrors[`conv_${index}_from`] = 'Seleccione unidad origen'
      }
      if (!conv.to_uom_id) {
        newErrors[`conv_${index}_to`] = 'Seleccione unidad destino'
      }
      if (conv.factor <= 0) {
        newErrors[`conv_${index}_factor`] = 'Factor debe ser mayor a 0'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep4 = (): boolean => {
    const newErrors: Record<string, string> = {}

    wizardData.openingBalances.forEach((balance, index) => {
      if (!balance.inventory_location_id) {
        newErrors[`balance_${index}_location`] = 'Seleccione ubicación'
      }
      if (balance.quantity <= 0) {
        newErrors[`balance_${index}_qty`] = 'Cantidad debe ser mayor a 0'
      }
      if (!balance.uom_id) {
        newErrors[`balance_${index}_uom`] = 'Seleccione unidad'
      }
      if (balance.unit_cost < 0) {
        newErrors[`balance_${index}_cost`] = 'Costo no puede ser negativo'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!validateStep1()) return

      // Create item if not created yet
      if (!createdItemId) {
        await createItemMutation.mutateAsync(wizardData.item)
        setCurrentStep(2)
      } else {
        setCurrentStep(2)
      }
    } else if (currentStep === 2) {
      if (!validateStep2()) return

      // Create variant if not created yet
      if (!createdVariantId && createdItemId) {
        await createVariantMutation.mutateAsync({
          ...wizardData.variant,
          item_id: createdItemId,
        })
        setCurrentStep(3)
      } else {
        setCurrentStep(3)
      }
    } else if (currentStep === 3) {
      if (!validateStep3()) return

      // Create conversions if type is INSUMO
      if (wizardData.item.type === 'INSUMO' && wizardData.conversions.length > 0) {
        try {
          await Promise.all(
            wizardData.conversions.map((conv) => createConversionMutation.mutateAsync(conv))
          )
          showSuccess('Conversiones creadas exitosamente', 'Paso 3 Completo')
        } catch (error: any) {
          showError('Error al crear conversiones', 'Error')
          return
        }
      }
      setCurrentStep(4)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFinish = async () => {
    if (!validateStep4()) return

    if (!createdVariantId) {
      showError('Debe completar los pasos anteriores', 'Error')
      return
    }

    try {
      // Register all opening balances
      if (wizardData.openingBalances.length > 0) {
        await Promise.all(
          wizardData.openingBalances.map((balance) =>
            registerBalanceMutation.mutateAsync({
              ...balance,
              item_variant_id: createdVariantId,
            })
          )
        )
      }

      showSuccess(
        'Producto completo creado con existencias iniciales',
        'Wizard Completado'
      )
      onSuccess()
    } catch (error: any) {
      showError(
        error.response?.data?.message || 'Error al registrar existencias',
        'Error'
      )
    }
  }

  const isStepComplete = (step: number): boolean => {
    if (step === 1) return createdItemId !== null
    if (step === 2) return createdVariantId !== null
    if (step === 3) return currentStep > 3
    return false
  }

  const isLoading =
    createItemMutation.isPending ||
    createVariantMutation.isPending ||
    createConversionMutation.isPending ||
    registerBalanceMutation.isPending

  return (
    <div className="flex h-full flex-col">
      {/* Stepper */}
      <div className="border-b bg-gray-50 px-6 py-4">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {STEPS.map((step, stepIdx) => (
              <li
                key={step.id}
                className={cn(
                  'relative',
                  stepIdx !== STEPS.length - 1 ? 'pr-8 sm:pr-20' : '',
                  'flex-1'
                )}
              >
                {stepIdx !== STEPS.length - 1 && (
                  <div
                    className="absolute inset-0 flex items-center"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        'h-0.5 w-full',
                        isStepComplete(step.id) || currentStep > step.id
                          ? 'bg-indigo-600'
                          : 'bg-gray-200'
                      )}
                    />
                  </div>
                )}
                <button
                  type="button"
                  className={cn(
                    'relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    currentStep === step.id && 'bg-white shadow-sm',
                    currentStep > step.id && 'text-indigo-600',
                    currentStep < step.id && 'text-gray-500'
                  )}
                  onClick={() => {
                    if (step.id < currentStep) setCurrentStep(step.id)
                  }}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2',
                      isStepComplete(step.id)
                        ? 'border-indigo-600 bg-indigo-600'
                        : currentStep === step.id
                        ? 'border-indigo-600 bg-white'
                        : 'border-gray-300 bg-white'
                    )}
                  >
                    {isStepComplete(step.id) ? (
                      <Check className="h-5 w-5 text-white" />
                    ) : (
                      <step.icon
                        className={cn(
                          'h-5 w-5',
                          currentStep === step.id
                            ? 'text-indigo-600'
                            : 'text-gray-400'
                        )}
                      />
                    )}
                  </span>
                  <span className="hidden sm:inline">{step.name}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Step 1: Item Basics */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Datos del Producto</h3>
              <p className="text-sm text-muted-foreground">
                Información básica del producto
              </p>
            </div>

            <FormField label="SKU" required error={errors.sku}>
              <Input
                value={wizardData.item.sku}
                onChange={(e) => updateItemData('sku', e.target.value)}
                placeholder="ej., ROLL-001"
                error={!!errors.sku}
              />
            </FormField>

            <FormField label="Nombre" required error={errors.name}>
              <Input
                value={wizardData.item.name}
                onChange={(e) => updateItemData('name', e.target.value)}
                placeholder="ej., California Roll"
                error={!!errors.name}
              />
            </FormField>

            <FormField label="Descripción">
              <Textarea
                value={wizardData.item.description}
                onChange={(e) => updateItemData('description', e.target.value)}
                rows={3}
                placeholder="Descripción detallada del producto"
              />
            </FormField>

            <FormField label="Tipo de Producto" required>
              <Select
                value={wizardData.item.type}
                onChange={(e) => updateItemData('type', e.target.value)}
              >
                <option value="INSUMO">Insumo</option>
                <option value="PRODUCTO">Producto Terminado</option>
                <option value="ACTIVO">Activo</option>
              </Select>
            </FormField>

            <div className="space-y-3">
              <Checkbox
                checked={wizardData.item.is_stocked}
                onChange={(e) => updateItemData('is_stocked', e.target.checked)}
                label="Gestionar en inventario"
              />
              <Checkbox
                checked={wizardData.item.is_perishable}
                onChange={(e) => updateItemData('is_perishable', e.target.checked)}
                label="Producto perecedero"
              />
              <Checkbox
                checked={wizardData.item.is_manufactured}
                onChange={(e) => updateItemData('is_manufactured', e.target.checked)}
                label="Se fabrica en casa (desmarca si es reventa)"
              />
              <Checkbox
                checked={wizardData.item.is_active}
                onChange={(e) => updateItemData('is_active', e.target.checked)}
                label="Activo"
              />
            </div>
          </div>
        )}

        {/* Step 2: Variant */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Variante del Producto</h3>
              <p className="text-sm text-muted-foreground">
                Define la variante con su unidad de medida base
              </p>
            </div>

            <FormField label="Código de Variante" required error={errors.code}>
              <Input
                value={wizardData.variant.code}
                onChange={(e) => updateVariantData('code', e.target.value)}
                placeholder="ej., ROLL-001-8PZ"
                error={!!errors.code}
              />
            </FormField>

            <FormField label="Nombre de Variante" required error={errors.name}>
              <Input
                value={wizardData.variant.name}
                onChange={(e) => updateVariantData('name', e.target.value)}
                placeholder="ej., California Roll 8 piezas"
                error={!!errors.name}
              />
            </FormField>

            <FormField label="Unidad de Medida Base" required error={errors.uom_id}>
              <Select
                value={wizardData.variant.uom_id}
                onChange={(e) => updateVariantData('uom_id', Number(e.target.value))}
                error={!!errors.uom_id}
              >
                <option value="0">Seleccione una unidad</option>
                {units.map((uom: any) => (
                  <option key={uom.id} value={uom.id}>
                    {uom.name} ({uom.symbol})
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Stock Mínimo">
                <Input
                  type="number"
                  value={wizardData.variant.min_stock}
                  onChange={(e) =>
                    updateVariantData('min_stock', Number(e.target.value))
                  }
                  placeholder="0"
                />
              </FormField>

              <FormField label="Stock Máximo">
                <Input
                  type="number"
                  value={wizardData.variant.max_stock}
                  onChange={(e) =>
                    updateVariantData('max_stock', Number(e.target.value))
                  }
                  placeholder="0"
                />
              </FormField>
            </div>

            <Checkbox
              checked={wizardData.variant.is_active}
              onChange={(e) => updateVariantData('is_active', e.target.checked)}
              label="Variante activa"
            />
          </div>
        )}

        {/* Step 3: Conversions */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Conversiones de Unidad</h3>
              <p className="text-sm text-muted-foreground">
                {wizardData.item.type === 'INSUMO'
                  ? 'Define las conversiones entre unidades (opcional para insumos)'
                  : 'Las conversiones solo están disponibles para INSUMOS. Puedes continuar al siguiente paso.'}
              </p>
            </div>

            {wizardData.item.type === 'INSUMO' && (
              <>
                {wizardData.conversions.map((conversion, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-gray-200 p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Conversión {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeConversion(index)}
                      >
                        Eliminar
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        label="Desde"
                        error={errors[`conv_${index}_from`]}
                      >
                        <Select
                          value={conversion.from_uom_id}
                          onChange={(e) =>
                            updateConversion(index, 'from_uom_id', Number(e.target.value))
                          }
                        >
                          <option value="0">Seleccione</option>
                          {units.map((uom: any) => (
                            <option key={uom.id} value={uom.id}>
                              {uom.name} ({uom.symbol})
                            </option>
                          ))}
                        </Select>
                      </FormField>

                      <FormField label="Hacia" error={errors[`conv_${index}_to`]}>
                        <Select
                          value={conversion.to_uom_id}
                          onChange={(e) =>
                            updateConversion(index, 'to_uom_id', Number(e.target.value))
                          }
                        >
                          <option value="0">Seleccione</option>
                          {units.map((uom: any) => (
                            <option key={uom.id} value={uom.id}>
                              {uom.name} ({uom.symbol})
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </div>

                    <FormField label="Factor" error={errors[`conv_${index}_factor`]}>
                      <Input
                        type="number"
                        step="0.001"
                        value={conversion.factor}
                        onChange={(e) =>
                          updateConversion(index, 'factor', Number(e.target.value))
                        }
                        placeholder="1.0"
                      />
                    </FormField>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addConversion}
                  className="w-full"
                >
                  + Agregar Conversión
                </Button>
              </>
            )}
          </div>
        )}

        {/* Step 4: Opening Balances */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Existencias Iniciales</h3>
              <p className="text-sm text-muted-foreground">
                Registra el stock inicial en cada ubicación (opcional)
              </p>
            </div>

            {wizardData.openingBalances.map((balance, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    Ubicación {index + 1}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOpeningBalance(index)}
                  >
                    Eliminar
                  </Button>
                </div>

                <FormField
                  label="Ubicación"
                  required
                  error={errors[`balance_${index}_location`]}
                >
                  <Select
                    value={balance.inventory_location_id}
                    onChange={(e) =>
                      updateOpeningBalance(
                        index,
                        'inventory_location_id',
                        Number(e.target.value)
                      )
                    }
                  >
                    <option value="0">Seleccione ubicación</option>
                    {locations.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.type})
                      </option>
                    ))}
                  </Select>
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="Cantidad"
                    required
                    error={errors[`balance_${index}_qty`]}
                  >
                    <Input
                      type="number"
                      step="0.01"
                      value={balance.quantity}
                      onChange={(e) =>
                        updateOpeningBalance(index, 'quantity', Number(e.target.value))
                      }
                      placeholder="0.00"
                    />
                  </FormField>

                  <FormField
                    label="Unidad"
                    required
                    error={errors[`balance_${index}_uom`]}
                  >
                    <Select
                      value={balance.uom_id}
                      onChange={(e) =>
                        updateOpeningBalance(index, 'uom_id', Number(e.target.value))
                      }
                    >
                      <option value="0">Seleccione</option>
                      {units.map((uom: any) => (
                        <option key={uom.id} value={uom.id}>
                          {uom.name} ({uom.symbol})
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>

                <FormField
                  label="Costo Unitario"
                  required
                  error={errors[`balance_${index}_cost`]}
                >
                  <Input
                    type="number"
                    step="0.01"
                    value={balance.unit_cost}
                    onChange={(e) =>
                      updateOpeningBalance(index, 'unit_cost', Number(e.target.value))
                    }
                    placeholder="0.00"
                  />
                </FormField>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addOpeningBalance}
              className="w-full"
            >
              + Agregar Ubicación
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t bg-gray-50 px-6 py-4">
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? onCancel : handleBack}
            disabled={isLoading}
          >
            {currentStep === 1 ? (
              'Cancelar'
            ) : (
              <>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Anterior
              </>
            )}
          </Button>

          {currentStep < 4 ? (
            <Button onClick={handleNext} disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="mr-2">Procesando...</span>
                  <span className="animate-spin">⏳</span>
                </>
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="mr-2">Guardando...</span>
                  <span className="animate-spin">⏳</span>
                </>
              ) : (
                'Finalizar'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
