import { useState, useEffect } from 'react'
import { Building2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import type { Branch } from '@/types/auth'

export function BranchSelectionDialog() {
    const { isAdmin, currentBranch, availableBranches, switchBranch } = useAuthStore()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Show dialog for admins without a selected branch and with multiple branches
    useEffect(() => {
        if (isAdmin && !currentBranch && availableBranches.length > 1) {
            setIsOpen(true)
        }
    }, [isAdmin, currentBranch, availableBranches])

    const handleSelectBranch = async (branch: Branch) => {
        setIsLoading(true)
        setError(null)

        try {
            await switchBranch(branch.id)
            setIsOpen(false)
        } catch (err) {
            setError('Error al cambiar de sucursal. Por favor, intenta nuevamente.')
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen || !isAdmin || availableBranches.length <= 1) {
        return null
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Seleccionar Sucursal
                    </h2>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Como administrador, puedes gestionar múltiples sucursales. Por favor, selecciona la sucursal que deseas administrar.
                </p>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                <div className="space-y-2">
                    {availableBranches.map((branch) => (
                        <button
                            key={branch.id}
                            type="button"
                            onClick={() => handleSelectBranch(branch)}
                            disabled={isLoading}
                            className="w-full p-4 text-left rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        {branch.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Código: {branch.code}
                                    </p>
                                    {branch.region && (
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                            Región: {branch.region}
                                        </p>
                                    )}
                                </div>
                                <Building2 className="h-6 w-6 text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                            </div>
                        </button>
                    ))}
                </div>

                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Podrás cambiar de sucursal en cualquier momento desde el menú
                    </p>
                </div>
            </div>
        </div>
    )
}
