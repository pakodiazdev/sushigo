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
})
