import { useId } from 'react'

interface ToggleSwitchProps {
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
}

export function ToggleSwitch({ label, checked, onChange, disabled = false }: ToggleSwitchProps) {
    const id = useId()

    return (
        <label htmlFor={id} className={`flex items-center gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-labelledby={`${id}-label`}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${checked
                        ? 'bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
            >
                <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                />
            </button>
            <span id={`${id}-label`} className="text-sm font-medium text-foreground">{label}</span>
        </label>
    )
}
