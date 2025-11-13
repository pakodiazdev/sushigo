# 💰 Implement Price Lists System

## 📖 Story

As a restaurant manager, I need to configure different prices for the same product based on sales channel (dine-in, delivery, apps), customer type (retail, wholesale), time period (happy hour, breakfast), or location, so that I can maximize revenue with flexible pricing strategies without manually updating each variant.

---

## ✅ Technical Tasks

### Backend - Database Schema

-   [ ] 📂 Create migration `create_price_lists_table.php`
    -   Fields: id, code (unique), name, type (LOCATION/CUSTOMER_TYPE/CHANNEL/PROMOTION), priority, is_active, timestamps
    -   Indexes: code, type, is_active
-   [ ] 📂 Create migration `create_price_list_items_table.php`
    -   Fields: id, price_list_id (FK), item_variant_id (FK), sale_price, effective_from (nullable), effective_to (nullable), timestamps
    -   Unique constraint: (price_list_id, item_variant_id, effective_from)
    -   Indexes: price_list_id, item_variant_id, effective dates
-   [ ] 📂 Create migration `create_price_list_locations_table.php`
    -   Fields: price_list_id (FK), inventory_location_id (FK)
    -   Primary key: (price_list_id, inventory_location_id)

### Backend - Models & Relationships

-   [ ] 🔧 Create `PriceList` model
    -   Fillable: code, name, type, priority, is_active
    -   Casts: is_active → boolean, priority → integer
    -   Relationships: hasMany(PriceListItem), belongsToMany(InventoryLocation)
    -   Scopes: active(), byType()
-   [ ] 🔧 Create `PriceListItem` model
    -   Fillable: price_list_id, item_variant_id, sale_price, effective_from, effective_to
    -   Casts: sale_price → decimal:4, dates → datetime
    -   Relationships: belongsTo(PriceList), belongsTo(ItemVariant)
    -   Scopes: effectiveOn(date), activeNow()
-   [ ] 🔧 Update `ItemVariant` model
    -   Add relationship: hasMany(PriceListItem)
    -   Add helper method: `getPriceForLocation(locationId, datetime = null)`

### Backend - Pricing Service

-   [ ] 🔧 Create `app/Services/PricingService.php`
    -   Method: `getPrice(variantId, locationId = null, datetime = null, customerId = null)`
    -   Logic: Query price lists by priority, check effective dates, fallback to ItemVariant.sale_price
    -   Cache results with Redis (optional, 5min TTL)
-   [ ] 🔧 Create `app/Services/PriceListService.php`
    -   Method: `applyBulkDiscount(priceListId, percentage, itemIds = [])`
    -   Method: `clonePriceList(sourceId, newCode, newName)`
    -   Method: `syncItemsFromVariants(priceListId, variantIds)`

### Backend - API Endpoints

-   [ ] 🔧 Create `PriceListController`
    -   GET /price-lists (list with filters: type, is_active, search)
    -   GET /price-lists/{id} (show with items)
    -   POST /price-lists (create)
    -   PUT /price-lists/{id} (update)
    -   DELETE /price-lists/{id} (soft delete)
-   [ ] 🔧 Create `PriceListItemController`
    -   GET /price-lists/{id}/items (list items for a price list)
    -   POST /price-lists/{id}/items (add/update items in bulk)
    -   DELETE /price-lists/{id}/items/{itemId} (remove item)
    -   POST /price-lists/{id}/items/bulk-discount (apply % discount)
-   [ ] 🔧 Create FormRequests
    -   `CreatePriceListRequest`: validate code unique, type enum, priority range
    -   `UpdatePriceListRequest`: same as create
    -   `CreatePriceListItemRequest`: validate sale_price > 0, effective dates logic
    -   `BulkDiscountRequest`: validate percentage range -100 to 100

### Backend - Integration

-   [ ] 🔧 Update `StockMovementLineController` (stock-out)
    -   Use `PricingService::getPrice()` to auto-fill sale_price field
    -   Pass location_id and datetime for accurate price resolution
-   [ ] 🔧 Update `CreateItemVariantController`
    -   Keep sale_price as required field (fallback price)
    -   Add documentation explaining it's the "base price"
-   [ ] 🔧 Add Swagger documentation
    -   Document all PriceList endpoints
    -   Add examples for different pricing scenarios
    -   Document price resolution algorithm

### Frontend - Types & API

-   [ ] 📂 Update `src/types/inventory.ts`
    -   Add PriceList interface
    -   Add PriceListItem interface
    -   Add PriceListType enum
-   [ ] 🔧 Create `src/services/pricing-api.ts`
    -   priceListApi.list(), get(), create(), update(), delete()
    -   priceListItemApi.list(), bulkUpdate(), bulkDiscount()
    -   pricingApi.getPrice(variantId, locationId, datetime)

### Frontend - Price List Management

-   [ ] 🔧 Create `src/pages/pricing/price-lists.tsx`
    -   DataGrid with columns: code, name, type, priority, items count, status
    -   Filters: type, is_active, search
    -   Actions: create, edit, delete, clone
    -   Click row → open details panel
-   [ ] 🔧 Create `src/components/pricing/price-list-form.tsx`
    -   Fields: code, name, type (select), priority (number), is_active (checkbox)
    -   Location assignment (multi-select, only for type=LOCATION)
    -   Validation: code unique, priority 1-1000
-   [ ] 🔧 Create `src/components/pricing/price-list-details.tsx`
    -   Show price list info
    -   Table of assigned items with sale_price
    -   Actions: edit, delete, add items, bulk discount
-   [ ] 🔧 Create `src/components/pricing/price-list-items-form.tsx`
    -   Search/select variants to add
    -   Set sale_price per variant
    -   Optional: effective_from, effective_to dates
    -   Bulk actions: apply % discount, copy from another list

### Frontend - Integration

-   [ ] 🔧 Update `ProductWizard` Step 2
    -   Add info tooltip: "Este es el precio base. Puedes configurar precios especiales en Listas de Precios"
    -   Link to price lists page
-   [ ] 🔧 Update `StockOutForm`
    -   Auto-fill sale_price using PricingService when location selected
    -   Show badge: "Precio de lista: [name]" or "Precio base" if fallback
    -   Allow manual override
-   [ ] 🔧 Add to navigation menu
    -   Section: "Pricing" or inside "Inventory"
    -   Item: "Price Lists" → /pricing/price-lists

### Documentation

-   [ ] 📝 Create `doc/architecture/pricing-system.es.md`
    -   Explain price resolution algorithm with flowchart
    -   Use cases: location pricing, channel pricing, promotions, customer types
    -   ERD diagram: PriceList → PriceListItem → ItemVariant
    -   Examples: happy hour, delivery markup, wholesale discount
-   [ ] 📝 Update `inventory-architecture.es.md`
    -   Add PriceList entities to ERD
    -   Document ItemVariant.sale_price as "fallback price"
    -   Explain interaction with StockMovementLine.sale_price

### Testing

-   [ ] 🧪 Backend unit tests
    -   PricingService: priority resolution, effective dates, fallback logic
    -   PriceListService: bulk discount calculations, cloning
-   [ ] 🧪 Backend feature tests
    -   Create price list with items
    -   Query price for location at specific datetime
    -   Apply bulk discount and verify calculations
-   [ ] 🧪 Frontend integration tests
    -   Create price list via form
    -   Add items to price list
    -   Stock out form auto-fills correct price

---

## ⏱️ Time

### 📊 Estimates

-   **Optimistic:** `6h`
-   **Pessimistic:** `12h`
-   **Tracked:** ``

### 📅 Sessions

```json
[]
```

---

## 📌 Notes

### Design Decisions

-   **ItemVariant.sale_price remains required**: Acts as fallback/base price when no price list matches
-   **Priority system**: Higher priority lists override lower ones (allows layering: base → location → promotion)
-   **Effective dates**: Optional datetime range for promotions (e.g., happy hour 17:00-19:00)
-   **Price resolution order**:
    1. Check price lists by priority (DESC)
    2. Filter by location (if applicable)
    3. Filter by effective dates (if set)
    4. Return first match OR fallback to ItemVariant.sale_price

### Future Enhancements (out of scope)

-   Customer-specific pricing (requires Customer model)
-   Quantity-based discounts (tiered pricing)
-   Dynamic pricing based on demand/inventory levels
-   Multi-currency support
-   Price change history/audit log (Laravel Auditing)

### Dependencies

-   Requires Task #006 (Product Wizard with ItemVariant.sale_price)
-   Requires Task #004 (Stock movements with sale_price field)
-   Optional: Redis for price caching (performance optimization)

### References

-   SAP SD Price Condition Records
-   Odoo Pricelists documentation
-   Stripe Price objects API
