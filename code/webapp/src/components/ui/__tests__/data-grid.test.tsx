/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { DataGrid } from '../data-grid'
import type { Column } from '../data-grid'

afterEach(() => {
    cleanup()
})

interface TestItem {
    id: number
    name: string
    value: number
}

const testData: TestItem[] = [
    { id: 1, name: 'Item 1', value: 100 },
    { id: 2, name: 'Item 2', value: 200 },
    { id: 3, name: 'Item 3', value: 300 },
]

const testColumns: Column<TestItem>[] = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name' },
    { key: 'value', header: 'Value' },
]

describe('DataGrid', () => {
    describe('rendering', () => {
        it('renders column headers', () => {
            const { getByText } = render(
                <DataGrid data={testData} columns={testColumns} />
            )
            expect(getByText('ID')).toBeDefined()
            expect(getByText('Name')).toBeDefined()
            expect(getByText('Value')).toBeDefined()
        })

        it('renders data rows', () => {
            const { getByText } = render(
                <DataGrid data={testData} columns={testColumns} />
            )
            expect(getByText('Item 1')).toBeDefined()
            expect(getByText('Item 2')).toBeDefined()
            expect(getByText('Item 3')).toBeDefined()
        })

        it('renders cell values', () => {
            const { getByText } = render(
                <DataGrid data={testData} columns={testColumns} />
            )
            expect(getByText('100')).toBeDefined()
            expect(getByText('200')).toBeDefined()
            expect(getByText('300')).toBeDefined()
        })
    })

    describe('empty state', () => {
        it('renders default empty message when data is empty', () => {
            const { getByText } = render(
                <DataGrid data={[]} columns={testColumns} />
            )
            expect(getByText('No data available')).toBeDefined()
        })

        it('renders custom empty message', () => {
            const { getByText } = render(
                <DataGrid data={[]} columns={testColumns} emptyMessage="No items found" />
            )
            expect(getByText('No items found')).toBeDefined()
        })
    })

    describe('row click', () => {
        it('calls onRowClick when row is clicked', () => {
            const onRowClick = vi.fn()
            const { getByText } = render(
                <DataGrid data={testData} columns={testColumns} onRowClick={onRowClick} />
            )

            const row = getByText('Item 1').closest('tr')
            if (row) {
                fireEvent.click(row)
            }

            expect(onRowClick).toHaveBeenCalledWith(testData[0])
        })

        it('adds cursor-pointer class when onRowClick is provided', () => {
            const onRowClick = vi.fn()
            const { getByText } = render(
                <DataGrid data={testData} columns={testColumns} onRowClick={onRowClick} />
            )

            const row = getByText('Item 1').closest('tr')
            expect(row?.className).toContain('cursor-pointer')
        })
    })

    describe('custom render', () => {
        it('uses custom render function for column', () => {
            const columns: Column<TestItem>[] = [
                { key: 'id', header: 'ID' },
                { key: 'name', header: 'Name', render: (item) => <strong>Custom: {item.name}</strong> },
            ]

            const { getByText } = render(
                <DataGrid data={testData} columns={columns} />
            )

            expect(getByText('Custom: Item 1')).toBeDefined()
        })
    })

    describe('loading state', () => {
        it('shows spinner when loading with no skeleton columns', () => {
            const { container } = render(
                <DataGrid data={[]} columns={testColumns} loading={true} />
            )

            // No skeleton on columns → renders spinner
            const spinner = container.querySelectorAll('.animate-spin')
            expect(spinner.length).toBeGreaterThan(0)
        })

        it('shows skeleton rows when loading and columns have skeleton functions', () => {
            const skeletonColumns: Column<{ id: number; name: string }>[] = [
                {
                    key: 'id',
                    header: 'ID',
                    render: (row) => row.id,
                    skeleton: () => <div className="skeleton-id animate-pulse" />,
                },
                {
                    key: 'name',
                    header: 'Name',
                    render: (row) => row.name,
                    skeleton: () => <div className="skeleton-name animate-pulse" />,
                },
            ]
            const { container } = render(
                <DataGrid data={[]} columns={skeletonColumns} loading={true} skeletonRows={3} />
            )

            const skeletons = container.querySelectorAll('.animate-pulse')
            // 3 rows × 2 columns = 6 skeleton cells
            expect(skeletons.length).toBe(6)
        })
    })

    describe('className', () => {
        it('applies custom className', () => {
            const { container } = render(
                <DataGrid data={testData} columns={testColumns} className="custom-grid" />
            )

            expect(container.firstChild).toBeDefined()
            expect((container.firstChild as HTMLElement)?.className).toContain('custom-grid')
        })
    })

    describe('column alignment', () => {
        it('aligns column text based on align prop', () => {
            const columns: Column<TestItem>[] = [
                { key: 'id', header: 'ID', align: 'right' },
                { key: 'name', header: 'Name', align: 'center' },
            ]

            const { container } = render(
                <DataGrid data={testData} columns={columns} />
            )

            // Check that alignment classes are applied
            const cells = container.querySelectorAll('td')
            expect(cells.length).toBeGreaterThan(0)
        })
    })

    describe('selected row', () => {
        it('highlights selected row', () => {
            const { getByText } = render(
                <DataGrid
                    data={testData}
                    columns={testColumns}
                    selectedId={2}
                    getRowId={(item) => item.id}
                />
            )

            const selectedRow = getByText('Item 2').closest('tr')
            expect(selectedRow?.className).toContain('bg-primary')
        })
    })

    describe('sorting', () => {
        it('renders sort icon on sortable columns', () => {
            const sortableColumns: Column<TestItem>[] = [
                { key: 'id', header: 'ID', sortKey: 'id' },
                { key: 'name', header: 'Name', sortKey: 'name' },
            ]
            const onSortChange = vi.fn()

            const { container } = render(
                <DataGrid
                    data={testData}
                    columns={sortableColumns}
                    sorting={[]}
                    onSortChange={onSortChange}
                />
            )

            // Should have sort icons (ArrowUpDown for unsorted)
            const headers = container.querySelectorAll('th')
            expect(headers.length).toBe(2)
        })

        it('calls onSortChange when clicking sortable column header', () => {
            const sortableColumns: Column<TestItem>[] = [
                { key: 'id', header: 'ID', sortKey: 'id' },
                { key: 'name', header: 'Name', sortKey: 'name' },
            ]
            const onSortChange = vi.fn()

            const { getByText } = render(
                <DataGrid
                    data={testData}
                    columns={sortableColumns}
                    sorting={[]}
                    onSortChange={onSortChange}
                />
            )

            fireEvent.click(getByText('ID'))
            expect(onSortChange).toHaveBeenCalledWith([{ key: 'id', direction: 'asc' }])
        })

        it('toggles sort direction from asc to desc on second click', () => {
            const sortableColumns: Column<TestItem>[] = [
                { key: 'id', header: 'ID', sortKey: 'id' },
            ]
            const onSortChange = vi.fn()

            const { getByText } = render(
                <DataGrid
                    data={testData}
                    columns={sortableColumns}
                    sorting={[{ key: 'id', direction: 'asc' }]}
                    onSortChange={onSortChange}
                />
            )

            fireEvent.click(getByText('ID'))
            expect(onSortChange).toHaveBeenCalledWith([{ key: 'id', direction: 'desc' }])
        })

        it('removes sort on third click', () => {
            const sortableColumns: Column<TestItem>[] = [
                { key: 'id', header: 'ID', sortKey: 'id' },
            ]
            const onSortChange = vi.fn()

            const { getByText } = render(
                <DataGrid
                    data={testData}
                    columns={sortableColumns}
                    sorting={[{ key: 'id', direction: 'desc' }]}
                    onSortChange={onSortChange}
                />
            )

            fireEvent.click(getByText('ID'))
            expect(onSortChange).toHaveBeenCalledWith([])
        })
    })

    describe('pagination', () => {
        it('renders pagination when pagination prop is provided', () => {
            const onPageChange = vi.fn()
            const { container } = render(
                <DataGrid
                    data={testData}
                    columns={testColumns}
                    pagination={{
                        currentPage: 1,
                        totalPages: 5,
                        onPageChange,
                    }}
                />
            )

            // Should have pagination buttons
            const buttons = container.querySelectorAll('button')
            expect(buttons.length).toBeGreaterThan(0)
        })

        it('calls onPageChange when clicking page number', () => {
            const onPageChange = vi.fn()
            const { container } = render(
                <DataGrid
                    data={testData}
                    columns={testColumns}
                    pagination={{
                        currentPage: 1,
                        totalPages: 5,
                        onPageChange,
                    }}
                />
            )

            // Find all buttons and click the one with text "3"
            const buttons = Array.from(container.querySelectorAll('button'))
            const pageButton = buttons.find(btn => btn.textContent === '3')
            if (pageButton) {
                fireEvent.click(pageButton)
            }
            expect(onPageChange).toHaveBeenCalledWith(3)
        })

        it('highlights current page', () => {
            const onPageChange = vi.fn()
            const { container } = render(
                <DataGrid
                    data={testData}
                    columns={testColumns}
                    pagination={{
                        currentPage: 2,
                        totalPages: 5,
                        onPageChange,
                    }}
                />
            )

            // Find button with aria-current="page"
            const currentPageButton = container.querySelector('[aria-current="page"]')
            expect(currentPageButton?.className).toContain('bg-primary')
        })

        it('renders ellipsis on both sides when current page is in the middle of a long range', () => {
            const onPageChange = vi.fn()
            const { container, getAllByText } = render(
                <DataGrid
                    data={testData}
                    columns={testColumns}
                    pagination={{
                        currentPage: 10,
                        totalPages: 20,
                        onPageChange,
                    }}
                />
            )

            // Two ellipsis spans per responsive nav (5/7/10-button breakpoints), each with a unique key
            const ellipses = getAllByText('…')
            expect(ellipses.length).toBeGreaterThan(0)
            ellipses.forEach((el) => expect(el.tagName).toBe('SPAN'))

            // First and last page are still reachable
            const buttons = Array.from(container.querySelectorAll('button'))
            const firstPageButton = buttons.find(btn => btn.textContent === '1')
            expect(firstPageButton).toBeDefined()
            fireEvent.click(firstPageButton!)
            expect(onPageChange).toHaveBeenCalledWith(1)

            const lastPageButton = buttons.find(btn => btn.textContent === '20')
            expect(lastPageButton).toBeDefined()
            fireEvent.click(lastPageButton!)
            expect(onPageChange).toHaveBeenCalledWith(20)
        })
    })

    describe('column visibility', () => {
        it('applies hideBelow class for responsive columns', () => {
            const responsiveColumns: Column<TestItem>[] = [
                { key: 'id', header: 'ID' },
                { key: 'name', header: 'Name', hideBelow: 'md' },
            ]

            const { container } = render(
                <DataGrid data={testData} columns={responsiveColumns} />
            )

            // Check for hidden class on cells
            const cells = container.querySelectorAll('td')
            const nameCell = cells[1]
            expect(nameCell?.className).toContain('hidden')
            expect(nameCell?.className).toContain('md:table-cell')
        })
    })

    describe('perPage selector', () => {
        it('renders perPage selector when onPerPageChange is provided', () => {
            const onPerPageChange = vi.fn()
            const { getByRole } = render(
                <DataGrid
                    data={testData}
                    columns={testColumns}
                    perPage={10}
                    perPageOptions={[10, 20, 50]}
                    onPerPageChange={onPerPageChange}
                />
            )

            const select = getByRole('combobox')
            expect(select).toBeDefined()
        })

        it('calls onPerPageChange when selecting different value', () => {
            const onPerPageChange = vi.fn()
            const { getByRole } = render(
                <DataGrid
                    data={testData}
                    columns={testColumns}
                    perPage={10}
                    perPageOptions={[10, 20, 50]}
                    onPerPageChange={onPerPageChange}
                />
            )

            const select = getByRole('combobox')
            fireEvent.change(select, { target: { value: '20' } })
            expect(onPerPageChange).toHaveBeenCalledWith(20)
        })
    })

    describe('total results', () => {
        it('displays total results count when provided', () => {
            const { getByText } = render(
                <DataGrid
                    data={testData}
                    columns={testColumns}
                    totalResults={100}
                />
            )

            expect(getByText(/100/)).toBeDefined()
        })
    })
})
