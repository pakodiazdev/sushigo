/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RoutePendingFallback, RouteErrorFallback } from '../route-fallbacks'

afterEach(cleanup)

describe('RoutePendingFallback', () => {
  it('renders an accessible loading status', () => {
    render(<RoutePendingFallback />)
    expect(screen.getByRole('status').textContent).toContain('Cargando…')
  })
})

describe('RouteErrorFallback', () => {
  it('reloads the page on a chunk-load failure instead of resetting the route', () => {
    const reset = vi.fn()
    const reloadSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload: reloadSpy })

    render(
      <RouteErrorFallback
        error={new Error('Failed to fetch dynamically imported module')}
        reset={reset}
      />
    )

    expect(screen.getByRole('alert').textContent).toContain('Hay una nueva versión disponible')
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }))

    expect(reloadSpy).toHaveBeenCalledTimes(1)
    expect(reset).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('calls reset() for any other route error, without reloading', () => {
    const reset = vi.fn()
    const reloadSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload: reloadSpy })

    render(<RouteErrorFallback error={new Error('Network Error')} reset={reset} />)

    expect(screen.getByRole('alert').textContent).toContain('Ocurrió un error al cargar esta página')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(reset).toHaveBeenCalledTimes(1)
    expect(reloadSpy).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
