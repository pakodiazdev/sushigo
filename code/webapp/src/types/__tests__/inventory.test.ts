import { describe, it, expect } from 'vitest'
import type {
    InventoryLocation,
    Item,
    ItemVariant,
    Stock,
    StockMovement,
    StockMovementLine,
    StockMovementReason,
    StockMovementStatus,
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
                can_receive_purchases: true,
            }
            expect(location.type).toBe('MAIN')
            expect(location.is_primary).toBe(true)
            expect(location.can_receive_purchases).toBe(true)
        })

        it('carries an explicit can_receive_purchases capability (#568)', () => {
            const storageOnly: InventoryLocation = {
                id: 'location-03',
                operating_unit_id: 1,
                name: 'Storage Only',
                type: 'MAIN',
                priority: 1,
                is_primary: true,
                is_active: true,
                can_receive_purchases: false,
            }
            expect(storageOnly.can_receive_purchases).toBe(false)
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
                can_receive_purchases: false,
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
                    can_receive_purchases: false,
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
                is_active: true,
            }
            expect(variant.code).toBe('VAR-001')
            // Per-Variant acquisition cost / sale price were dropped in #442 —
            // Stock.weighted_avg_cost and price lists own those now.
            expect('avg_unit_cost' in variant).toBe(false)
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

    describe('StockMovement type (aligned with backend App\\Models\\StockMovement, #438)', () => {
        it('can create a posted purchase-receipt movement with reversal-linkage fields', () => {
            const movement: StockMovement = {
                id: 1,
                from_location_id: null,
                to_location_id: 5,
                item_variant_id: 12,
                user_id: 3,
                qty: 100.5,
                reason: 'PURCHASE_RECEIPT',
                status: 'POSTED',
                reference: 'PR-2026-001',
                related_id: 44,
                related_type: 'App\\Models\\PurchaseReceipt',
                reverses_stock_movement_id: null,
                reversed_by_user_id: null,
                reversed_at: null,
                reversal_reason: null,
                notes: null,
                meta: { original_qty: 100.5, original_uom: 'KG' },
                posted_at: '2026-08-27T15:05:30+00:00',
            }
            expect(movement.reason).toBe('PURCHASE_RECEIPT')
            expect(movement.status).toBe('POSTED')
            expect(movement.reverses_stock_movement_id).toBeNull()
        })

        it('can create a compensating reversal movement', () => {
            const reversal: StockMovement = {
                id: 2,
                from_location_id: 5,
                to_location_id: null,
                item_variant_id: 12,
                user_id: 3,
                qty: 100.5,
                reason: 'PURCHASE_RECEIPT_REVERSAL',
                status: 'POSTED',
                reference: null,
                related_id: null,
                related_type: null,
                reverses_stock_movement_id: 1,
                reversed_by_user_id: null,
                reversed_at: null,
                reversal_reason: 'Supplier delivery rejected',
                notes: null,
                meta: null,
                posted_at: '2026-08-27T16:00:00+00:00',
            }
            expect(reversal.reverses_stock_movement_id).toBe(1)
            expect(reversal.reason).toBe('PURCHASE_RECEIPT_REVERSAL')
        })

        it('supports every backend reason constant', () => {
            const reasons: StockMovementReason[] = [
                'TRANSFER',
                'RETURN',
                'SALE',
                'ADJUSTMENT',
                'CONSUMPTION',
                'OPENING_BALANCE',
                'COUNT_VARIANCE',
                'PURCHASE_RECEIPT',
                'PURCHASE_RECEIPT_REVERSAL',
            ]
            reasons.forEach((reason) => {
                const movement: StockMovement = {
                    id: 1,
                    from_location_id: 1,
                    to_location_id: 2,
                    item_variant_id: 1,
                    user_id: 1,
                    qty: 1,
                    reason,
                    status: 'POSTED',
                    reference: null,
                    related_id: null,
                    related_type: null,
                    reverses_stock_movement_id: null,
                    reversed_by_user_id: null,
                    reversed_at: null,
                    reversal_reason: null,
                    notes: null,
                    meta: null,
                    posted_at: null,
                }
                expect(movement.reason).toBe(reason)
            })
        })

        it('supports every backend status constant', () => {
            const statuses: StockMovementStatus[] = ['DRAFT', 'POSTED', 'REVERSED']
            statuses.forEach((status) => {
                const movement: Pick<StockMovement, 'status'> = { status }
                expect(movement.status).toBe(status)
            })
        })
    })

    describe('StockMovementLine type (aligned with backend App\\Models\\StockMovementLine, #438)', () => {
        it('carries qty/base_qty/conversion_factor/line_total, not the legacy quantity/total_cost', () => {
            const line: StockMovementLine = {
                id: 1,
                stock_movement_id: 1,
                item_variant_id: 12,
                uom_id: 4,
                qty: 10,
                base_qty: 10,
                conversion_factor: 1,
                unit_cost: 50,
                line_total: 500,
                sale_price: null,
                sale_total: null,
                profit_margin: null,
                profit_total: null,
                meta: null,
            }
            expect(line.base_qty).toBe(10)
            expect(line.line_total).toBe(500)
        })
    })
})
