# 🧠 Task #005: Logical Design and Comprehensive Documentation of SushiGo Inventory

## 📖 Story

As a SushiGo platform architect, I need to consolidate the logical design of the inventory system and update associated documentation, so that the team can implement and extend the domain with a consistent guide that reflects current diagrams.

---

## ✅ Technical Tasks

### Architecture & Analysis

-   [ ] 🔍 Compare current ER diagram with projected Laravel models, identifying gaps (missing fields, inconsistent types, N:M relationships).
-   [ ] 🧩 Evaluate class diagram against planned service layers (Transfers, Sales, Costing) and document each service's responsibilities.
-   [ ] 🔄 Map operational flows (event, sale, state machine) with prioritized use cases for inventory MVP.

### Documentation

-   [ ] 📝 Update `doc/architecture/inventory-architecture.md` with analysis findings (new fields, conversion rules, service dependencies).
-   [ ] 📘 Add appendices for expected migrations (`branches`, `operating_units`, `inventory_locations`, `stock_movements`, `media_*`).
-   [ ] 🧾 Define naming conventions for Hashids and external references in inventory API.
-   [ ] 🗺️ Draft documentation navigation guide (what to read first, how to use diagrams, relationship with technical tasks).

### Technical Coordination

-   [ ] 🤝 Generate frontend impact checklist (onboarding wizard, stock dashboard) based on defined entities and flows.
-   [ ] 🧪 Propose minimum test set (unit, integration, end-to-end) aligned with described movements and conversions.
-   [ ] 🧭 Review dependencies with tasks #002 and #006 to avoid deliverable duplication and ensure execution order.

---

## 🧩 Analyzed Diagram Insights

### Main ER Diagram

-   `Branch → OperatingUnit → InventoryLocation` defines multi-branch hierarchy; movements are always traced by location, enabling inter and intra-branch transfers.
-   `Item` and `ItemVariant` separate master catalog from operational variants; unit conversions depend on type (`INSUMO` vs `PRODUCTO/ACTIVO`).
-   `StockMovement` centralizes all inventory transactions and breaks down into `StockMovementLine` to support detailed conversions and costs.
-   Integration with media (`MediaGallery/MediaAsset/MediaAttachment`) requires handling reusable galleries, relevant for catalogs and future recipes.

### Class Diagram (Logical View)

-   Services like `TransfersService`, `SalesService` and `CostingService` orchestrate specific operations, while models maintain only state and immutable rules (e.g., `adjust`, `post`, `generateReport`).
-   The Driver pattern for media storage (Local vs Cloudflare R2) allows extension without modifying consumers; documentation should highlight configuration points.
-   Enumerations (`OperatingUnitType`, `InventoryLocationType`) guide frontend/back validations and should be mapped to shared constants.

### Operational Flows

-   Event flow demonstrates complete cycles: event creation, transfer, sales, expenses, and closure with stock return; requires `EVENT_TEMP` state and complete auditing.
-   Normal sale flow links `Sale` with `StockMovement` per line, ensuring cost consistency when decrementing inventory.
-   Movement state machine (`Draft → Posted → Reversed`) emphasizes reversal rules and restrictions by movement type.

### Key Rules to Highlight

-   `on_hand` validation before subtracting stock and use of `meta` for original costs and transactional units.
-   Weighted average cost calculation in `ItemVariant` and persistence of `unit_cost` in movement lines.
-   Minimum assignment of three users per operating unit through `OperatingUnitUser`, aligned with access policies in `security-and-user-system-architecture`.

---

## 📋 Implementation Notes

-   Prioritize documentation update before creating new migrations or endpoints, avoiding divergences with task #006 (product and stock onboarding).
-   Maintain cross-links with `doc/architecture/security-and-user-system-architecture.md` and `doc/architecture/identifiers-hashids.md` for permissions and ID exposure.
-   Document naming and numeric type decisions (`decimal` vs `integer`, precision) so migrations and models follow a uniform standard.
-   Prepare table format appendices to facilitate QA and stakeholder validation (required fields, business rules, external dependencies).

---

## 📦 Impacted Files and Resources

-   `doc/architecture/inventory-architecture.md`
-   `doc/architecture/security-and-user-system-architecture.md`
-   `doc/architecture/identifiers-hashids.md`
-   `code/backend/database/migrations/*` (planning)
-   `code/backend/app/Services/*` (Transfer, Sales, Costing)
-   `code/frontend/src/features/inventory/*`

---

## ⏱️ Time

### 📊 Estimates

-   **Optimistic:** `6h`
-   **Pessimistic:** `12h`
-   **Tracked:** `0h`

### 📅 Sessions

```json
[
    { "date": "2025-11-04", "start": "23:00", "end": "23:59" },
    { "date": "2025-11-05", "start": "00:00", "end": "01:00" },
    { "date": "2025-11-05", "start": "11:00", "end": "14:20" }
]
```
