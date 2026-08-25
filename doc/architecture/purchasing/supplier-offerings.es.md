# Ofertas de proveedores

El Issue `#431` introduce el límite del catálogo de compras que consumirán las Recepciones de
Compra. Registra quién puede surtir una Presentación de Compra de una Variante y bajo qué términos
comerciales de referencia. No registra inventario, evidencia contable ni costo de adquisición
autoritativo.

## Modelo

```text
Supplier 1 ── * SupplierOffering * ── 1 VariantPurchasePresentation
```

- `Supplier` posee ULID público, código único normalizado, datos de contacto y estado activo.
- `SupplierOffering` posee ULID público, código del proveedor, cotización/moneda de referencia,
  vigencia, cantidad mínima, días de entrega y estado activo.
- Un proveedor tiene como máximo una oferta vigente por Presentación. Proveedores distintos pueden
  cotizar términos distintos para la misma Presentación.
- Ambos registros usan borrado lógico. El retiro operativo normal usa `is_active=false` para
  conservar referencias del futuro historial de recepciones.

## Límite de costo

`quoted_price` es información de referencia del catálogo del proveedor. Puede informar o precargar
un flujo futuro de recepción, pero nunca debe modificar el costo de la Variante, el costo promedio
ponderado de Stock ni registros financieros. La Recepción de Compra (`#432`) captura el precio,
promoción, gastos y moneda reales; esa evidencia inmutable es la autoridad del costo de adquisición.

## API y autorización

Los endpoints autenticados viven bajo `/api/v1/inventory/suppliers`. Las ofertas están anidadas en
`/{supplier}/offerings`; el binding de ruta acotado impide acceder a una Oferta mediante otro
Proveedor. Los únicos identificadores externos son ULID públicos.

- `suppliers.view`: listar/ver Proveedores y Ofertas.
- `suppliers.manage`: crear, actualizar, desactivar y borrar lógicamente Proveedores y Ofertas.

La página `/inventario/proveedores` conserva este límite y guía Producto → Variante → Presentación de
Compra al registrar una Oferta.
