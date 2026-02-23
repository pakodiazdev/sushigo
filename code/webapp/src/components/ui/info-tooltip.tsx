import { Info } from 'lucide-react'

interface InfoTooltipProps {
    text: string
    className?: string
}

export function InfoTooltip({ text, className = '' }: InfoTooltipProps) {
    return (
        <span className={`relative inline-flex ml-1 group cursor-help ${className}`}>
            <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-blue-500 transition-colors" />
            <span className="invisible group-hover:visible absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-56 px-2 py-1.5 text-xs text-white bg-gray-800 rounded shadow-lg">
                {text}
                <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-800" />
            </span>
        </span>
    )
}
