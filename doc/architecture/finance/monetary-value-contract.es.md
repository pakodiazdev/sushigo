# Contrato de Valor Monetario

> Implementa [TD-05](../../decisions/td-05-monetary-precision-and-rounding.md) para
> [#415](https://github.com/pakodiazdev/sushigo/issues/415). Este documento es el inventario de
> campos y la división entregado-vs-diferido que TD-05 delega a este Issue. Se actualiza solo con
> comportamiento realmente entregado — ver "Fases de entrega" abajo.

## 1. Las dos primitivas

TD-05 divide cada valor de dominio en dos tipos, respaldados por dos value objects de PHP en
`App\Support\Money` (ambos inmutables, ambos respaldados por `bcmath`, ninguno construido jamás
desde un `float` de PHP):

| Primitiva | Respalda | Escala | Representación |
|---|---|---:|---|
| `Money` | Totales de transacción, precios, impuestos, descuentos, gastos, pagos | 2 | Unidades mínimas enteras (`int $minorUnits`) + `string $currency` |
| `Decimal` | Costo unitario, costo promedio ponderado, cantidades, factores de conversión, tasas, aritmética intermedia | 4 (6 para factores de conversión; ≥8 para intermedios) | String decimal exacto + escala explícita |

Ninguna primitiva tiene un constructor o factory tipado para aceptar `float`. Ambas aceptan
`mixed` en su frontera de parseo y rechazan en tiempo de ejecución cualquier valor que no sea un
`int`/string numérico — no solo mediante una declaración de tipo de PHP — porque la coerción de
tipos escalares en modo débil de PHP trunca silenciosamente un argumento `float` a `int` (con solo
un aviso de deprecación, nunca una excepción) cuando el archivo que llama carece de
`declare(strict_types=1)`, algo que este código base todavía no exige en todas partes. Ver los
docblocks de clase de `Money` y `Decimal`
(`code/api/app/Support/Money/{Money,Decimal}.php`) para el razonamiento completo.

`Money` y `Decimal` nunca son intercambiables — no hay conversión implícita. La única forma
sancionada de derivar un monto `Money` desde una tasa `Decimal` es `Money::multiplyByDecimal()`
(p. ej. aplicar una tasa de impuesto a un total); lo inverso — multiplicar un costo unitario hacia
arriba para reconstruir un total — nunca se hace, según la regla de TD-05 de que "los totales son
evidencia autoritativa".

## 2. Fases de entrega

TD-05 y el propio Alcance de Implementación de #415 piden que la migración ocurra "en fases
acotadas". Esta es la **Fase 1**:

| Fase | Alcance | Estado |
|---|---|---|
| **1** (este PR) | Primitivas `Money`/`Decimal`; montos de línea de Recepción de Compra (`ReceiptLineData`, `ReceiptRequest`, `ReceiptService::createLine()`) — el hallazgo concreto de cruce de frontera que cita #415 | ✅ Entregado |
| 2+ | Saldo Inicial, Salida de Stock, evidencia financiera de Movimiento de Stock más allá de la ruta de Recepción, `WeightedAverageCostCalculator`/`Stock::applyWeightedAverageCost()`, los campos de cantidad+costo compartidos en `InventoryEntryPostingData`/`InventoryEntryLineData`, listas de precios, platillos/extras, caja, nómina, reportes | Issues de seguimiento (ver cierre de #415) |

La Fase 1 deliberadamente **no** toca campos de cantidad (`ordered_packages`,
`received_packages`, `base_units_received`, …) ni el blend de costo promedio ponderado — eso
pertenece al sistema compartido de cantidades de Stock que #575/#579 ya poseen en parte, y ampliar
la Fase 1 para incluirlos significaría tocar `StockMutationService`, `Stock::reserve()/release()`,
`StockOutService` y `StockTransferService` mucho más allá del hallazgo de línea de Recepción que
nombra este Issue. Migrar eso queda registrado como trabajo de seguimiento explícito al cierre, no
dejado sin hacer en silencio.

## 3. Por qué no hay migración de base de datos en la Fase 1

La propia sección "Consecuencias" de TD-05 lo permite: *"Las columnas monetarias existentes de
cuatro decimales pueden permanecer temporalmente durante la migración, pero las escrituras y los
contratos públicos deben converger en la regla Money de dos decimales."* La Fase 1 toma esa opción
porque el cast `decimal:N` de Eloquent en Laravel ya retorna un **string** exacto, nunca un
`float` — verificado empíricamente (`php artisan tinker`: asignar `'123.4567'` a un atributo con
cast `decimal:4` y volver a leerlo retorna el string `'123.4567'`, no un float). El tipo de columna
`NUMERIC` de PostgreSQL ya es almacenamiento exacto de punto fijo. La frontera de float que cita
#415 nunca estuvo en la base de datos ni en la capa de cast de Eloquent — estaba en los DTOs de PHP
(`ReceiptLineData` tipaba sus cuatro campos de monto como `float`) y en la aritmética de PHP plano
que operaba sobre ellos (`ReceiptService::createLine()` restaba/sumaba/dividía floats nativos). La
Fase 1 corrige exactamente eso: el DTO y la aritmética, no el esquema.

El eventual movimiento del esquema hacia columnas explícitas `bigint` de unidades mínimas +
`currency` (la columna de "representación de frontera" de TD-05) queda diferido a una fase
posterior, junto con la decisión abierta de representación de API abajo — ambos son cambios
genuinos de esquema/contrato que merecen su propia migración y revisión de compatibilidad
acotadas, no un subproducto de la corrección de la línea de Recepción.

## 4. Decisión de representación de API (ítem de la checklist de Decisión de Arquitectura)

**Decisión:** la Fase 1 mantiene sin cambios el formato de wire JSON existente.
`ReceiptLineResource` sigue serializando `gross_amount`, `discounts`, `allocated_expenses`,
`non_recoverable_taxes`, `net_acquisition_amount` y `effective_unit_cost` como números JSON
mediante casts `(float)` sobre los valores string del modelo, ya exactos.

**Por qué es seguro:** el cast `(float)` en el Resource ocurre *después* de cada paso sensible a
la exactitud — validación, construcción del DTO, aritmética `Money`/`Decimal` y persistencia — no
antes. Es la frontera de serialización más externa, no una frontera de aritmética de dominio. Un
monto `Money` de 2 decimales viaja de ida y vuelta a través del cast `(float)` de PHP sin deriva
para cualquier valor que este dominio realmente produzca (verificado: el `precision=14` por
defecto de PHP renderiza `(string)(float)'123.45'` de vuelta a `'123.45'`), así que ningún consumidor
existente del webapp ve un cambio de comportamiento.

**Diferido:** cambiar el formato de wire en sí (p. ej. a un string, o a
`{amount_minor, currency}`) es un cambio de contrato de API disruptivo que requiere coordinación
con los clientes en `code/webapp`. Esa decisión — y la estrategia de compatibilidad/versionado para
clientes existentes — se deja abierta para la fase que realmente cambie la forma del wire, no se
decide como efecto secundario de la Fase 1.

## 5. Inventario de campos monetarios

Cada columna tipo `decimal` del esquema al momento de la Fase 1, clasificada contra TD-05. "Fase"
registra cuándo se espera que la aritmética *de la capa PHP* de cada fila adopte
`Money`/`Decimal` — el tipo de columna en sí puede rezagarse según el §3 anterior.

| Tabla.columna | Tipo DB | Tipo TD-05 | Primitiva objetivo | Fase |
|---|---|---|---|---:|
| `receipt_lines.gross_amount` | `decimal(15,4)` | Monto de moneda | `Money` (2) | **1 ✅** |
| `receipt_lines.discounts` | `decimal(15,4)` | Monto de moneda | `Money` (2) | **1 ✅** |
| `receipt_lines.allocated_expenses` | `decimal(15,4)` | Monto de moneda | `Money` (2) | **1 ✅** |
| `receipt_lines.non_recoverable_taxes` | `decimal(15,4)` | Monto de moneda | `Money` (2) | **1 ✅** |
| `receipt_lines.net_acquisition_amount` | `decimal(15,4)` | Total derivado (evidencia autoritativa) | `Money` (2) | **1 ✅** |
| `receipt_lines.effective_unit_cost` | `decimal(15,4)` | Costo unitario (tasa derivada) | `Decimal` (4) | **1 ✅** |
| `receipt_lines.ordered_packages` / `received_packages` / `bonus_packages` / `base_units_received` | `decimal(15,4)` | Cantidad | `Decimal` (4) | 2 (sistema de cantidades de Stock) |
| `receipt_lines.presentation_factor` | `decimal(15,4)` | Factor de conversión | `Decimal` (6) | 2 |
| `stock.weighted_avg_cost` | `decimal(15,4)` | Costo unitario | `Decimal` (4) | 2 |
| `item_variants.last_unit_cost` / `avg_unit_cost` | `decimal(15,4)` | Costo unitario | `Decimal` (4) | 2 |
| `item_variants.sale_price` | `decimal(15,4)` | Monto de moneda | `Money` (2) | 2 (Precios) |
| `item_variants.min_stock` | `decimal(15,4)` | Cantidad (umbral) | `Decimal` (4) | 2 |
| `stock_movement_lines.unit_cost` | `decimal(15,4)` | Costo unitario | `Decimal` (4) | 2 |
| `stock_movement_lines.line_total` / `sale_total` / `profit_total` | `decimal(15,4)` | Monto de moneda | `Money` (2) | 2 |
| `stock_movement_lines.sale_price` | `decimal(15,4)` | Monto de moneda | `Money` (2) | 2 |
| `stock_movement_lines.profit_margin` | `decimal(15,4)` | Tasa/porcentaje | `Decimal` (4) | 2 |
| `stock_transfers.source_unit_cost` | `decimal(15,4)` | Costo unitario | `Decimal` (4) | 2 |
| `variant_prices.price` | `decimal(15,4)` | Monto de moneda | `Money` (2) | 2 (Precios) |
| `supplier_offerings.quoted_price` | `decimal(15,4)` | Monto de moneda | `Money` (2) | 2 (Compras) |
| `dishes.base_price` | `decimal(10,2)` | Monto de moneda | `Money` (2) | 2 (Menú) |
| `dish_extra_options.price_delta` | `decimal(10,2)` | Monto de moneda | `Money` (2) | 2 (Menú) |
| `cash_adjustment_lines.amount` | `decimal(12,4)` | Monto de moneda | `Money` (2) | 2 (Caja) |
| `cash_expenses.amount` | `decimal(12,4)` | Monto de moneda | `Money` (2) | 2 (Caja) |
| `wage_histories.hourly_rate` | `decimal(10,2)` | Monto de moneda (tasa por hora) | `Money` (2) | 2 (Nómina) |
| `wage_histories.weekly_scheduled_hours` | `decimal(5,2)` | Cantidad (horas) | `Decimal` (4) | 2 (Nómina) |
| `negotiated_extra_days.agreed_daily_wage` / `prima_amount` | `decimal(10,4)` | Monto de moneda | `Money` (2) | 2 (Nómina) |
| `punctuality_bonus_groups.weekly_bonus_amount` | `decimal(10,2)` | Monto de moneda | `Money` (2) | 2 (Nómina) |
| `pay_period_employees.total_pay` | `decimal(10,2)` | Monto de moneda | `Money` (2) | 2 (Nómina) |
| `pay_period_lines.amount` | `decimal(10,2)` | Monto de moneda | `Money` (2) | 2 (Nómina) |
| `attendances.overtime_amount` | `decimal(10,2)` | Monto de moneda | `Money` (2) | 2 (Nómina) |
| `overtime_bank_movement_*.amount` | `decimal(10,2)` | Monto de moneda | `Money` (2) | 2 (Nómina) |

Cada fila anterior ya almacena un valor decimal exacto en PostgreSQL y retorna un string exacto a
través del cast `decimal:N` de Laravel (ver §3) — nada de esto es actualmente dato corrupto. Esta
tabla registra dónde la aritmética *de la capa PHP* (no el almacenamiento) todavía arriesga una
frontera de `float` una vez que la capa de servicio/DTO de ese dominio toca estos valores con
operadores de PHP planos, para que una fase futura tenga una checklist lista en vez de
re-derivarla.

## 6. Redondeo

El modo de redondeo final de dinero por defecto es `ROUND_HALF_UP` (redondeo hacia arriba desde el
punto medio, alejándose de cero), coincidiendo con el comportamiento por defecto de `round()` en
PHP y la convención preexistente de este código base (ver `WeightedAverageCostCalculator`, que ya
usaba `round($value, 4)`). `Decimal::of()` y la derivación de unidades mínimas de `Money` implementan
esto manualmente vía `bcmath` (`bcadd(..., '0.5', 0)` tras desplazar a una escala entera, luego
desplazando de vuelta) en lugar de depender de `bcround()` (PHP 8.4+), ya que `composer.json`
todavía declara compatibilidad `"php": "^8.2"`.

## 7. Relacionados

- [TD-05](../../decisions/td-05-monetary-precision-and-rounding.md) — la decisión objetivo que
  implementa este documento.
- `code/api/app/Support/Money/Money.php`, `Decimal.php` — las primitivas.
- `code/api/tests/Unit/Support/Money/` — pruebas unitarias de las primitivas (redondeo de
  fracciones de centavo, valores grandes, cero, negativos, blends repetidos, rechazo de floats).
- `doc/architecture/purchasing/purchase-receipts.en.md` — el dominio de Recepción que toca esta
  fase.
