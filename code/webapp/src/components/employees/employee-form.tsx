import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FormField, Select } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useCreateEmployee, useUpdateEmployee, useToggleEmployeeActive } from '@/services/employee-hooks'
import { EmployeeRole } from '@/types/employee'
import type { Employee, EmployeeFormData, EmployeeUpdateData } from '@/types/employee'
import { Loader2, Power } from 'lucide-react'

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

    const [formData, setFormData] = useState<EmployeeFormData>({
        code: '',
        first_name: '',
        last_name: '',
        role: EmployeeRole.COOK,
        email: '',
        phone: '',
        password: '',
    })

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [showToggleConfirm, setShowToggleConfirm] = useState(false)

    useEffect(() => {
        if (employee) {
            setFormData({
                code: employee.code,
                first_name: employee.first_name,
                last_name: employee.last_name,
                role: employee.role,
                email: '',
                phone: '',
                password: '',
            })
        } else {
            setFormData({
                code: '',
                first_name: '',
                last_name: '',
                role: EmployeeRole.COOK,
                email: '',
                phone: '',
                password: '',
            })
        }
        setErrors({})
        setShowToggleConfirm(false)
    }, [employee, isOpen])

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
            if (!formData.password?.trim()) {
                newErrors.password = 'La contrasena es requerida'
            } else if (formData.password.length < 8) {
                newErrors.password = 'La contrasena debe tener al menos 8 caracteres'
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

    const isLoading = createMutation.isPending || updateMutation.isPending || toggleMutation.isPending

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}
            description={isEditing ? 'Actualiza los datos del empleado' : 'Registra un nuevo empleado en el sistema'}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Toggle active section for editing */}
                {isEditing && employee && (
                    <div className={`flex items-center justify-between rounded-lg border p-3 ${
                        employee.is_active
                            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                            : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
                    }`}>
                        <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                employee.is_active
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                                {employee.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        {showToggleConfirm ? (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    {employee.is_active ? 'Desactivar?' : 'Activar?'}
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
                                className={employee.is_active
                                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }
                            >
                                <Power className="mr-1 h-3 w-3" />
                                {employee.is_active ? 'Desactivar' : 'Activar'}
                            </Button>
                        )}
                    </div>
                )}

                <FormField
                    label="Codigo"
                    error={errors.code}
                    required
                    hint="Identificador unico (ej. EMP-001)"
                >
                    <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                        disabled={isEditing}
                        className="w-full px-3 py-2 border rounded-md font-mono disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
                        placeholder="EMP-001"
                        maxLength={20}
                    />
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
                            className="w-full px-3 py-2 border rounded-md"
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
                            className="w-full px-3 py-2 border rounded-md"
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

                {!isEditing && (
                    <>
                        <FormField
                            label="Email"
                            error={errors.email}
                            hint="Requerido si no proporciona telefono"
                        >
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="juan@example.com"
                                maxLength={255}
                            />
                        </FormField>

                        <FormField
                            label="Telefono"
                            hint="Requerido si no proporciona email"
                        >
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="+525512345678"
                                maxLength={20}
                            />
                        </FormField>

                        <FormField
                            label="Contrasena"
                            error={errors.password}
                            required
                            hint="Minimo 8 caracteres"
                        >
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="••••••••"
                            />
                        </FormField>
                    </>
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
