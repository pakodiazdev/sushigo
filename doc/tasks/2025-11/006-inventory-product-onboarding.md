# 🧺 Task #006: Inventory Onboarding (Productos, Localidades y Existencias)

## 📖 Story
Como responsable de inventario de SushiGo, quiero registrar productos con sus variantes, unidades y existencias actuales en las localidades de cada sucursal, para que el sistema refleje el stock real desde el primer día del piloto.

---

## ✅ Technical Tasks

### Backend
- [ ] 🏗️ Crear migraciones/modelos para `branches`, `operating_units`, `inventory_locations` y `operating_unit_users`, incluyendo seeders iniciales para 1 sucursal y sus inventarios por defecto.
- [ ] 📐 Implementar endpoints CRUD para unidades de medida (`UnitOfMeasure`) y conversiones (`UomConversion`), con validaciones de restricciones (solo `INSUMO` permite múltiples conversiones).
- [ ] 🧾 Exponer endpoint para crear productos (`Item`) y variantes (`ItemVariant`) con asignación opcional de galería (`MediaGallery`) y unidad base.
- [ ] 📦 Desarrollar servicio `OpeningBalanceService` que registre existencias iniciales por localidad usando `StockMovement` con razón `OPENING_BALANCE`, manejando conversiones de entrada → unidad base.
- [ ] 💰 Persistir costo de adquisición por variante (`last_unit_cost`, `avg_unit_cost`) y calcular utilidad esperada al registrar movimientos de salida (precio - costo).
- [ ] 🔄 Generar endpoints para crear localidades (`InventoryLocation`) por inventario de sucursal y asociar usuarios (`OperatingUnitUser`), garantizando al menos tres usuarios activos con acceso.
- [ ] ✅ Agregar pruebas de integración que cubran la creación de un producto con variante, registro de existencias iniciales y verificación de costos/promedios.

### Frontend
- [ ] 🗂️ Construir vista de configuración para sucursales e inventarios que permita crear/editar localidades (nombre, tipo, prioridad).
- [ ] 🧪 Diseñar wizard de alta de producto que cubra: datos del ítem, variantes, selección de unidad base, conversiones opcionales y carga de existencias por localidad (cantidad, unidad de entrada, costo unitario).
- [ ] 📊 Implementar tablero de existencias que muestre el stock actual por localidad y el costo promedio calculado.
- [ ] 🧾 Conectar formularios a los endpoints nuevos, mostrando feedback de validaciones (unidades, conversiones, costos).

### Docs & QA
- [ ] 🧭 Actualizar documentación de API (Swagger) con los nuevos endpoints de productos, unidades y movimientos de apertura.
- [ ] 🧪 Crear pruebas de conversión y cálculo de utilidad en PHPUnit (services/tests unitarios).
- [ ] 👥 Documentar en README/dev notes cómo se configuran los drivers de media (local vs Cloudflare R2) y cómo se inicializan las tres cuentas de usuario requeridas.

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
- Sistema permite iniciar sesión con al menos tres usuarios preconfigurados.
- Se pueden crear sucursales/inventarios, localidades y productos con variantes.
- Se registran existencias iniciales con unidad de entrada variable, se calcula el costo promedio y se visualiza el stock resultante.
