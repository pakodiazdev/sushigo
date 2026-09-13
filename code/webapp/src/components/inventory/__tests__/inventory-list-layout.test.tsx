// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { InventoryListLayout } from '../inventory-list-layout'
import type { Column } from '@/components/ui/data-grid'

afterEach(cleanup)

interface Row {
  id: string
  name: string
}

const columns: Column<Row>[] = [{ key: 'name', header: 'Nombre' }]

const baseProps = {
  searchValue: '',
  onSearchChange: vi.fn(),
  searchPlaceholder: 'Buscar...',
  statusValue: '',
  onStatusChange: vi.fn(),
  columns,
  onRowClick: vi.fn(),
  loading: false,
  currentPage: 1,
  totalPages: 1,
  onPageChange: vi.fn(),
}

describe('InventoryListLayout', () => {
  it('renders rows when present', () => {
    render(<InventoryListLayout {...baseProps} rows={[{ id: '1', name: 'Fila A' }]} />)
    expect(screen.getByText('Fila A')).toBeDefined()
  })

  it('shows a Spanish default empty message with no filters active (never the English DataGrid default)', () => {
    render(<InventoryListLayout {...baseProps} rows={[]} />)
    expect(screen.getByText('Aún no hay registros')).toBeDefined()
    expect(screen.queryByText('No data available')).toBeNull()
  })

  it('shows the filtered-empty message and a Limpiar filtros action when a filter is active', () => {
    const onClearFilters = vi.fn()
    render(
      <InventoryListLayout
        {...baseProps}
        rows={[]}
        searchValue="xyz"
        onClearFilters={onClearFilters}
      />
    )
    expect(screen.getByText('Sin resultados que coincidan con los filtros')).toBeDefined()
    fireEvent.click(screen.getByText('Limpiar filtros'))
    expect(onClearFilters).toHaveBeenCalledOnce()
  })

  it('never reuses the unfiltered emptyDescription in the filtered-empty case (#576 review finding)', () => {
    render(
      <InventoryListLayout
        {...baseProps}
        rows={[]}
        searchValue="xyz"
        emptyDescription="Registra un item para verlo aquí."
      />
    )
    expect(screen.queryByText('Registra un item para verlo aquí.')).toBeNull()
    expect(screen.getByText('Intenta con otros filtros o términos de búsqueda.')).toBeDefined()
  })

  it('lets a caller override the filtered-empty title/description independently of the unfiltered ones', () => {
    render(
      <InventoryListLayout
        {...baseProps}
        rows={[]}
        searchValue="xyz"
        emptyTitle="Aún no hay items"
        emptyDescription="Registra un item para verlo aquí."
        emptyFilteredTitle="Nada coincide"
        emptyFilteredDescription="Prueba otro término."
      />
    )
    expect(screen.getByText('Nada coincide')).toBeDefined()
    expect(screen.getByText('Prueba otro término.')).toBeDefined()
    expect(screen.queryByText('Aún no hay items')).toBeNull()
    expect(screen.queryByText('Registra un item para verlo aquí.')).toBeNull()
  })

  it('does not render Limpiar filtros without onClearFilters even when filtered-empty', () => {
    render(<InventoryListLayout {...baseProps} rows={[]} searchValue="xyz" />)
    expect(screen.queryByText('Limpiar filtros')).toBeNull()
  })

  it('renders the caller-supplied emptyAction only in the unfiltered-empty case', () => {
    render(
      <InventoryListLayout
        {...baseProps}
        rows={[]}
        emptyAction={<button type="button">Crear el primero</button>}
      />
    )
    expect(screen.getByText('Crear el primero')).toBeDefined()
  })

  it('does not render the unfiltered emptyAction when the empty result is filtered', () => {
    render(
      <InventoryListLayout
        {...baseProps}
        rows={[]}
        searchValue="xyz"
        emptyAction={<button type="button">Crear el primero</button>}
      />
    )
    expect(screen.queryByText('Crear el primero')).toBeNull()
  })

  it('renders the error state with retry instead of any empty message', () => {
    const onRetry = vi.fn()
    render(<InventoryListLayout {...baseProps} rows={[]} error onRetry={onRetry} />)
    expect(screen.queryByText('Aún no hay registros')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows the refetching indicator while keeping rows visible', () => {
    render(<InventoryListLayout {...baseProps} rows={[{ id: '1', name: 'Fila A' }]} isRefetching />)
    expect(screen.getByText('Actualizando…')).toBeDefined()
    expect(screen.getByText('Fila A')).toBeDefined()
  })
})
