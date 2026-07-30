export function formatCurrency(amount: string | number, currency: string = 'MXN'): string {
    const numAmount = typeof amount === 'string' ? Number.parseFloat(amount) : amount

    if (Number.isNaN(numAmount)) {
        return '-'
    }

    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: currency,
    }).format(numAmount)
}

export function formatDate(date: string): string {
    // Date-only strings (YYYY-MM-DD) parse as UTC midnight per the ISO 8601 spec, which
    // can shift the displayed day under negative UTC offsets. Normalize to local midnight
    // by appending a time component before parsing.
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date

    return new Date(normalized).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

export function formatDateTime(date: string): string {
    return new Date(date).toLocaleString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}
