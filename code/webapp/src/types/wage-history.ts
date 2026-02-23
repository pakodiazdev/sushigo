// Wage History Module Types

export interface WageHistory {
    id: string // ULID public identifier
    hourly_rate: string // Decimal as string from API
    weekly_scheduled_hours: number
    effective_from: string
    effective_to: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface CreateWageData {
    hourly_rate: number
    weekly_scheduled_hours: number
    effective_from: string
    notes?: string | null
}
