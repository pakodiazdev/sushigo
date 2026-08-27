// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { CrudSlidePanels } from '../crud-slide-panels'
import { StatusFilterSelect } from '../status-filter-select'
import { InventoryListLayout } from '../inventory-list-layout'
import type { Column } from '@/components/ui/data-grid'

afterEach(cleanup)

describe('CrudSlidePanels', () => {
  const baseProps = {
    detailsTitle: 'Detalle',
    isDetailsOpen: false,
    onDetailsClose: vi.fn(),
    detailsContent: <div>details body</div>,
    formTitle: 'Nuevo',
    isFormOpen: false,
    onFormClose: vi.fn(),
    formContent: <div>form body</div>,
  }

  it('renders the details panel content and title when open', () => {
    render(<CrudSlidePanels {...baseProps} isDetailsOpen />)
    expect(screen.getByText('Detalle')).toBeDefined()
    expect(screen.getByText('details body')).toBeDefined()
  })

  it('renders the form panel content and title when open', () => {
    render(<CrudSlidePanels {...baseProps} isFormOpen />)
    expect(screen.getByText('Nuevo')).toBeDefined()
    expect(screen.getByText('form body')).toBeDefined()
  })

  it('invokes the matching close handler', () => {
    const onDetailsClose = vi.fn()
    render(<CrudSlidePanels {...baseProps} isDetailsOpen onDetailsClose={onDetailsClose} />)
    fireEvent.click(screen.getByText('Close panel'))
    expect(onDetailsClose).toHaveBeenCalledOnce()
  })

  it('renders neither panel body when both are closed', () => {
    render(<CrudSlidePanels {...baseProps} />)
    expect(screen.queryByText('details body')).toBeNull()
    expect(screen.queryByText('form body')).toBeNull()
  })
})

describe('StatusFilterSelect', () => {
  it('offers the active/inactive options and reports changes', () => {
    const onChange = vi.fn()
    render(<StatusFilterSelect value="" onChange={onChange} />)
    expect(screen.getByText('Activos')).toBeDefined()
    expect(screen.getByText('Inactivos')).toBeDefined()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'active' } })
    expect(onChange).toHaveBeenCalledWith('active')
  })
})

describe('InventoryListLayout', () => {
  interface Row { id: number; name: string }
  const columns: Column<Row>[] = [{ key: 'name', header: 'Name', render: (r) => r.name }]
  const rows: Row[] = [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }]

  const baseProps = {
    searchValue: '',
    onSearchChange: vi.fn(),
    searchPlaceholder: 'Buscar…',
    statusValue: '',
    onStatusChange: vi.fn(),
    rows,
    columns,
    onRowClick: vi.fn(),
    loading: false,
    currentPage: 1,
    totalPages: 3,
    onPageChange: vi.fn(),
  }

  it('renders the search box, the Estado filter and the grid rows', () => {
    render(<InventoryListLayout {...baseProps} />)
    expect(screen.getByPlaceholderText('Buscar…')).toBeDefined()
    expect(screen.getByText('Activos')).toBeDefined()
    expect(screen.getByText('Alpha')).toBeDefined()
    expect(screen.getByText('Beta')).toBeDefined()
  })

  it('renders extra filter controls passed via `filters`', () => {
    render(<InventoryListLayout {...baseProps} filters={<span>tipo-filter</span>} />)
    expect(screen.getByText('tipo-filter')).toBeDefined()
  })

  it('forwards a row click', () => {
    const onRowClick = vi.fn()
    render(<InventoryListLayout {...baseProps} onRowClick={onRowClick} />)
    fireEvent.click(screen.getByText('Alpha'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0], expect.anything())
  })
})
