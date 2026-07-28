import { useState } from 'react'
import { Building2, Check } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

export function BranchSwitcher() {
    const { currentBranch, availableBranches, switchBranch, isAdmin } = useAuthStore()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Don't show for users with only one branch
    if (availableBranches.length <= 1 || !isAdmin) {
        return null
    }

    const handleSwitchBranch = async (branchId: number) => {
        if (branchId === currentBranch?.id) {
            setIsOpen(false)
            return
        }

        setIsLoading(true)
        try {
            await switchBranch(branchId)
            setIsOpen(false)
        } catch (error) {
            console.error('Error switching branch:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 w-full px-4 py-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Sucursal Actual</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {currentBranch?.name || 'Seleccionar sucursal'}
                    </div>
                </div>
            </button>

            {isOpen && (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-30 cursor-default appearance-none border-none bg-transparent p-0"
                        onClick={() => setIsOpen(false)}
                        aria-label="Cerrar selector de sucursal"
                    />
                    <div className="absolute bottom-full left-0 right-0 mb-2 z-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 max-h-64 overflow-y-auto">
                        {availableBranches.map((branch) => (
                            <button
                                key={branch.id}
                                type="button"
                                onClick={() => handleSwitchBranch(branch.id)}
                                disabled={isLoading}
                                className="flex items-center justify-between w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {branch.name}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {branch.code}
                                    </div>
                                </div>
                                {currentBranch?.id === branch.id && (
                                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-2" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
