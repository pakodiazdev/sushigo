import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { CashRegisterType, type CashRegister, type OperatingUnit } from '@/types/cash'
import { useCashRegisterForm } from './use-cash-register-form'

interface CashRegisterFormProps {
    register?: CashRegister | null
    operatingUnits: OperatingUnit[]
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function CashRegisterForm({
    register,
    operatingUnits,
    isOpen,
    onClose,
    onSuccess,
}: Readonly<CashRegisterFormProps>) {
    const {
        isEditing,
        registerField,
        codeField,
        onCodeChange,
        handleSubmit,
        setValue,
        onSubmit,
        errors,
        codeError,
        values,
        isSubmitting,
        isCodeSuggested,
        isSuggestionLoading,
        isRefreshingCode,
        suggestionFailed,
        handleRefreshCode,
        collision,
        canApplySuggestedCode,
        applySuggestedCode,
    } = useCashRegisterForm({ register, isOpen, onSuccess, onClose })

    // Filter operating units by selected branch and only EVENT type
    const filteredOperatingUnits = operatingUnits.filter(
        ou => ou.branch_id === values.branchId && ou.type === 'EVENT_TEMP'
    )

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Caja Registradora' : 'Nueva Caja Registradora'}
            description={isEditing ? 'Actualiza los datos de la caja registradora' : 'Crea una nueva caja registradora'}
            noPadding
        >
            <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="space-y-6">
                        <FormField
                            label="Código"
                            error={codeError}
                            required
                        >
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    aria-label="Código"
                                    {...codeField}
                                    onChange={onCodeChange}
                                    placeholder="REG-001"
                                    disabled={isEditing}
                                    error={!!codeError}
                                />
                                {!isEditing && (
                                    <Button
                                        type="button"
                                        variant="neutral"
                                        aria-label="Sugerir otro código"
                                        onClick={handleRefreshCode}
                                        disabled={isSuggestionLoading || isRefreshingCode}
                                    >
                                        <RefreshCw className={`h-4 w-4 ${isRefreshingCode ? 'animate-spin' : ''}`} />
                                    </Button>
                                )}
                            </div>
                            {!isEditing && isCodeSuggested && !suggestionFailed && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Sugerido automáticamente; puedes modificarlo.
                                </p>
                            )}
                            {!isEditing && suggestionFailed && (
                                <p className="mt-1 text-xs text-amber-600">
                                    No se pudo sugerir un código; escríbelo manualmente o vuelve a intentarlo.
                                </p>
                            )}
                            {collision && (
                                <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                                    <p>
                                        El código {collision.rejectedCode} acaba de ser utilizado. Te proponemos{' '}
                                        {collision.suggestedCode}.
                                    </p>
                                    {canApplySuggestedCode && (
                                        <Button
                                            type="button"
                                            variant="neutral"
                                            className="mt-2"
                                            onClick={applySuggestedCode}
                                        >
                                            Usar {collision.suggestedCode}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </FormField>

                        <FormField
                            label="Nombre"
                            error={errors.name?.message}
                            required
                        >
                            <Input
                                type="text"
                                aria-label="Nombre"
                                {...registerField('name')}
                                placeholder="Caja Principal"
                                error={!!errors.name}
                            />
                        </FormField>

                        <FormField
                            label="Tipo de Caja"
                            error={errors.type?.message}
                            required
                        >
                            <Select
                                id="cash-register-type"
                                name="type"
                                value={values.type}
                                onChange={(e) => setValue('type', e.target.value as CashRegisterType)}
                            >
                                <option value={CashRegisterType.ON_PREMISE}>Local</option>
                                <option value={CashRegisterType.DELIVERY}>Delivery</option>
                                <option value={CashRegisterType.EVENT}>Evento</option>
                            </Select>
                        </FormField>

                        {values.type === CashRegisterType.EVENT && (
                            <FormField
                                label="Evento"
                                error={errors.operating_unit_id?.message}
                                required
                                hint="Selecciona el evento al que pertenece esta caja"
                            >
                                <Select
                                    id="operating-unit"
                                    name="operating_unit_id"
                                    value={values.operatingUnitId || ''}
                                    onChange={(e) => setValue('operating_unit_id', e.target.value ? Number.parseInt(e.target.value) : null)}
                                >
                                    <option value="">Selecciona un evento</option>
                                    {filteredOperatingUnits.map(ou => (
                                        <option key={ou.id} value={ou.id}>
                                            {ou.name}
                                        </option>
                                    ))}
                                </Select>
                            </FormField>
                        )}

                        <FormField label="Estado">
                            <Checkbox
                                checked={values.isActive}
                                onChange={(e) => setValue('is_active', e.target.checked)}
                                label="Activa"
                            />
                        </FormField>
                    </div>
                </div>

                {/* Footer - Fixed */}
                <div className="border-t bg-muted/50 px-6 py-4">
                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="neutral"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="info"
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? 'Actualizar' : 'Crear'}
                        </Button>
                    </div>
                </div>
            </form>
        </SlidePanel>
    )
}
