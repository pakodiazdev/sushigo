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
    return new Date(date).toLocaleDateString('es-MX', {
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
