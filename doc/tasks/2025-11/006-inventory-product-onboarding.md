# 🧺 Task #006: Inventory Onboarding (Productos, Localidades y Existencias)

## 📖 Story

Como responsable de inventario de SushiGo, quiero registrar productos con sus variantes, unidades y existencias actuales en las localidades de cada sucursal, para que el sistema refleje el stock real desde el primer día del piloto.

---

## ✅ Technical Tasks

### Backend

-   [x] 🏗️ Crear migraciones/modelos y seeders para `branches`, `operating_units`, `inventory_locations` y `operating_unit_users`, incluyendo seeders iniciales para 1 sucursal y sus inventarios por defecto.
    - ✅ 14 migraciones creadas y ejecutadas
    - ✅ 14 modelos Eloquent con relaciones completas
    - ✅ 5 seeders con datos iniciales (1 branch, 3 units, 4 locations, 8 UOMs, 4 conversions)
-   [x] 📐 Implementar endpoints CRUD para unidades de medida (`UnitOfMeasure`) y conversiones (`UomConversion`), con validaciones de restricciones (solo `INSUMO` permite múltiples conversiones).
    - ✅ FormRequests: CreateUnitOfMeasureRequest, UpdateUnitOfMeasureRequest, ListUnitsOfMeasureRequest, CreateUomConversionRequest
    - ✅ Controllers SAC: List, Create, Show, Update, Delete (UoM) + List, Create, Delete (Conversions)
    - ✅ Response entities: UnitOfMeasureResponse, UomConversionResponse
    - ✅ Rutas registradas en api.php
-   [x] 🧾 Exponer endpoint para crear productos (`Item`) y variantes (`ItemVariant`) con asignación opcional de galería (`MediaGallery`) y unidad base.
    - ✅ FormRequests: CreateItemRequest, UpdateItemRequest, ListItemsRequest, CreateItemVariantRequest, UpdateItemVariantRequest
    - ✅ Controllers SAC Items: List, Create, Show, Update, Delete (5 endpoints)
    - ✅ Controllers SAC ItemVariants: List, Create, Show, Update, Delete (5 endpoints)
    - ✅ Response entities: ItemResponse, ItemVariantResponse
    - ✅ Rutas registradas (públicas para lectura, protegidas para escritura)
    - ✅ Validaciones: SKU único, código único, min/max stock, tipo INSUMO/PRODUCTO/ACTIVO
    - ✅ Protección: no eliminar items con variantes, no eliminar variantes con stock
-   [x] 📦 Desarrollar servicio `OpeningBalanceService` que registre existencias iniciales por localidad usando `StockMovement` con razón `OPENING_BALANCE`, manejando conversiones de entrada → unidad base.
    - ✅ OpeningBalanceService con método registerOpeningBalance()
    - ✅ Conversión automática de UoM entrada → base usando UomConversion
    - ✅ Creación de StockMovement con razón OPENING_BALANCE, estado POSTED
    - ✅ Creación de StockMovementLine con detalles de conversión en meta
    - ✅ Actualización/creación de Stock usando updateOrCreate
    - ✅ Cálculo de costo promedio ponderado (avg_unit_cost)
    - ✅ Actualización de last_unit_cost en ItemVariant
    - ✅ Transacciones DB para integridad de datos
    - ✅ Endpoint POST /api/v1/inventory/opening-balance con RegisterOpeningBalanceRequest
    - ✅ Response completo con datos de movimiento, localidad y variante
-   [ ] 💰 Persistir costo de adquisición por variante (`last_unit_cost`, `avg_unit_cost`) y calcular utilidad esperada al registrar movimientos de salida (precio - costo).
-   [ ] 🔄 Generar endpoints para crear localidades (`InventoryLocation`) por inventario de sucursal y asociar usuarios (`OperatingUnitUser`), garantizando al menos tres usuarios activos con acceso.
-   [ ] ✅ Agregar pruebas de integración que cubran la creación de un producto con variante, registro de existencias iniciales y verificación de costos/promedios.

### Frontend

-   [ ] 🗂️ Construir vista de configuración para sucursales e inventarios que permita crear/editar localidades (nombre, tipo, prioridad).
-   [ ] 🧪 Diseñar wizard de alta de producto que cubra: datos del ítem, variantes, selección de unidad base, conversiones opcionales y carga de existencias por localidad (cantidad, unidad de entrada, costo unitario).
-   [ ] 📊 Implementar tablero de existencias que muestre el stock actual por localidad y el costo promedio calculado.
-   [ ] 🧾 Conectar formularios a los endpoints nuevos, mostrando feedback de validaciones (unidades, conversiones, costos).

### Docs & QA

-   [ ] 🧭 Actualizar documentación de API (Swagger) con los nuevos endpoints de productos, unidades y movimientos de apertura.
-   [ ] 🧪 Crear pruebas de conversión y cálculo de utilidad en PHPUnit (services/tests unitarios).
-   [ ] 👥 Documentar en README/dev notes cómo se configuran los drivers de media (local vs Cloudflare R2) y cómo se inicializan las tres cuentas de usuario requeridas.

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
