/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { EmployeeFilters } from '../employee-filters'

describe('EmployeeFilters', () => {
    const defaultProps = {
        search: '',
        role: '',
        status: undefined,
        onFilterChange: vi.fn(),
        onNew: vi.fn(),
    }

    afterEach(() => {
        cleanup()
        vi.clearAllMocks()
    })

    it('renders search input', () => {
        const { container } = render(<EmployeeFilters {...defaultProps} />)
        const input = container.querySelector('input[placeholder*="Buscar"]')
        expect(input).not.toBeNull()
    })

    it('renders role filter', () => {
        const { getByText } = render(<EmployeeFilters {...defaultProps} />)
        expect(getByText('Puesto:')).toBeDefined()
    })

    it('renders status filter', () => {
        const { getByText } = render(<EmployeeFilters {...defaultProps} />)
        expect(getByText('Estado:')).toBeDefined()
    })

    it('renders new employee button', () => {
        const { getByText } = render(<EmployeeFilters {...defaultProps} />)
        expect(getByText('Nuevo Empleado')).toBeDefined()
    })

    it('calls onNew when button is clicked', () => {
        const onNew = vi.fn()
        const { getByText } = render(<EmployeeFilters {...defaultProps} onNew={onNew} />)
        
        fireEvent.click(getByText('Nuevo Empleado'))
        
        expect(onNew).toHaveBeenCalledTimes(1)
    })

    it('renders search input with value', () => {
        const { container } = render(<EmployeeFilters {...defaultProps} search="John" />)
        const input = container.querySelector('input') as HTMLInputElement
        expect(input.value).toBe('John')
    })

    it('renders role options', () => {
        const { getByText } = render(<EmployeeFilters {...defaultProps} />)
        // Should have placeholder option
        expect(getByText('Todos los puestos')).toBeDefined()
    })

    it('renders status options', () => {
        const { getByText } = render(<EmployeeFilters {...defaultProps} />)
        expect(getByText('Activos')).toBeDefined()
        expect(getByText('Inactivos')).toBeDefined()
        expect(getByText('Baja')).toBeDefined()
    })

    it('calls onFilterChange when role changes', () => {
        const onFilterChange = vi.fn()
        const { container } = render(
            <EmployeeFilters {...defaultProps} onFilterChange={onFilterChange} />
        )
        
        // Find the role select (first combobox after search input)
        const selects = container.querySelectorAll('select')
        const roleSelect = selects[0]
        
        fireEvent.change(roleSelect, { target: { value: 'itamae' } })
        
        expect(onFilterChange).toHaveBeenCalled()
        expect(onFilterChange.mock.calls[0][0]).toBe('role')
    })

    it('calls onFilterChange when status changes', () => {
        const onFilterChange = vi.fn()
        const { container } = render(
            <EmployeeFilters {...defaultProps} onFilterChange={onFilterChange} />
        )
        
        // Find the status select (second combobox)
        const selects = container.querySelectorAll('select')
        const statusSelect = selects[1]
        
        fireEvent.change(statusSelect, { target: { value: 'active' } })
        
        expect(onFilterChange).toHaveBeenCalled()
        expect(onFilterChange.mock.calls[0][0]).toBe('status')
    })

    it('passes undefined when status is cleared', () => {
        const onFilterChange = vi.fn()
        const { container } = render(
            <EmployeeFilters {...defaultProps} status="active" onFilterChange={onFilterChange} />
        )
        
        const selects = container.querySelectorAll('select')
        const statusSelect = selects[1]
        
        fireEvent.change(statusSelect, { target: { value: '' } })
        
        expect(onFilterChange).toHaveBeenCalled()
        expect(onFilterChange.mock.calls[0][0]).toBe('status')
        expect(onFilterChange.mock.calls[0][1]).toBeUndefined()
    })
})
