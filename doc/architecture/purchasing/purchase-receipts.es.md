# Recepciones de compra

El Issue `#432` es la autoridad del costo de adquisición a la que las Ofertas de Proveedores
(`#431`) explícitamente remiten. Una Recepción registra la transacción comercial real —
proveedor, presentación, piezas pagadas/recibidas/bonificadas, descuentos, gastos asignados,
impuestos no recuperables— y su registro (posting) es la única vía que modifica el costo promedio
ponderado de Stock para una compra.

## Modelo

```text
Supplier 1 ── * Receipt 1 ── * ReceiptLine * ── 1 VariantPurchasePresentation
```

- `Receipt` (encabezado): ULID público, `supplier`, `destination_location`, `reference`,
  `receipt_date`, `notes`, y un ciclo de vida `DRAFT → POSTED → REVERSED` (`status` más
  `posted_at`/`posted_by_user_id` y `reversed_at`/`reversed_by_user_id`/`reversal_reason`).
- `ReceiptLine`: captura todo lo necesario para reproducir el costo, de forma inmutable una vez
  registrada — `presentation_factor` (el `base_unit_quantity` de la Plantilla de Presentación de
  Compra al momento de crear la línea, independiente de cambios posteriores a la plantilla),
  `ordered_packages`, `received_packages` (total de paquetes físicos recibidos, las bonificaciones
  ya incluidas), `bonus_packages` (el subconjunto gratuito de `received_packages`), `gross_amount`,
  `discounts`, `allocated_expenses`, `non_recoverable_taxes`, y los dos campos calculados y
  almacenados `net_acquisition_amount` y `base_units_received`/`effective_unit_cost`.

## Cálculo de costo

```text
net_acquisition_amount = gross_amount − discounts + allocated_expenses + non_recoverable_taxes
base_units_received    = received_packages × presentation_factor
effective_unit_cost    = net_acquisition_amount / base_units_received
```

`gross_amount` cubre únicamente la porción *pagada* de `received_packages` — las piezas
bonificadas se reciben físicamente (incrementan `base_units_received`) pero nunca se suman a
`net_acquisition_amount`. Esa asimetría es lo que hace que las bonificaciones reduzcan el
`effective_unit_cost` sin tocar `presentation_factor`. Estos campos se calculan una sola vez,
mientras la Recepción es borrador, y nunca se recalculan después de registrarse — los valores
almacenados **son** la evidencia de auditoría.

## Registro (posting)

Registrar una Recepción (`ReceiptService::postReceipt`) es atómico por línea: bloquea la fila del
encabezado de la Recepción durante toda la transacción (cerrando el mismo hueco de registro
duplicado/concurrente que el `#430` cerró para Stock), luego para cada línea invoca el
`StockMutationService::receiveInto()` existente —el mismo patrón de bloqueo/recuperación de
condición de carrera que introdujo `#430` para Stock— y escribe evidencia inmutable de
`StockMovement`/`StockMovementLine` (`reason: PURCHASE_RECEIPT`, vinculada a la Recepción mediante
`related_id`/`related_type`). Revertir una Recepción registrada (`reverseReceipt`) disminuye Stock
en las mismas unidades base mediante el propio `decreaseOnHand()` protegido de Stock; si el consumo
ya redujo el disponible por debajo de lo que aportó la recepción, la reversión se rechaza
(`ReceiptReversalBoundaryException`) en vez de dejar Stock en negativo.

El costo de adquisición se registra en `Stock.weighted_avg_cost`, nunca en `ItemVariant` — el Issue
es explícito en que el costo "no debe capturarse en Producto o Variante". El `#434` unificó esto:
`OpeningBalanceService` ahora también combina el costo en el mismo `Stock.weighted_avg_cost` por
ubicación (mediante `Stock::applyWeightedAverageCost()` y el `WeightedAverageCostCalculator`
compartido) en vez de escribir `ItemVariant.avg_unit_cost` — ver `inventory-architecture.es.md`
§ "Costo promedio ponderado" para la unificación completa.

## API y autorización

Los endpoints autenticados viven bajo `/api/v1/inventory/receipts`, más los endpoints de acción
`{receipt}/post` y `{receipt}/reverse`. Los únicos identificadores externos son ULID públicos.

- `receipts.view`: listar/ver Recepciones.
- `receipts.manage`: crear/actualizar/eliminar un borrador, registrar y revertir.

Editar o eliminar solo se permite mientras la Recepción sigue en borrador; registrar/revertir una
Recepción que no está en el estado esperado responde `409`, nunca un no-op silencioso.
