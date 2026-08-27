import { describe, it, expect } from 'vitest'
import type {
    InventoryLocation,
    Item,
    ItemVariant,
    Stock,
} from '../inventory'

describe('Inventory Types', () => {
    describe('InventoryLocation type', () => {
        it('can create a valid MAIN location', () => {
            const location: InventoryLocation = {
                id: 'location-01',
                operating_unit_id: 1,
                name: 'Main Storage',
                type: 'MAIN',
                priority: 1,
                is_primary: true,
                is_active: true,
            }
            expect(location.type).toBe('MAIN')
            expect(location.is_primary).toBe(true)
        })

        it('can create a TEMP location', () => {
            const location: InventoryLocation = {
                id: 'location-02',
                operating_unit_id: 1,
                name: 'Event Storage',
                type: 'TEMP',
                priority: 5,
                is_primary: false,
                is_active: true,
            }
            expect(location.type).toBe('TEMP')
        })

        it('supports all location types', () => {
            const types = ['MAIN', 'TEMP', 'KITCHEN', 'BAR', 'RETURN'] as const
            types.forEach((type) => {
                const location: InventoryLocation = {
                    id: 'location-01',
                    operating_unit_id: 1,
                    name: `${type} Location`,
                    type,
                    priority: 1,
                    is_primary: false,
                    is_active: true,
                }
                expect(location.type).toBe(type)
            })
        })
    })

    describe('Item type', () => {
        it('can create an INSUMO item', () => {
            const item: Item = {
                id: 1,
                sku: 'INS-001',
                name: 'Flour',
                type: 'INSUMO',
                is_stocked: true,
                is_perishable: false,
                is_active: true,
            }
            expect(item.type).toBe('INSUMO')
            expect(item.is_stocked).toBe(true)
        })

        it('can create a PRODUCTO item', () => {
            const item: Item = {
                id: 2,
                sku: 'PRD-001',
                name: 'Sushi Roll',
                type: 'PRODUCTO',
                is_stocked: true,
                is_perishable: true,
                is_active: true,
            }
            expect(item.type).toBe('PRODUCTO')
        })

        it('can create an ACTIVO item', () => {
            const item: Item = {
                id: 3,
                sku: 'ACT-001',
                name: 'Rice Cooker',
                type: 'ACTIVO',
                is_stocked: false,
                is_perishable: false,
                is_active: true,
            }
            expect(item.type).toBe('ACTIVO')
        })
    })

    describe('ItemVariant type', () => {
        it('can create a valid variant', () => {
            const variant: ItemVariant = {
                id: 'variant-01',
                item_id: 1,
                code: 'VAR-001',
                name: '1kg Bag',
                uom_id: 1,
                avg_unit_cost: 25.50,
                last_unit_cost: 26.00,
                is_active: true,
            }
            expect(variant.code).toBe('VAR-001')
            expect(variant.avg_unit_cost).toBe(25.50)
        })
    })

    describe('Stock type', () => {
        it('can create a valid stock record', () => {
            const stock: Stock = {
                id: 1,
                inventory_location_id: 'location-01',
                item_variant_id: 'variant-01',
                on_hand: 50,
                reserved: 10,
                available: 40,
                weighted_avg_cost: 25.00,
                min_stock: null,
                max_stock: null,
                is_low_stock: false,
            }
            expect(stock.available).toBe(40)
            expect(stock.on_hand - stock.reserved).toBe(40)
        })

        it('calculates available from on_hand minus reserved', () => {
            const stock: Stock = {
                id: 1,
                inventory_location_id: 'location-01',
                item_variant_id: 'variant-01',
                on_hand: 100,
                reserved: 25,
                available: 75,
                weighted_avg_cost: 10.00,
                min_stock: null,
                max_stock: null,
                is_low_stock: false,
            }
            expect(stock.on_hand - stock.reserved).toBe(stock.available)
        })
    })
})
