import { Filter } from 'lucide-react'
import { Select } from '@/components/ui/form-fields'
import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
}

interface FilterSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  placeholder?: string
  showIcon?: boolean
  className?: string
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'All',
  showIcon = true,
  className,
}: FilterSelectProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showIcon && <Filter className="h-4 w-4 text-muted-foreground" />}
      <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
        {label}:
      </label>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[140px]"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  )
}
