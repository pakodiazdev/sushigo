/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { DetailStatus } from '../detail-status'

afterEach(() => {
    cleanup()
})

describe('DetailStatus', () => {
    it('renders the loading state as an accessible status region', () => {
        const { getByRole, getByText } = render(<DetailStatus kind="loading" />)
        expect(getByRole('status')).toBeDefined()
        expect(getByText('Cargando…')).toBeDefined()
    })

    it('renders the error state as an alert with default copy', () => {
        const { getByRole, getByText } = render(<DetailStatus kind="error" />)
        expect(getByRole('alert')).toBeDefined()
        expect(getByText('No se pudo cargar la información')).toBeDefined()
    })

    it('renders a Reintentar button for error and calls onRetry when clicked', () => {
        const onRetry = vi.fn()
        const { getByRole } = render(<DetailStatus kind="error" onRetry={onRetry} />)
        fireEvent.click(getByRole('button', { name: 'Reintentar' }))
        expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('does not render a retry button for forbidden even when onRetry is passed', () => {
        const onRetry = vi.fn()
        const { queryByRole, getByText } = render(<DetailStatus kind="forbidden" onRetry={onRetry} />)
        expect(queryByRole('button', { name: 'Reintentar' })).toBeNull()
        expect(getByText('No tienes permiso para ver esta información')).toBeDefined()
    })

    it('does not render a retry button for not-found', () => {
        const { queryByRole, getByText } = render(<DetailStatus kind="not-found" />)
        expect(queryByRole('button', { name: 'Reintentar' })).toBeNull()
        expect(getByText('Este registro ya no está disponible')).toBeDefined()
    })

    it('allows overriding title and description', () => {
        const { getByText } = render(
            <DetailStatus kind="error" title="Ups" description="Algo específico falló" />
        )
        expect(getByText('Ups')).toBeDefined()
        expect(getByText('Algo específico falló')).toBeDefined()
    })
})
