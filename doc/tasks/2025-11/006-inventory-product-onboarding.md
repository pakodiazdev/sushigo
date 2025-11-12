# 🧺 Task #006: Inventory Onboarding (Productos, Localidades y Existencias)

## 📖 Story

Como responsable de inventario de SushiGo, quiero registrar productos con sus variantes, unidades y existencias actuales en las localidades de cada sucursal, para que el sistema refleje el stock real desde el primer día del piloto.

---

## ✅ Technical Tasks

### Backend

-   [x] 🏗️ Crear migraciones/modelos y seeders para `branches`, `operating_units`, `inventory_locations` y `operating_unit_users`, incluyendo seeders iniciales para 1 sucursal y sus inventarios por defecto.
    -   ✅ 14 migraciones creadas y ejecutadas
    -   ✅ 14 modelos Eloquent con relaciones completas
    -   ✅ 5 seeders con datos iniciales (1 branch, 3 units, 4 locations, 8 UOMs, 4 conversions)
-   [x] 📐 Implementar endpoints CRUD para unidades de medida (`UnitOfMeasure`) y conversiones (`UomConversion`), con validaciones de restricciones (solo `INSUMO` permite múltiples conversiones).
    -   ✅ FormRequests: CreateUnitOfMeasureRequest, UpdateUnitOfMeasureRequest, ListUnitsOfMeasureRequest, CreateUomConversionRequest
    -   ✅ Controllers SAC: List, Create, Show, Update, Delete (UoM) + List, Create, Delete (Conversions)
    -   ✅ Response entities: UnitOfMeasureResponse, UomConversionResponse
    -   ✅ Rutas registradas en api.php
-   [x] 🧾 Exponer endpoint para crear productos (`Item`) y variantes (`ItemVariant`) con asignación opcional de galería (`MediaGallery`) y unidad base.
    -   ✅ FormRequests: CreateItemRequest, UpdateItemRequest, ListItemsRequest, CreateItemVariantRequest, UpdateItemVariantRequest
    -   ✅ Controllers SAC Items: List, Create, Show, Update, Delete (5 endpoints)
    -   ✅ Controllers SAC ItemVariants: List, Create, Show, Update, Delete (5 endpoints)
    -   ✅ Response entities: ItemResponse, ItemVariantResponse
    -   ✅ Rutas registradas (públicas para lectura, protegidas para escritura)
    -   ✅ Validaciones: SKU único, código único, min/max stock, tipo INSUMO/PRODUCTO/ACTIVO
    -   ✅ Protección: no eliminar items con variantes, no eliminar variantes con stock
-   [x] 📦 Desarrollar servicio `OpeningBalanceService` que registre existencias iniciales por localidad usando `StockMovement` con razón `OPENING_BALANCE`, manejando conversiones de entrada → unidad base.
    -   ✅ OpeningBalanceService con método registerOpeningBalance()
    -   ✅ Conversión automática de UoM entrada → base usando UomConversion
    -   ✅ Creación de StockMovement con razón OPENING_BALANCE, estado POSTED
    -   ✅ Creación de StockMovementLine con detalles de conversión en meta
    -   ✅ Actualización/creación de Stock usando updateOrCreate
    -   ✅ Cálculo de costo promedio ponderado (avg_unit_cost)
    -   ✅ Actualización de last_unit_cost en ItemVariant
    -   ✅ Transacciones DB para integridad de datos
    -   ✅ Endpoint POST /api/v1/inventory/opening-balance con RegisterOpeningBalanceRequest
    -   ✅ Response completo con datos de movimiento, localidad y variante
-   [x] 📊 Implementar endpoints de consulta de stock para visualizar existencias actuales por localidad y variante.
    -   ✅ Controllers SAC Stock: ListStockController, StockByLocationController, StockByVariantController (3 endpoints)
    -   ✅ FormRequest: ListStockRequest con filtros (location_id, variant_id, min_on_hand)
    -   ✅ GET /api/v1/stock - Lista paginada de stock con filtros opcionales
    -   ✅ GET /api/v1/stock/by-location/{id} - Sumario de stock por localidad (total_inventory_value, total_on_hand, etc.)
    -   ✅ GET /api/v1/stock/by-variant/{id} - Sumario de stock por variante en todas las localidades
    -   ✅ Cálculos: total_inventory_value = on_hand \* weighted_avg_cost, total_available = on_hand - reserved
    -   ✅ Response structures con datos completos de localidad, variante, item y UoM
-   [x] 💰 Persistir costo de adquisición por variante (`last_unit_cost`, `avg_unit_cost`) y calcular utilidad esperada al registrar movimientos de salida (precio - costo).
    -   ✅ Migración add_pricing_fields_to_stock_movement_lines: sale_price, sale_total, profit_margin, profit_total
    -   ✅ StockOutService para movimientos SALE y CONSUMPTION con cálculo de utilidad
    -   ✅ Validación de stock disponible antes de salida (on_hand - reserved)
    -   ✅ Cálculo automático: profit_margin = sale_price - unit_cost (usando avg_unit_cost de variante)
    -   ✅ Cálculo automático: profit_total = base_qty \* profit_margin
    -   ✅ Manejo de conversiones UoM para precios (convierte sale_price a base UoM para cálculo)
    -   ✅ Soporte para ventas con pérdida (profit negativo) y ventas a costo (profit 0)
    -   ✅ RegisterStockOutRequest con validaciones (reason: SALE|CONSUMPTION, qty > 0, sale_price opcional)
    -   ✅ RegisterStockOutController (SAC) con endpoint POST /api/v1/inventory/stock-out
    -   ✅ StockOutTest: 10/10 tests passing (68 assertions)
    -   ✅ Tests cubren: venta con utilidad, consumo sin precio, stock insuficiente, conversión UoM, profit_margin correcto, ventas a pérdida
-   [x] 🔄 Generar endpoints para crear localidades (`InventoryLocation`) por inventario de sucursal y asociar usuarios (`OperatingUnitUser`), garantizando al menos tres usuarios activos con acceso.
    -   ✅ Controllers SAC InventoryLocation: List, Create, Show, Update, Delete (5 endpoints)
    -   ✅ FormRequests: ListInventoryLocationsRequest, CreateInventoryLocationRequest, UpdateInventoryLocationRequest
    -   ✅ Response entity: InventoryLocationResponse con stock_summary
    -   ✅ Protección: no eliminar localidades con stock on_hand > 0
    -   ✅ Controllers SAC OperatingUnitUser: ListOperatingUnitUsers, AddUserToOperatingUnit, RemoveUserFromOperatingUnit (3 endpoints)
    -   ✅ FormRequests: ListOperatingUnitUsersRequest, AddUserToOperatingUnitRequest
    -   ✅ Validación: prevenir asignaciones duplicadas, requerir assignment_role (OWNER/MANAGER/CASHIER/INVENTORY/AUDITOR)
    -   ✅ UserSeeder actualizado: 3 usuarios (superadmin, admin, inventory) con 8 asignaciones a operating units
    -   ✅ Rutas registradas: 5 rutas inventory-locations + 3 rutas operating-units/{id}/users
-   [x] ✅ Agregar pruebas de integración que cubran la creación de un producto con variante, registro de existencias iniciales y verificación de costos/promedios.
    -   ✅ OpeningBalanceTest: 11/11 tests passing (creación producto, variante, registro existencias, cálculo costos)
    -   ✅ StockQueryTest: 9/10 tests passing (consultas de stock, filtros, sumarios por localidad y variante)
    -   ✅ Validación completa de conversiones UoM, cálculo de avg_unit_cost, actualización de last_unit_cost

### Frontend

-   [ ] 🗂️ Construir vista de configuración para sucursales e inventarios que permita crear/editar localidades (nombre, tipo, prioridad).
-   [ ] 🧪 Diseñar wizard de alta de producto que cubra: datos del ítem, variantes, selección de unidad base, conversiones opcionales y carga de existencias por localidad (cantidad, unidad de entrada, costo unitario).
-   [ ] 📊 Implementar tablero de existencias que muestre el stock actual por localidad y el costo promedio calculado.
-   [ ] 🧾 Conectar formularios a los endpoints nuevos, mostrando feedback de validaciones (unidades, conversiones, costos).

### Docs & QA

-   [x] 🧭 Actualizar documentación de API (Swagger) con los nuevos endpoints de productos, unidades y movimientos de apertura.
    -   ✅ OpenAPI annotations completas en todos los FormRequests y Controllers
    -   ✅ Generación exitosa con `php artisan l5-swagger:generate`
    -   ✅ Archivo api-docs.json con todos los endpoints documentados
    -   ✅ Endpoints de stock query incluidos: GET /stock, GET /stock/by-location/{id}, GET /stock/by-variant/{id}
-   [x] 🧪 Crear pruebas de conversión y cálculo de utilidad en PHPUnit (services/tests unitarios).
    -   ✅ OpeningBalanceTest: 11 tests validando conversiones UoM y cálculos de costos
    -   ✅ StockQueryTest: 10 tests validando consultas de stock y sumarios
    -   ✅ Total: 26 tests nuevos con 115+ assertions
-   [x] 👥 Documentar en README/dev notes cómo se configuran los drivers de media (local vs Cloudflare R2) y cómo se inicializan las tres cuentas de usuario requeridas.
    -   ✅ TESTING.md actualizado con tabla de credenciales de usuarios
    -   ✅ 3 usuarios configurados: superadmin@example.com, admin@example.com, inventory@example.com
    -   ✅ Seeders documentados con asignaciones a operating units

---

## 📋 Implementation Notes

1. **Unidades variables**

    - `ItemVariant` siempre trabaja en una unidad base.
    - `OpeningBalanceService` recibe la unidad transaccional y usa `UomConversion` para convertir a base.
    - Para salidas (ventas/consumos), los movimientos usarán la unidad solicitada y guardarán tanto la cantidad original como la convertida.

2. **Costeo y utilidad**

    - Registrar `unit_cost` en `StockMovementLine` para movimientos de entrada.
    - Mantener en `ItemVariant` el costo promedio ponderado (`avg_unit_cost`).
    - Al simular ventas, utilidad = `sale_price` - `avg_unit_cost`.

3. **Usuarios mínimos**

    - Seeder debe garantizar 3 usuarios (`super-admin`, `admin`, `inventory-manager` por ejemplo) con acceso a la sucursal inicial.
    - Asociar usuarios a `OperatingUnitUser` para tener permisos sobre inventarios/localidades.

4. **Drivers de media**

    - En desarrollo usar driver local; producción usará Cloudflare R2 vía `MediaStorageService`.
    - Configurar `.env` para elegir driver y credenciales sin modificar código de dominio.

5. **Out of scope**
    - No se implementan bajas/eliminaciones de productos ni ajustes negativos en este sprint.
    - No se cubren aún flujos completos de ventas o producción; solo alta y existencias iniciales.

---

## 🚀 Deliverable de valor

-   Sistema permite iniciar sesión con al menos tres usuarios preconfigurados.
-   Se pueden crear sucursales/inventarios, localidades y productos con variantes.
-   Se registran existencias iniciales con unidad de entrada variable, se calcula el costo promedio y se visualiza el stock resultante.
