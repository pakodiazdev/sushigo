import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FormField, Select } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useCreateEmployee, useUpdateEmployee, useToggleEmployeeActive, useNextEmployeeCode, useEmployee } from '@/services/employee-hooks'
import { EmployeeRole } from '@/types/employee'
import type { Employee, EmployeeFormData, EmployeeUpdateData } from '@/types/employee'
import { Loader2, Power, RefreshCw } from 'lucide-react'

interface EmployeeFormProps {
    employee?: Employee | null
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

const EMPLOYEE_ROLES = [
    { value: EmployeeRole.MANAGER, label: 'Gerente' },
    { value: EmployeeRole.COOK, label: 'Cocinero' },
    { value: EmployeeRole.KITCHEN_ASSISTANT, label: 'Asistente de Cocina' },
    { value: EmployeeRole.DELIVERY_DRIVER, label: 'Repartidor' },
]

export function EmployeeForm({
    employee,
    isOpen,
    onClose,
    onSuccess,
}: EmployeeFormProps) {
    const isEditing = !!employee

    // Fetch full employee data when editing to get email/phone from user
    const employeeQuery = useEmployee(isOpen && isEditing && employee?.id ? employee.id : '')
    const fullEmployee = employeeQuery.data || employee

    const [formData, setFormData] = useState<EmployeeFormData>({
        code: '',
        first_name: '',
        last_name: '',
        role: EmployeeRole.COOK,
        email: '',
        phone: '',
    })

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [showToggleConfirm, setShowToggleConfirm] = useState(false)

    const nextCodeQuery = useNextEmployeeCode(isOpen && !isEditing)

    useEffect(() => {
        if (fullEmployee && isEditing) {
            setFormData({
                code: fullEmployee.code,
                first_name: fullEmployee.first_name,
                last_name: fullEmployee.last_name,
                role: fullEmployee.role,
                email: fullEmployee.email || '',
                phone: fullEmployee.phone || '',
            })
        } else if (!isEditing) {
            setFormData({
                code: '',
                first_name: '',
                last_name: '',
                role: EmployeeRole.COOK,
                email: '',
                phone: '',
            })
            if (isOpen) {
                nextCodeQuery.refetch().then(result => {
                    if (result.data?.code) {
                        setFormData(prev => ({ ...prev, code: result.data.code }))
                    }
                })
            }
        }
        setErrors({})
        setShowToggleConfirm(false)
    }, [fullEmployee, isEditing, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

    const createMutation = useCreateEmployee()
    const updateMutation = useUpdateEmployee()
    const toggleMutation = useToggleEmployeeActive()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrors({})

        const newErrors: Record<string, string> = {}

        if (!formData.code.trim()) {
            newErrors.code = 'El codigo es requerido'
        }
        if (!formData.first_name.trim()) {
            newErrors.first_name = 'El nombre es requerido'
        }
        if (!formData.last_name.trim()) {
            newErrors.last_name = 'El apellido es requerido'
        }
        if (!formData.role) {
            newErrors.role = 'El puesto es requerido'
        }

        if (!isEditing) {
            const hasEmail = formData.email?.trim()
            const hasPhone = formData.phone?.trim()
            if (!hasEmail && !hasPhone) {
                newErrors.email = 'Email o telefono es requerido'
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        try {
            if (isEditing && employee) {
                const updateData: EmployeeUpdateData = {
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    role: formData.role,
                }
                await updateMutation.mutateAsync({
                    id: employee.id,
                    data: updateData,
                })
            } else {
                await createMutation.mutateAsync(formData)
            }
            onSuccess()
            onClose()
        } catch (error) {
            console.error('Error submitting form:', error)
        }
    }

    const handleToggleActive = async () => {
        if (!employee) return
        try {
            await toggleMutation.mutateAsync(employee.id)
            setShowToggleConfirm(false)
            onSuccess()
            onClose()
        } catch (error) {
            console.error('Error toggling active:', error)
        }
    }

    const handleChange = (field: keyof EmployeeFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[field]
                return newErrors
            })
        }
    }

    const isLoading = createMutation.isPending || updateMutation.isPending || toggleMutation.isPending || employeeQuery.isLoading

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}
            description={isEditing ? 'Actualiza los datos del empleado' : 'Registra un nuevo empleado en el sistema'}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Toggle active section for editing */}
                {isEditing && fullEmployee && (
                    <div className={`flex items-center justify-between rounded-lg border p-3 ${
                        fullEmployee.is_active
                            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                            : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
                    }`}>
                        <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                fullEmployee.is_active
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                                {fullEmployee.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        {showToggleConfirm ? (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    {fullEmployee.is_active ? 'Desactivar?' : 'Activar?'}
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleToggleActive}
                                    disabled={isLoading}
                                    className="bg-amber-600 text-white hover:bg-amber-700"
                                >
                                    {toggleMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                    Confirmar
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setShowToggleConfirm(false)}
                                    disabled={isLoading}
                                    className="bg-gray-200 text-gray-800 hover:bg-gray-300"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setShowToggleConfirm(true)}
                                disabled={isLoading}
                                className={fullEmployee.is_active
                                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }
                            >
                                <Power className="mr-1 h-3 w-3" />
                                {fullEmployee.is_active ? 'Desactivar' : 'Activar'}
                            </Button>
                        )}
                    </div>
                )}

                <FormField
                    label="Codigo"
                    error={errors.code}
                    required
                    hint={isEditing ? undefined : 'Codigo sugerido automaticamente. Puedes modificarlo.'}
                >
                    <div className="relative">
                        <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                            disabled={isEditing}
                            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md font-mono disabled:opacity-50 disabled:cursor-not-allowed pr-10"
                            placeholder={nextCodeQuery.isLoading ? 'Cargando...' : 'EMP-001'}
                            maxLength={20}
                        />
                        {!isEditing && (
                            <button
                                type="button"
                                onClick={() => nextCodeQuery.refetch()}
                                disabled={nextCodeQuery.isFetching}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                                title="Obtener siguiente codigo disponible"
                            >
                                <RefreshCw className={`h-4 w-4 ${nextCodeQuery.isFetching ? 'animate-spin' : ''}`} />
                            </button>
                        )}
                    </div>
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        label="Nombre"
                        error={errors.first_name}
                        required
                    >
                        <input
                            type="text"
                            value={formData.first_name}
                            onChange={(e) => handleChange('first_name', e.target.value)}
                            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
                            placeholder="Juan"
                            maxLength={100}
                        />
                    </FormField>

                    <FormField
                        label="Apellido"
                        error={errors.last_name}
                        required
                    >
                        <input
                            type="text"
                            value={formData.last_name}
                            onChange={(e) => handleChange('last_name', e.target.value)}
                            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
                            placeholder="Perez"
                            maxLength={100}
                        />
                    </FormField>
                </div>

                <FormField
                    label="Puesto"
                    error={errors.role}
                    required
                >
                    <Select
                        value={formData.role}
                        onChange={(e) => handleChange('role', e.target.value)}
                    >
                        {EMPLOYEE_ROLES.map(role => (
                            <option key={role.value} value={role.value}>
                                {role.label}
                            </option>
                        ))}
                    </Select>
                </FormField>

                {/* Email field - editable only on create, read-only on edit */}
                <FormField
                    label="Email"
                    error={errors.email}
                    hint={!isEditing ? "Requerido si no proporciona telefono" : undefined}
                >
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        disabled={isEditing}
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted"
                        placeholder={isEditing ? "Sin email registrado" : "juan@example.com"}
                        maxLength={255}
                    />
                </FormField>

                {/* Phone field - editable only on create, read-only on edit */}
                <FormField
                    label="Telefono"
                    hint={!isEditing ? "Requerido si no proporciona email. Solo el numero nacional (10 digitos)." : undefined}
                >
                    <div className="flex">
                        <span className="inline-flex items-center px-3 py-2 border border-r-0 border-input bg-muted text-muted-foreground rounded-l-md text-sm">
                            +52
                        </span>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => {
                                // Only allow digits
                                const value = e.target.value.replace(/\D/g, '')
                                handleChange('phone', value)
                            }}
                            disabled={isEditing}
                            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-r-md rounded-l-none disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted"
                            placeholder={isEditing ? "Sin telefono registrado" : "5512345678"}
                            maxLength={10}
                        />
                    </div>
                </FormField>

                {!isEditing && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                        <p>El empleado recibirá un enlace para configurar su contraseña por {formData.email?.trim() ? 'correo electrónico' : 'WhatsApp'}.</p>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="bg-gray-200 text-gray-800 hover:bg-gray-300"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                        {(createMutation.isPending || updateMutation.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isEditing ? 'Actualizar' : 'Crear'}
                    </Button>
                </div>
            </form>
        </SlidePanel>
    )
}
