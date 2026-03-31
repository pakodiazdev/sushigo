import { describe, it, expect } from 'vitest'
import { EMPLOYEE_POSITION_ROLES } from '../employee'
import type { EmployeePositionRole } from '../employee'

describe('EMPLOYEE_POSITION_ROLES', () => {
    it('has manager role', () => {
        expect(EMPLOYEE_POSITION_ROLES['manager']).toBe('Gerente')
    })

    it('has cook role', () => {
        expect(EMPLOYEE_POSITION_ROLES['cook']).toBe('Cocinero')
    })

    it('has kitchen-assistant role', () => {
        expect(EMPLOYEE_POSITION_ROLES['kitchen-assistant']).toBe('Asistente de Cocina')
    })

    it('has delivery-driver role', () => {
        expect(EMPLOYEE_POSITION_ROLES['delivery-driver']).toBe('Repartidor')
    })

    it('has acting-manager role', () => {
        expect(EMPLOYEE_POSITION_ROLES['acting-manager']).toBe('Gerente Interino')
    })

    it('has admin role', () => {
        expect(EMPLOYEE_POSITION_ROLES['admin']).toBe('Administrador')
    })

    it('has super-admin role', () => {
        expect(EMPLOYEE_POSITION_ROLES['super-admin']).toBe('Super Administrador')
    })

    it('has 7 roles total', () => {
        expect(Object.keys(EMPLOYEE_POSITION_ROLES)).toHaveLength(7)
    })

    it('role keys match EmployeePositionRole type', () => {
        const validRoles: EmployeePositionRole[] = [
            'manager',
            'cook',
            'kitchen-assistant',
            'delivery-driver',
            'acting-manager',
            'admin',
            'super-admin',
        ]
        validRoles.forEach((role) => {
            expect(EMPLOYEE_POSITION_ROLES[role]).toBeDefined()
        })
    })
})
